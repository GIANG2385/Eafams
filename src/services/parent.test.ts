import { resetDb } from '../mock-db/store';
import { getChild, listChildren, listTransactions } from './parent';

beforeEach(() => resetDb());

test('listChildren returns only linked children with account summary', async () => {
  const kids = await listChildren('g-tan');
  expect(kids.map((k) => k.personId).sort()).toEqual(['st-01', 'st-02']);
  const aiden = kids.find((k) => k.personId === 'st-01')!;
  expect(aiden.account).toMatchObject({ status: 'ACTIVE', balanceCents: 50000 });
  expect(aiden.schoolName).toBe('Sunrise Primary');
  const chloe = kids.find((k) => k.personId === 'st-02')!;
  expect(chloe.account).toBeNull();
  expect(chloe.noAccountReason).toBe('UNDER_7');
});

test('no linked child gives an empty list', async () => {
  expect(await listChildren('g-none')).toEqual([]);
});

test('getChild forbids students that are not linked', async () => {
  await expect(getChild('g-tan', 'st-05')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(getChild('g-tan', 'does-not-exist')).rejects.toMatchObject({ code: 'FORBIDDEN' });
});

test('PR student has no EA and the reason is NOT_CITIZEN', async () => {
  const kid = await getChild('g-nair', 'st-04');
  expect(kid.account).toBeNull();
  expect(kid.noAccountReason).toBe('NOT_CITIZEN');
});

test('transactions: 20 per page, newest first, paged', async () => {
  const p1 = await listTransactions('g-tan', 'st-01', { page: 1 });
  expect(p1.total).toBe(25);
  expect(p1.pages).toBe(2);
  expect(p1.rows).toHaveLength(20);
  const dates = p1.rows.map((r) => r.postedAt);
  expect([...dates].sort().reverse()).toEqual(dates);
  const p2 = await listTransactions('g-tan', 'st-01', { page: 2 });
  expect(p2.rows).toHaveLength(5);
  expect(p2.rows[0].postedAt <= p1.rows[19].postedAt).toBe(true);
});

test('transactions can be filtered by date range and type', async () => {
  const range = await listTransactions('g-tan', 'st-01', { from: '2025-01-01', to: '2025-12-31' });
  expect(range.rows.every((r) => r.postedAt.startsWith('2025'))).toBe(true);
  expect(range.total).toBe(12);
  const fees = await listTransactions('g-tan', 'st-01', { type: 'FEE_PAYMENT' });
  expect(fees.total).toBe(0);
  expect(fees.pages).toBe(1);
});

test('page numbers are clamped and access is enforced', async () => {
  expect((await listTransactions('g-tan', 'st-01', { page: 99 })).page).toBe(2);
  await expect(listTransactions('g-tan', 'st-05')).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
