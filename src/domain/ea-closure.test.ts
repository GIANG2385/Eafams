import { balanceOf, hasPendingTransactions, runEaClosure } from './ea';
import { addAccount, dbWith, mkStudent } from './testing';
import type { Charge, Payment } from './types';

const TODAY = '2026-10-13';
const sixteen = mkStudent({ personId: 'p16', dob: '2010-09-30' });

const pendingPayment = (personId: string): Payment => ({
  id: 'pay-x', referenceNo: 'PAY-X', personId, chargeIds: ['c-x'], method: 'ONLINE', status: 'PENDING',
  idempotencyKey: 'k', gatewayRef: 'GW-1', totalCents: 5000, createdAt: TODAY,
});
const pendingCharge = (personId: string): Charge => ({
  id: 'c-x', personId, batchId: 'b', feeTypeId: 'ft', feeTypeName: 'Fee', lines: [], subsidyCents: 0,
  totalCents: 5000, dueOn: TODAY, status: 'PENDING_PAYMENT',
});

function setup(balance = 12000) {
  const base = dbWith({ students: [sixteen, mkStudent({ personId: 'p15', dob: '2011-05-02' })] });
  const a = addAccount(base, 'p16', balance);
  const b = addAccount(a.db, 'p15', 4000);
  return { db: b.db, a16: a.accountId, a15: b.accountId };
}

test('closes a 16-year-old: moves the whole balance to CPF atomically', () => {
  const { db, a16 } = setup();
  const out = runEaClosure(db, TODAY, 'OK');
  const acc = out.db.accounts.find((a) => a.id === a16)!;
  expect(acc).toMatchObject({ status: 'CLOSED', closedOn: TODAY });
  expect(balanceOf(out.db, a16)).toBe(0);
  expect(out.db.ledger.find((l) => l.type === 'CPF_TRANSFER')).toMatchObject({ amountCents: -12000 });
  expect(out.db.cpfTransfers).toHaveLength(1);
  expect(out.db.cpfTransfers[0]).toMatchObject({ status: 'SUCCEEDED', amountCents: 12000 });
  expect(out.run.results).toEqual([
    expect.objectContaining({ personId: 'p16', outcome: 'CLOSED', amountCents: 12000 }),
  ]);
});

test('a 15-year-old is untouched and not listed', () => {
  const { db, a15 } = setup();
  const out = runEaClosure(db, TODAY, 'OK');
  expect(out.db.accounts.find((a) => a.id === a15)!.status).toBe('ACTIVE');
  expect(out.run.results.find((r) => r.personId === 'p15')).toBeUndefined();
});

test.each([
  ['payment', (db: ReturnType<typeof setup>['db']) => ({ ...db, payments: [pendingPayment('p16')] })],
  ['charge', (db: ReturnType<typeof setup>['db']) => ({ ...db, charges: [pendingCharge('p16')] })],
])('a pending %s blocks closure and changes nothing', (_n, mutate) => {
  const { db, a16 } = setup();
  const blocked = mutate(db);
  expect(hasPendingTransactions(blocked, 'p16')).toBe(true);
  const out = runEaClosure(blocked, TODAY, 'OK');
  expect(out.db.accounts.find((a) => a.id === a16)!.status).toBe('ACTIVE');
  expect(balanceOf(out.db, a16)).toBe(12000);
  expect(out.db.cpfTransfers).toHaveLength(0);
  expect(out.run.results[0]).toMatchObject({ personId: 'p16', outcome: 'BLOCKED_PENDING' });
});

test('CPF failure keeps the account active, balance intact, and records the failed attempt', () => {
  const { db, a16 } = setup();
  const out = runEaClosure(db, TODAY, 'FAIL');
  expect(out.db.accounts.find((a) => a.id === a16)!.status).toBe('ACTIVE');
  expect(balanceOf(out.db, a16)).toBe(12000);
  expect(out.db.cpfTransfers).toEqual([expect.objectContaining({ status: 'FAILED', amountCents: 12000 })]);
  expect(out.run.results[0].outcome).toBe('TRANSFER_FAILED');
});

test('retry after a failure closes it; closed accounts are never processed twice', () => {
  const { db } = setup();
  const failed = runEaClosure(db, TODAY, 'FAIL');
  const ok = runEaClosure(failed.db, TODAY, 'OK');
  expect(ok.run.results[0].outcome).toBe('CLOSED');
  const again = runEaClosure(ok.db, TODAY, 'OK');
  expect(again.run.results).toHaveLength(0);
  expect(again.db.ledger.filter((l) => l.type === 'CPF_TRANSFER')).toHaveLength(1);
});

test('zero balance still closes, with a zero-amount transfer record and no ledger row', () => {
  const { db } = setup(0);
  const out = runEaClosure(db, TODAY, 'OK');
  expect(out.run.results[0]).toMatchObject({ outcome: 'CLOSED', amountCents: 0 });
  expect(out.db.ledger.filter((l) => l.type === 'CPF_TRANSFER')).toHaveLength(0);
});
