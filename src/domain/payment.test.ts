import { balanceOf } from './ea';
import { applyGatewayOutcome, eaPaymentEligibility, payWithEa, startOnlinePayment } from './payment';
import { addAccount, dbWith, mkStudent } from './testing';
import type { Charge, ChargeStatus, Db } from './types';

const TODAY = '2026-10-13';
const charge = (id: string, personId: string, totalCents: number, status: ChargeStatus = 'OUTSTANDING'): Charge => ({
  id, personId, batchId: 'b', feeTypeId: 'ft', feeTypeName: 'School fee', lines: [], subsidyCents: 0, totalCents, dueOn: '2026-11-30', status,
});

function setup(balance = 50000): { db: Db; accountId: string } {
  const base = dbWith({
    students: [mkStudent({ personId: 'p1' }), mkStudent({ personId: 'p2' })],
    charges: [
      charge('c1', 'p1', 12000), charge('c2', 'p1', 3000), charge('c-paid', 'p1', 500, 'PAID'),
      charge('c-pend', 'p1', 700, 'PENDING_PAYMENT'), charge('c-other', 'p2', 900),
    ],
  });
  return addAccount(base, 'p1', balance);
}
const input = (chargeIds: string[], key = 'k1') => ({ personId: 'p1', chargeIds, idempotencyKey: key });

describe('payWithEa', () => {
  test('debits once, marks charges PAID, records reference', () => {
    const { db, accountId } = setup();
    const { db: out, result } = payWithEa(db, input(['c1', 'c2']), TODAY);
    expect(result.ok).toBe(true);
    expect(balanceOf(out, accountId)).toBe(35000);
    expect(out.charges.filter((c) => c.status === 'PAID').map((c) => c.id).sort()).toEqual(['c-paid', 'c1', 'c2']);
    if (result.ok) {
      expect(result.payment).toMatchObject({ method: 'EA', status: 'SUCCEEDED', totalCents: 15000 });
      expect(result.payment.referenceNo).toMatch(/^PAY-\d{6}$/);
    }
  });

  test('double submit with the same key debits exactly once', () => {
    const { db, accountId } = setup();
    const first = payWithEa(db, input(['c1']), TODAY);
    const second = payWithEa(first.db, input(['c1']), TODAY);
    expect(balanceOf(second.db, accountId)).toBe(38000);
    expect(second.db.payments).toHaveLength(1);
    expect(second.result).toMatchObject({ ok: true, replayed: true });
  });

  test('same key from a different student is rejected, not replayed', () => {
    const { db } = setup();
    const first = payWithEa(db, input(['c1']), TODAY);
    const out = payWithEa(first.db, { personId: 'p2', chargeIds: ['c-other'], idempotencyKey: 'k1' }, TODAY);
    expect(out.result).toEqual({ ok: false, error: 'CHARGE_NOT_PAYABLE' });
  });

  test('insufficient balance changes nothing', () => {
    const { db } = setup(1000);
    const out = payWithEa(db, input(['c1']), TODAY);
    expect(out.result).toEqual({ ok: false, error: 'INSUFFICIENT_BALANCE' });
    expect(out.db).toBe(db);
  });

  test.each([
    ['empty selection', [] as string[], 'EMPTY_SELECTION'],
    ['unknown charge', ['nope'], 'CHARGE_NOT_PAYABLE'],
    ['already paid', ['c-paid'], 'CHARGE_NOT_PAYABLE'],
    ['pending payment', ['c-pend'], 'CHARGE_NOT_PAYABLE'],
    ['another student charge', ['c1', 'c-other'], 'CHARGE_NOT_PAYABLE'],
  ])('rejects %s', (_n, ids, error) => {
    const { db } = setup();
    const out = payWithEa(db, input(ids), TODAY);
    expect(out.result).toEqual({ ok: false, error });
    expect(out.db).toBe(db);
  });

  test('duplicate ids in the selection are charged once', () => {
    const { db, accountId } = setup();
    const out = payWithEa(db, input(['c1', 'c1']), TODAY);
    expect(balanceOf(out.db, accountId)).toBe(38000);
  });

  test('closed account and missing account cannot pay', () => {
    const base = setup().db;
    const closed = addAccount(dbWith({ ...base, accounts: [] }), 'p1', 50000, 'CLOSED').db;
    expect(payWithEa(closed, input(['c1']), TODAY).result).toEqual({ ok: false, error: 'ACCOUNT_CLOSED' });
    const none = dbWith({ ...base, accounts: [], ledger: [] });
    expect(payWithEa(none, input(['c1']), TODAY).result).toEqual({ ok: false, error: 'NO_ACCOUNT' });
  });
});

