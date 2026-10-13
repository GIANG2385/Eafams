import { balanceOf } from '../domain/ea';
import { getDb, resetDb } from '../mock-db/store';
import { updateSettings } from './demo';
import { checkPaymentStatus, completeGateway, getCheckout, getPayment, payByEa, startOnline } from './parent';

beforeEach(() => resetDb());
const chargeId = (personId: string, nth = 0) => getDb().charges.filter((c) => c.personId === personId)[nth].id;
const key = (k = 'k1') => k;

describe('getCheckout', () => {
  test('returns total and EA eligibility', async () => {
    const r = await getCheckout('g-tan', 'st-01', [chargeId('st-01')]);
    expect(r.totalCents).toBe(11990);
    expect(r.eligibility).toEqual({ allowed: true });
    expect(r.balanceCents).toBe(50000);
  });

  test('insufficient balance is reported, not thrown', async () => {
    const r = await getCheckout('g-lim', 'st-03', [chargeId('st-03')]);
    expect(r.eligibility).toEqual({ allowed: false, reason: 'INSUFFICIENT_BALANCE' });
  });

  test('empty, foreign or already-locked selections are rejected', async () => {
    await expect(getCheckout('g-tan', 'st-01', [])).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(getCheckout('g-tan', 'st-01', [chargeId('st-05')])).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(getCheckout('g-koh', 'st-09', [chargeId('st-09')])).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(getCheckout('g-tan', 'st-05', [chargeId('st-05')])).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('payByEa', () => {
  test('debits once and returns a SUCCEEDED payment', async () => {
    const p = await payByEa('g-tan', { personId: 'st-01', chargeIds: [chargeId('st-01')], idempotencyKey: key() });
    expect(p).toMatchObject({ method: 'EA', status: 'SUCCEEDED', totalCents: 11990 });
    const db = getDb();
    expect(balanceOf(db, db.accounts.find((a) => a.personId === 'st-01')!.id)).toBe(38010);
  });

  test('the same key twice does not debit twice', async () => {
    const input = { personId: 'st-01', chargeIds: [chargeId('st-01')], idempotencyKey: key() };
    await payByEa('g-tan', input);
    await payByEa('g-tan', input);
    expect(getDb().ledger.filter((l) => l.type === 'FEE_DEBIT')).toHaveLength(1);
  });

  test('insufficient balance throws a friendly error and changes nothing', async () => {
    const before = getDb();
    await expect(
      payByEa('g-lim', { personId: 'st-03', chargeIds: [chargeId('st-03')], idempotencyKey: key() }),
    ).rejects.toMatchObject({ code: 'CONFLICT', message: expect.stringMatching(/not enough/i) });
    expect(getDb().ledger).toEqual(before.ledger);
    expect(getDb().charges).toEqual(before.charges);
  });

  test('a parent cannot pay for someone else’s child', async () => {
    await expect(
      payByEa('g-tan', { personId: 'st-05', chargeIds: [chargeId('st-05')], idempotencyKey: key() }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('online lifecycle through the services', () => {
  const start = (k = 'o1') => startOnline('g-nair', { personId: 'st-04', chargeIds: [chargeId('st-04')], idempotencyKey: k });

  test('start locks the charge; success pays it once', async () => {
    const p = await start();
    expect(p.status).toBe('PENDING');
    await updateSettings({ gatewayMode: 'SUCCEEDED' });
    const done = await completeGateway('g-nair', p.id);
    expect(done.status).toBe('SUCCEEDED');
    expect((await completeGateway('g-nair', p.id)).status).toBe('SUCCEEDED');
    expect(getDb().charges.find((c) => c.personId === 'st-04')!.status).toBe('PAID');
    expect(getDb().payments.filter((x) => x.personId === 'st-04')).toHaveLength(1);
  });

  test('ASK mode needs a choice; chosen FAILED releases the charge', async () => {
    const p = await start();
    await expect(completeGateway('g-nair', p.id)).rejects.toMatchObject({ code: 'VALIDATION' });
    const failed = await completeGateway('g-nair', p.id, 'FAILED');
    expect(failed.status).toBe('FAILED');
    expect(getDb().charges.find((c) => c.personId === 'st-04')!.status).toBe('OUTSTANDING');
  });

  test('timeout stays pending and charge stays locked; check status resolves per setting', async () => {
    const p = await start();
    await updateSettings({ gatewayMode: 'TIMEOUT', timeoutResolution: 'STILL_PENDING' });
    expect((await completeGateway('g-nair', p.id)).status).toBe('PENDING');
    expect((await checkPaymentStatus('g-nair', p.id)).status).toBe('PENDING');
    expect(getDb().charges.find((c) => c.personId === 'st-04')!.status).toBe('PENDING_PAYMENT');
    await updateSettings({ timeoutResolution: 'SUCCEEDED' });
    expect((await checkPaymentStatus('g-nair', p.id)).status).toBe('SUCCEEDED');
    expect(getDb().charges.find((c) => c.personId === 'st-04')!.status).toBe('PAID');
  });

  test('forced FAILED mode ignores the chosen value', async () => {
    const p = await start();
    await updateSettings({ gatewayMode: 'FAILED' });
    expect((await completeGateway('g-nair', p.id, 'SUCCEEDED')).status).toBe('FAILED');
  });
});

describe('getPayment', () => {
  test('owner sees it, others are forbidden, unknown id is not found', async () => {
    const p = await payByEa('g-tan', { personId: 'st-01', chargeIds: [chargeId('st-01')], idempotencyKey: key() });
    const v = await getPayment('g-tan', p.id);
    expect(v.childName).toBe('Aiden Tan');
    expect(v.charges).toHaveLength(1);
    await expect(getPayment('g-ong', p.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(getPayment('g-tan', 'pay-nope')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
