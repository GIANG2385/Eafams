import { accountOf, balanceOf } from './ea';
import { nextId } from './ids';
import type { Cents, Charge, Db, IsoDate, Payment } from './types';

export type PayError =
  | 'EMPTY_SELECTION'
  | 'CHARGE_NOT_PAYABLE'
  | 'NO_ACCOUNT'
  | 'ACCOUNT_CLOSED'
  | 'INSUFFICIENT_BALANCE';
export type EaEligibility =
  | { allowed: true }
  | { allowed: false; reason: 'NO_ACCOUNT' | 'ACCOUNT_CLOSED' | 'INSUFFICIENT_BALANCE' };
export interface PayInput {
  personId: string;
  chargeIds: string[];
  idempotencyKey: string;
}
export type PayResult = { ok: true; payment: Payment; replayed: boolean } | { ok: false; error: PayError };

/** R-PAY-1: EA usable only when the student's EA is ACTIVE and covers the total. */
export function eaPaymentEligibility(db: Db, personId: string, totalCents: Cents): EaEligibility {
  const acc = accountOf(db, personId);
  if (!acc) return { allowed: false, reason: 'NO_ACCOUNT' };
  if (acc.status !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_CLOSED' };
  if (balanceOf(db, acc.id) < totalCents) return { allowed: false, reason: 'INSUFFICIENT_BALANCE' };
  return { allowed: true };
}

type Selection = { ok: true; charges: Charge[]; total: Cents } | { ok: false; error: 'EMPTY_SELECTION' | 'CHARGE_NOT_PAYABLE' };

function select(db: Db, input: PayInput): Selection {
  const ids = Array.from(new Set(input.chargeIds));
  if (ids.length === 0) return { ok: false, error: 'EMPTY_SELECTION' };
  const charges: Charge[] = [];
  for (const id of ids) {
    const c = db.charges.find((x) => x.id === id);
    if (!c || c.personId !== input.personId || c.status !== 'OUTSTANDING') {
      return { ok: false, error: 'CHARGE_NOT_PAYABLE' };
    }
    charges.push(c);
  }
  return { ok: true, charges, total: charges.reduce((s, c) => s + c.totalCents, 0) };
}

function replay(db: Db, input: PayInput, method: Payment['method']): PayResult | undefined {
  const existing = db.payments.find((p) => p.idempotencyKey === input.idempotencyKey);
  if (!existing) return undefined;
  if (existing.personId !== input.personId || existing.method !== method) {
    return { ok: false, error: 'CHARGE_NOT_PAYABLE' };
  }
  return { ok: true, payment: existing, replayed: true };
}

function setCharges(db: Db, ids: string[], status: Charge['status']): Db {
  return { ...db, charges: db.charges.map((c) => (ids.includes(c.id) ? { ...c, status } : c)) };
}

/** R-PAY-3/4: debit + PAID in one step; same key never debits twice; any failure returns the same Db. */
export function payWithEa(db: Db, input: PayInput, asOf: IsoDate): { db: Db; result: PayResult } {
  const again = replay(db, input, 'EA');
  if (again) return { db, result: again };
  const sel = select(db, input);
  if (!sel.ok) return { db, result: sel };
  const eligibility = eaPaymentEligibility(db, input.personId, sel.total);
  if (!eligibility.allowed) return { db, result: { ok: false, error: eligibility.reason } };
  const acc = accountOf(db, input.personId)!;
  const p = nextId(db, 'pay');
  const l = nextId(p.db, 'led');
  const payment: Payment = {
    id: p.id,
    referenceNo: `PAY-${p.id.split('-')[1].padStart(6, '0')}`,
    personId: input.personId,
    chargeIds: sel.charges.map((c) => c.id),
    method: 'EA',
    status: 'SUCCEEDED',
    idempotencyKey: input.idempotencyKey,
    gatewayRef: null,
    totalCents: sel.total,
    createdAt: asOf,
  };
  let next: Db = {
    ...l.db,
    payments: [...l.db.payments, payment],
    ledger: [
      ...l.db.ledger,
      {
        id: l.id,
        accountId: acc.id,
        type: 'FEE_DEBIT',
        amountCents: -sel.total,
        postedAt: asOf,
        ref: payment.referenceNo,
        idempotencyKey: input.idempotencyKey,
      },
    ],
  };
  next = setCharges(next, payment.chargeIds, 'PAID');
  return { db: next, result: { ok: true, payment, replayed: false } };
}

/** R-PAY-5: PENDING payment + charges locked as PENDING_PAYMENT until the gateway confirms. */
export function startOnlinePayment(db: Db, input: PayInput, asOf: IsoDate): { db: Db; result: PayResult } {
  const again = replay(db, input, 'ONLINE');
  if (again) return { db, result: again };
  const sel = select(db, input);
  if (!sel.ok) return { db, result: sel };
  const p = nextId(db, 'pay');
  const n = p.id.split('-')[1].padStart(6, '0');
  const payment: Payment = {
    id: p.id,
    referenceNo: `PAY-${n}`,
    personId: input.personId,
    chargeIds: sel.charges.map((c) => c.id),
    method: 'ONLINE',
    status: 'PENDING',
    idempotencyKey: input.idempotencyKey,
    gatewayRef: `GW-${n}`,
    totalCents: sel.total,
    createdAt: asOf,
  };
  const next = setCharges({ ...p.db, payments: [...p.db.payments, payment] }, payment.chargeIds, 'PENDING_PAYMENT');
  return { db: next, result: { ok: true, payment, replayed: false } };
}

/** Callback handler (idempotent): only a PENDING payment can change; terminal states are final. */
export function applyGatewayOutcome(
  db: Db,
  paymentId: string,
  outcome: 'SUCCEEDED' | 'FAILED' | 'CANCELLED',
): {
  db: Db;
  result: { ok: true; payment: Payment; changed: boolean } | { ok: false; error: 'NOT_FOUND' };
} {
  const payment = db.payments.find((p) => p.id === paymentId);
  if (!payment) return { db, result: { ok: false, error: 'NOT_FOUND' } };
  if (payment.status !== 'PENDING') return { db, result: { ok: true, payment, changed: false } };
  const updated: Payment = { ...payment, status: outcome };
  let next: Db = { ...db, payments: db.payments.map((p) => (p.id === paymentId ? updated : p)) };
  next = setCharges(next, payment.chargeIds, outcome === 'SUCCEEDED' ? 'PAID' : 'OUTSTANDING');
  return { db: next, result: { ok: true, payment: updated, changed: true } };
}
