import { completedYears, isValidIso } from './date';
import { nextId } from './ids';
import type { Cents, Db, EducationAccount, IsoDate, JobResult, JobRun, Student } from './types';

export type SkipReason = 'MISSING_DATA' | 'ALREADY_HAS_ACCOUNT' | 'NOT_CITIZEN' | 'UNDER_7' | 'AT_OR_OVER_16';
export type Eligibility = { eligible: true } | { eligible: false; reason: SkipReason };
export type NoAccountReason = SkipReason | 'NOT_YET_CREATED';

const CITIZENSHIPS = ['SC', 'PR', 'FOREIGN'];

/** R-EA-1..3: citizen AND 7 <= age < 16 AND no account yet; bad data is an exception, never a crash. */
export function assessEaEligibility(student: Student, hasAccount: boolean, asOf: IsoDate): Eligibility {
  const dob = student.dob;
  if (!student.personId || !isValidIso(dob) || !student.citizenship || !CITIZENSHIPS.includes(student.citizenship)) {
    return { eligible: false, reason: 'MISSING_DATA' };
  }
  if (hasAccount) return { eligible: false, reason: 'ALREADY_HAS_ACCOUNT' };
  if (student.citizenship !== 'SC') return { eligible: false, reason: 'NOT_CITIZEN' };
  const age = completedYears(dob, asOf);
  if (age < 7) return { eligible: false, reason: 'UNDER_7' };
  if (age >= 16) return { eligible: false, reason: 'AT_OR_OVER_16' };
  return { eligible: true };
}

export function accountOf(db: Db, personId: string): EducationAccount | undefined {
  return db.accounts.find((a) => a.personId === personId);
}

export function balanceOf(db: Db, accountId: string): Cents {
  return db.ledger.filter((l) => l.accountId === accountId).reduce((s, l) => s + l.amountCents, 0);
}

export function noAccountReason(student: Student, asOf: IsoDate): NoAccountReason {
  const v = assessEaEligibility(student, false, asOf);
  return v.eligible ? 'NOT_YET_CREATED' : v.reason;
}

export function runEaCreation(db: Db, asOf: IsoDate): { db: Db; run: JobRun } {
  let cur = db;
  const results: JobResult[] = [];
  for (const s of db.students) {
    const has = cur.accounts.some((a) => a.personId === s.personId);
    const verdict = assessEaEligibility(s, has, asOf);
    if (verdict.eligible) {
      const idr = nextId(cur, 'ea');
      cur = {
        ...idr.db,
        accounts: [
          ...idr.db.accounts,
          { id: idr.id, personId: s.personId, status: 'ACTIVE', openedOn: asOf, closedOn: null },
        ],
      };
      results.push({ personId: s.personId, label: s.name, outcome: 'CREATED' });
    } else {
      results.push({ personId: s.personId, label: s.name, outcome: 'SKIPPED', reason: verdict.reason });
    }
  }
  const r = nextId(cur, 'run');
  const run: JobRun = { id: r.id, kind: 'EA_CREATE', asOf, results };
  return { db: { ...r.db, runs: [...r.db.runs, run] }, run };
}

export type ClosureOutcome = 'CLOSED' | 'BLOCKED_PENDING' | 'TRANSFER_FAILED';

/** R-EA-6: a pending payment or a charge awaiting payment confirmation blocks closure. */
export function hasPendingTransactions(db: Db, personId: string): boolean {
  return (
    db.payments.some((p) => p.personId === personId && p.status === 'PENDING') ||
    db.charges.some((c) => c.personId === personId && c.status === 'PENDING_PAYMENT')
  );
}

/**
 * R-EA-6/7/8: close ACTIVE accounts of students aged >= 16. Balance moves to CPF (simulated)
 * and the status flips in one step; any failure leaves ledger and status untouched.
 */
export function runEaClosure(db: Db, asOf: IsoDate, cpf: 'OK' | 'FAIL'): { db: Db; run: JobRun } {
  let cur = db;
  const results: JobResult[] = [];
  for (const acc of db.accounts) {
    if (acc.status !== 'ACTIVE') continue;
    const student = cur.students.find((s) => s.personId === acc.personId);
    if (!student) continue;
    const dob = student.dob;
    if (!isValidIso(dob)) {
      results.push({ personId: acc.personId, label: student.name, outcome: 'SKIPPED', reason: 'MISSING_DATA' });
      continue;
    }
    if (completedYears(dob, asOf) < 16) continue;
    if (hasPendingTransactions(cur, acc.personId)) {
      results.push({ personId: acc.personId, label: student.name, outcome: 'BLOCKED_PENDING', reason: 'PENDING_TRANSACTION' });
      continue;
    }
    const balance = balanceOf(cur, acc.id);
    const t = nextId(cur, 'cpf');
    cur = t.db;
    const ref = `CPF-${t.id.split('-')[1].padStart(6, '0')}`;
    if (cpf === 'FAIL') {
      cur = {
        ...cur,
        cpfTransfers: [
          ...cur.cpfTransfers,
          { id: t.id, accountId: acc.id, amountCents: balance, status: 'FAILED', ref, at: asOf },
        ],
      };
      results.push({ personId: acc.personId, label: student.name, outcome: 'TRANSFER_FAILED', amountCents: balance });
      continue;
    }
    let ledger = cur.ledger;
    if (balance > 0) {
      const l = nextId(cur, 'led');
      cur = l.db;
      ledger = [
        ...cur.ledger,
        { id: l.id, accountId: acc.id, type: 'CPF_TRANSFER', amountCents: -balance, postedAt: asOf, ref, idempotencyKey: `cpf-${acc.id}` },
      ];
    }
    cur = {
      ...cur,
      ledger,
      cpfTransfers: [
        ...cur.cpfTransfers,
        { id: t.id, accountId: acc.id, amountCents: balance, status: 'SUCCEEDED', ref, at: asOf },
      ],
      accounts: cur.accounts.map((a) => (a.id === acc.id ? { ...a, status: 'CLOSED', closedOn: asOf } : a)),
    };
    results.push({ personId: acc.personId, label: student.name, outcome: 'CLOSED', amountCents: balance });
  }
  const r = nextId(cur, 'run');
  const run: JobRun = { id: r.id, kind: 'EA_CLOSE', asOf, results };
  return { db: { ...r.db, runs: [...r.db.runs, run] }, run };
}
