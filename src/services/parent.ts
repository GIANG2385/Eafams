import { accountOf, balanceOf, noAccountReason } from '../domain/ea';
import type { NoAccountReason } from '../domain/ea';
import { canParentAccess } from '../domain/permissions';
import { schoolIdOfStudent } from '../domain/structure';
import type { AccountStatus, Cents, Charge, Citizenship, Db, GatewayOutcome, IsoDate, LedgerEntry, LedgerType, Payment, Guardian, ProfileChange } from '../domain/types';
import { applyProfileUpdate } from '../domain/profile';
import type { ProfileErrors, ProfileInput } from '../domain/profile';
import { applyGatewayOutcome, eaPaymentEligibility, payWithEa, startOnlinePayment } from '../domain/payment';
import type { EaEligibility, PayError, PayInput } from '../domain/payment';
import { getDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

export const PAGE_SIZE = 20;
export type TxnType = 'ALL' | 'CREDIT' | 'FEE_PAYMENT' | 'CPF_TRANSFER';

export interface ChildSummary {
  personId: string;
  name: string;
  dob: string | null;
  citizenship: Citizenship | null;
  schoolName: string;
  className: string;
  account: { id: string; status: AccountStatus; openedOn: IsoDate; closedOn: IsoDate | null; balanceCents: Cents } | null;
  noAccountReason: NoAccountReason | null;
}

/** R-ACC-1: every parent-facing read goes through this check. */
export function assertParentAccess(db: Db, guardianId: string, personId: string): void {
  if (!canParentAccess(db, guardianId, personId)) {
    throw new ServiceError('FORBIDDEN', 'You do not have access to this student’s records.');
  }
}

function summarise(db: Db, personId: string): ChildSummary {
  const s = db.students.find((x) => x.personId === personId)!;
  const acc = accountOf(db, personId);
  const cls = db.classes.find((c) => c.id === s.classId);
  const school = db.schools.find((x) => x.id === schoolIdOfStudent(db, personId));
  return {
    personId,
    name: s.name,
    dob: s.dob,
    citizenship: s.citizenship,
    schoolName: school?.name ?? '—',
    className: cls?.name ?? '—',
    account: acc
      ? { id: acc.id, status: acc.status, openedOn: acc.openedOn, closedOn: acc.closedOn, balanceCents: balanceOf(db, acc.id) }
      : null,
    noAccountReason: acc ? null : noAccountReason(s, db.settings.today),
  };
}

export function listChildren(guardianId: string): Promise<ChildSummary[]> {
  return call(() => {
    const db = getDb();
    return db.links
      .filter((l) => l.guardianId === guardianId && db.students.some((s) => s.personId === l.personId))
      .map((l) => summarise(db, l.personId));
  });
}

export function getChild(guardianId: string, personId: string): Promise<ChildSummary> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, personId);
    if (!db.students.some((s) => s.personId === personId)) throw new ServiceError('FORBIDDEN', 'Student not found');
    return summarise(db, personId);
  });
}

const TYPE_MAP: Record<Exclude<TxnType, 'ALL'>, LedgerType[]> = {
  CREDIT: ['TOPUP_SEED', 'DEMO_FUNDS'],
  FEE_PAYMENT: ['FEE_DEBIT'],
  CPF_TRANSFER: ['CPF_TRANSFER'],
};
const seqOf = (id: string) => Number(id.split('-')[1]) || 0;

export function listTransactions(
  guardianId: string,
  personId: string,
  q: { page?: number; from?: IsoDate; to?: IsoDate; type?: TxnType } = {},
): Promise<{ rows: LedgerEntry[]; total: number; page: number; pages: number }> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, personId);
    const acc = accountOf(db, personId);
    let rows = acc ? db.ledger.filter((l) => l.accountId === acc.id) : [];
    if (q.from) rows = rows.filter((r) => r.postedAt >= q.from!);
    if (q.to) rows = rows.filter((r) => r.postedAt <= q.to!);
    if (q.type && q.type !== 'ALL') rows = rows.filter((r) => TYPE_MAP[q.type as Exclude<TxnType, 'ALL'>].includes(r.type));
    rows = [...rows].sort((a, b) => (a.postedAt === b.postedAt ? seqOf(b.id) - seqOf(a.id) : a.postedAt < b.postedAt ? 1 : -1));
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const page = Math.min(Math.max(1, q.page ?? 1), pages);
    return { rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: rows.length, page, pages };
  });
}