describe('eaPaymentEligibility', () => {
  test('reports why EA cannot be used', () => {
    const { db } = setup(1000);
    expect(eaPaymentEligibility(db, 'p1', 500)).toEqual({ allowed: true });
    expect(eaPaymentEligibility(db, 'p1', 5000)).toEqual({ allowed: false, reason: 'INSUFFICIENT_BALANCE' });
    expect(eaPaymentEligibility(db, 'p2', 100)).toEqual({ allowed: false, reason: 'NO_ACCOUNT' });
  });
});

describe('online payment lifecycle', () => {
  test('start locks charges, leaves EA untouched, works without an EA', () => {
    const { db, accountId } = setup();
    const { db: out, result } = startOnlinePayment(db, input(['c1']), TODAY);
    expect(result.ok && result.payment).toMatchObject({ method: 'ONLINE', status: 'PENDING' });
    expect(out.charges.find((c) => c.id === 'c1')!.status).toBe('PENDING_PAYMENT');
    expect(balanceOf(out, accountId)).toBe(50000);
    const noEa = startOnlinePayment(dbWith({ charges: [charge('c9', 'p3', 600)] }), { personId: 'p3', chargeIds: ['c9'], idempotencyKey: 'x' }, TODAY);
    expect(noEa.result.ok).toBe(true);
  });

  test('a charge already locked by a pending payment cannot be started again', () => {
    const { db } = setup();
    const first = startOnlinePayment(db, input(['c1'], 'k1'), TODAY);
    expect(startOnlinePayment(first.db, input(['c1'], 'k2'), TODAY).result).toEqual({ ok: false, error: 'CHARGE_NOT_PAYABLE' });
  });

  test('SUCCEEDED pays once even if the callback is repeated', () => {
    const { db } = setup();
    const start = startOnlinePayment(db, input(['c1']), TODAY);
    const id = start.result.ok ? start.result.payment.id : '';
    const a = applyGatewayOutcome(start.db, id, 'SUCCEEDED');
    const b = applyGatewayOutcome(a.db, id, 'SUCCEEDED');
    expect(a.db.charges.find((c) => c.id === 'c1')!.status).toBe('PAID');
    expect(b.result).toMatchObject({ ok: true, changed: false });
    expect(b.db.payments).toHaveLength(1);
  });

  test.each(['FAILED', 'CANCELLED'] as const)('%s returns charges to OUTSTANDING and allows retry with a new key', (outcome) => {
    const { db } = setup();
    const start = startOnlinePayment(db, input(['c1'], 'k1'), TODAY);
    const id = start.result.ok ? start.result.payment.id : '';
    const out = applyGatewayOutcome(start.db, id, outcome);
    expect(out.db.charges.find((c) => c.id === 'c1')!.status).toBe('OUTSTANDING');
    expect(out.db.payments[0].status).toBe(outcome);
    expect(startOnlinePayment(out.db, input(['c1'], 'k2'), TODAY).result.ok).toBe(true);
  });

  test('a late FAILED callback cannot undo a SUCCEEDED payment', () => {
    const { db } = setup();
    const start = startOnlinePayment(db, input(['c1']), TODAY);
    const id = start.result.ok ? start.result.payment.id : '';
    const ok = applyGatewayOutcome(start.db, id, 'SUCCEEDED');
    const late = applyGatewayOutcome(ok.db, id, 'FAILED');
    expect(late.db.charges.find((c) => c.id === 'c1')!.status).toBe('PAID');
    expect(late.db.payments[0].status).toBe('SUCCEEDED');
  });

  test('unknown payment id', () => {
    expect(applyGatewayOutcome(setup().db, 'nope', 'SUCCEEDED').result).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});
