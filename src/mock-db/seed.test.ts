import { balanceOf, runEaClosure, runEaCreation } from '../domain/ea';
import { PERSONAS, createSeed } from './seed';

const db = createSeed();

test('seed ids are unique and links point at real students', () => {
  const ids = [...db.charges.map((c) => c.id), ...db.accounts.map((a) => a.id), ...db.payments.map((p) => p.id), ...db.ledger.map((l) => l.id)];
  expect(new Set(ids).size).toBe(ids.length);
  for (const l of db.links) expect(db.students.some((s) => s.personId === l.personId)).toBe(true);
  for (const p of PERSONAS) expect(p.profile.mobile).toMatch(/^[89]\d{7}$/);
});

test('guardians are not provisioned until first login', () => {
  expect(db.guardians).toHaveLength(0);
});

test('balances and charges match the demo storyline', () => {
  const bal = (personId: string) => balanceOf(db, db.accounts.find((a) => a.personId === personId)!.id);
  expect(bal('st-01')).toBe(50000);
  expect(bal('st-03')).toBe(4000);
  expect(db.accounts.find((a) => a.personId === 'st-08')).toBeUndefined();
  expect(db.accounts.find((a) => a.personId === 'st-04')).toBeUndefined();
  const total = (personId: string) => db.charges.filter((c) => c.personId === personId).map((c) => c.totalCents);
  expect(total('st-01')).toEqual([11990]);
  expect(total('st-03')).toEqual([8502]);
  expect(total('st-05').sort()).toEqual([3488, 4469]);
  expect(db.charges.find((c) => c.personId === 'st-09')!.status).toBe('PENDING_PAYMENT');
  expect(db.payments).toHaveLength(1);
});

test('the age-7 job on the seed creates exactly one account (st-08)', () => {
  const { run } = runEaCreation(db, db.settings.today);
  expect(run.results.filter((r) => r.outcome === 'CREATED').map((r) => r.personId)).toEqual(['st-08']);
});

test('the closure job closes st-06 and blocks st-09', () => {
  const { run } = runEaClosure(db, db.settings.today, 'OK');
  const byId = Object.fromEntries(run.results.map((r) => [r.personId, r]));
  expect(byId['st-06']).toMatchObject({ outcome: 'CLOSED', amountCents: 12000 });
  expect(byId['st-09']).toMatchObject({ outcome: 'BLOCKED_PENDING' });
});

test('latency is off under test', () => {
  expect(db.settings.latency).toBe('off');
});