export function listCharges(
  guardianId: string,
  personId: string,
): Promise<{
  outstanding: Charge[];
  pending: Charge[];
  paid: Charge[];
  pendingPayments: Record<string, string>;
  balanceCents: Cents | null;
  accountStatus: AccountStatus | null;
}> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, personId);
    const mine = db.charges.filter((c) => c.personId === personId);
    const acc = accountOf(db, personId);
    return {
      outstanding: mine.filter((c) => c.status === 'OUTSTANDING'),
      pending: mine.filter((c) => c.status === 'PENDING_PAYMENT'),
      paid: mine.filter((c) => c.status === 'PAID'),
      pendingPayments: Object.fromEntries(
        db.payments
          .filter((p) => p.personId === personId && p.status === 'PENDING')
          .flatMap((p) => p.chargeIds.map((id) => [id, p.id] as const)),
      ),
      balanceCents: acc ? balanceOf(db, acc.id) : null,
      accountStatus: acc ? acc.status : null,
    };
  });
}

const PAY_MESSAGES: Record<PayError, string> = {
  EMPTY_SELECTION: 'Select at least one fee to pay.',
  CHARGE_NOT_PAYABLE: 'One or more selected fees can no longer be paid. Please review your list and try again.',
  NO_ACCOUNT: 'This student has no Education Account.',
  ACCOUNT_CLOSED: 'This Education Account is closed.',
  INSUFFICIENT_BALANCE: 'The Education Account balance is not enough for this payment. You can pay online instead.',
};

function payError(e: PayError): ServiceError {
  return new ServiceError(e === 'EMPTY_SELECTION' ? 'VALIDATION' : 'CONFLICT', PAY_MESSAGES[e]);
}

export interface CheckoutInfo {
  charges: Charge[];
  totalCents: Cents;
  eligibility: EaEligibility;
  balanceCents: Cents | null;
}

export function getCheckout(guardianId: string, personId: string, chargeIds: string[]): Promise<CheckoutInfo> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, personId);
    const ids = Array.from(new Set(chargeIds));
    if (ids.length === 0) throw new ServiceError('VALIDATION', PAY_MESSAGES.EMPTY_SELECTION);
    const charges = ids.map((id) => db.charges.find((c) => c.id === id));
    if (charges.some((c) => !c || c.personId !== personId || c.status !== 'OUTSTANDING')) {
      throw new ServiceError('CONFLICT', PAY_MESSAGES.CHARGE_NOT_PAYABLE);
    }
    const list = charges as Charge[];
    const totalCents = list.reduce((s, c) => s + c.totalCents, 0);
    const acc = accountOf(db, personId);
    return {
      charges: list,
      totalCents,
      eligibility: eaPaymentEligibility(db, personId, totalCents),
      balanceCents: acc ? balanceOf(db, acc.id) : null,
    };
  });
}

export function payByEa(guardianId: string, input: PayInput): Promise<Payment> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, input.personId);
    const out = payWithEa(db, input, db.settings.today);
    if (!out.result.ok) throw payError(out.result.error);
    if (out.db !== db) setDb(out.db);
    return out.result.payment;
  });
}

export function startOnline(guardianId: string, input: PayInput): Promise<Payment> {
  return call(() => {
    const db = getDb();
    assertParentAccess(db, guardianId, input.personId);
    const out = startOnlinePayment(db, input, db.settings.today);
    if (!out.result.ok) throw payError(out.result.error);
    if (out.db !== db) setDb(out.db);
    return out.result.payment;
  });
}

