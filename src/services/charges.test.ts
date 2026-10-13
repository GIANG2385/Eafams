import { resetDb } from '../mock-db/store';
import { listCharges } from './parent';

beforeEach(() => resetDb());

test('splits charges by status and returns the EA balance', async () => {
  const r = await listCharges('g-tan', 'st-01');
  expect(r.outstanding.map((c) => c.totalCents)).toEqual([11990]);
  expect(r.pending).toEqual([]);
  expect(r.paid).toEqual([]);
  expect(r.balanceCents).toBe(50000);
  expect(r.accountStatus).toBe('ACTIVE');
});

test('student without EA has a null balance but still has charges', async () => {
  const r = await listCharges('g-nair', 'st-04');
  expect(r.balanceCents).toBeNull();
  expect(r.accountStatus).toBeNull();
  expect(r.outstanding).toHaveLength(1);
});

test('pending-payment charges are reported separately', async () => {
  const r = await listCharges('g-koh', 'st-09');
  expect(r.outstanding).toEqual([]);
  expect(r.pending).toHaveLength(1);
});

test('another parent cannot read the charges', async () => {
  await expect(listCharges('g-tan', 'st-05')).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
