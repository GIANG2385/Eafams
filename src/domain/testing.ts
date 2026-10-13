import { emptyDb } from './emptyDb';
import { nextId } from './ids';
import type { AccountStatus, Cents, Db, FeeComponent, Student } from './types';

export function mkStudent(p: Partial<Student> = {}): Student {
  return {
    personId: 'p-1',
    name: 'Test Student',
    dob: '2019-01-01',
    citizenship: 'SC',
    address: '1 Test Road',
    classId: null,
    enrolmentStatus: 'ENROLLED',
    ...p,
  };
}

export function mkComponent(p: Partial<FeeComponent> = {}): FeeComponent {
  return {
    id: 'fc-1',
    code: 'BASE',
    name: 'Base',
    calcType: 'FIXED',
    amountCents: 10000,
    rateBp: 0,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    status: 'ACTIVE',
    ...p,
  };
}

export function dbWith(p: Partial<Db>): Db {
  return { ...emptyDb(), ...p };
}

export function addAccount(
  db: Db,
  personId: string,
  balanceCents: Cents = 0,
  status: AccountStatus = 'ACTIVE',
): { db: Db; accountId: string } {
  const a = nextId(db, 'ea');
  const accountId = a.id;
  let next: Db = {
    ...a.db,
    accounts: [
      ...a.db.accounts,
      { id: accountId, personId, status, openedOn: '2026-01-01', closedOn: status === 'CLOSED' ? '2026-06-01' : null },
    ],
  };
  if (balanceCents !== 0) {
    const l = nextId(next, 'led');
    next = {
      ...l.db,
      ledger: [
        ...l.db.ledger,
        { id: l.id, accountId, type: 'TOPUP_SEED', amountCents: balanceCents, postedAt: '2026-01-01', ref: 'seed', idempotencyKey: null },
      ],
    };
  }
  return { db: next, accountId };
}
