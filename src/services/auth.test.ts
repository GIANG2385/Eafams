import { getDb, resetDb } from '../mock-db/store';
import { ServiceError } from './core';
import { grantDemoFunds, reset, setToday, updateSettings } from './demo';
import { listPersonas, signIn } from './auth';
import { balanceOf } from '../domain/ea';

beforeEach(() => resetDb());

test('first sign-in provisions the guardian; second does not', async () => {
  const first = await signIn('g-tan');
  expect(first).toMatchObject({ guardianId: 'g-tan', displayName: 'Tan Mei Ling', firstLogin: true });
  expect(getDb().guardians).toHaveLength(1);
  const second = await signIn('g-tan');
  expect(second.firstLogin).toBe(false);
  expect(getDb().guardians).toHaveLength(1);
});

test('SingPass validation failure throws and provisions nothing', async () => {
  await updateSettings({ singpass: 'FAIL' });
  await expect(signIn('g-tan')).rejects.toMatchObject({ code: 'SINGPASS_VALIDATION_FAILED' });
  expect(getDb().guardians).toHaveLength(0);
});

test('unknown persona', async () => {
  await expect(signIn('g-nobody')).rejects.toBeInstanceOf(ServiceError);
});

test('failNext makes exactly one call fail', async () => {
  await updateSettings({ failNext: true });
  await expect(listPersonas()).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  await expect(listPersonas()).resolves.toHaveLength(6);
});

test('setToday validates the date; reset restores the seed', async () => {
  await expect(setToday('2026-02-31')).rejects.toMatchObject({ code: 'VALIDATION' });
  await setToday('2027-01-15');
  expect(getDb().settings.today).toBe('2027-01-15');
  await reset();
  expect(getDb().settings.today).toBe('2026-10-13');
});

test('grantDemoFunds adds a DEMO_FUNDS ledger entry and rejects non-positive or accountless', async () => {
  await grantDemoFunds('st-01', 1000);
  const db = getDb();
  const acc = db.accounts.find((a) => a.personId === 'st-01')!;
  expect(balanceOf(db, acc.id)).toBe(51000);
  expect(db.ledger.at(-1)).toMatchObject({ type: 'DEMO_FUNDS', amountCents: 1000 });
  await expect(grantDemoFunds('st-01', 0)).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(grantDemoFunds('st-08', 1000)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