export interface PaymentView {
  payment: Payment;
  charges: Charge[];
  childName: string;
}

function findPayment(db: Db, guardianId: string, paymentId: string): Payment {
  const p = db.payments.find((x) => x.id === paymentId);
  // Same answer for "missing" and "not yours" so ids cannot be probed.
  if (!p) throw new ServiceError('FORBIDDEN', 'You do not have access to this payment.');
  assertParentAccess(db, guardianId, p.personId);
  return p;
}

export function getPayment(guardianId: string, paymentId: string): Promise<PaymentView> {
  return call(() => {
    const db = getDb();
    const payment = findPayment(db, guardianId, paymentId);
    return {
      payment,
      charges: payment.chargeIds.map((id) => db.charges.find((c) => c.id === id)).filter((c): c is Charge => !!c),
      childName: db.students.find((s) => s.personId === payment.personId)?.name ?? '',
    };
  });
}

const RANDOM_OUTCOMES: GatewayOutcome[] = ['SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMEOUT'];

/** Payment gateway (sandbox): resolves the outcome from the demo setting or the user's choice. */
export function completeGateway(guardianId: string, paymentId: string, chosen?: GatewayOutcome): Promise<Payment> {
  return call(() => {
    const db = getDb();
    const payment = findPayment(db, guardianId, paymentId);
    if (payment.status !== 'PENDING') return payment;
    const mode = db.settings.gatewayMode;
    let outcome: GatewayOutcome;
    if (mode === 'ASK') {
      if (!chosen) throw new ServiceError('VALIDATION', 'Choose a result for the sandbox payment.');
      outcome = chosen;
    } else if (mode === 'RANDOM') {
      outcome = RANDOM_OUTCOMES[Math.floor(Math.random() * RANDOM_OUTCOMES.length)];
    } else {
      outcome = mode;
    }
    if (outcome === 'TIMEOUT') return payment; // stays PENDING until reconciled
    const out = applyGatewayOutcome(db, paymentId, outcome);
    if (out.db !== db) setDb(out.db);
    return out.result.ok ? out.result.payment : payment;
  });
}

/** R-PAY-6: reconciliation after a timeout; never collects twice. */
export function checkPaymentStatus(guardianId: string, paymentId: string): Promise<Payment> {
  return call(() => {
    const db = getDb();
    const payment = findPayment(db, guardianId, paymentId);
    if (payment.status !== 'PENDING') return payment;
    const res = db.settings.timeoutResolution;
    if (res === 'STILL_PENDING') return payment;
    const out = applyGatewayOutcome(db, paymentId, res === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED');
    if (out.db !== db) setDb(out.db);
    return out.result.ok ? out.result.payment : payment;
  });
}

function guardianOf(db: Db, guardianId: string): Guardian {
  const g = db.guardians.find((x) => x.id === guardianId);
  if (!g) throw new ServiceError('NOT_FOUND', 'Profile not found. Please sign in again.');
  return g;
}

export function getProfile(guardianId: string): Promise<Guardian> {
  return call(() => guardianOf(getDb(), guardianId));
}

export function updateProfile(
  guardianId: string,
  patch: ProfileInput,
): Promise<{ ok: boolean; errors: ProfileErrors; changed: string[] }> {
  return call(() => {
    const db = getDb();
    guardianOf(db, guardianId);
    const out = applyProfileUpdate(db, guardianId, patch, db.settings.today);
    if (out.ok && out.db !== db) setDb(out.db);
    return { ok: out.ok, errors: out.errors, changed: out.changed };
  });
}

export function listProfileChanges(guardianId: string): Promise<ProfileChange[]> {
  return call(() => {
    const db = getDb();
    guardianOf(db, guardianId);
    const seq = (id: string) => Number(id.split('-')[1]) || 0;
    return db.profileChanges.filter((c) => c.guardianId === guardianId).sort((a, b) => seq(b.id) - seq(a.id));
  });
}
