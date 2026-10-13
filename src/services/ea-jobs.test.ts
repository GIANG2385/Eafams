import { balanceOf } from '../domain/ea';
import type { Actor } from '../domain/permissions';
import { getDb, resetDb } from '../mock-db/store';
import { updateSettings } from './demo';
import { listEaOverview, listRuns, runClosureJob, runCreationJob } from './jobs';

beforeEach(() => resetDb());
const hq: Actor = { kind: 'HQ' };

test('overview explains each student’s verdict', async () => {
  const rows = await listEaOverview(hq);
  const v = (id: string) => rows.find((r) => r.personId === id)!.verdict;
  expect(v('st-08')).toBe('ELIGIBLE');
  expect(v('st-02')).toBe('UNDER_7');
  expect(v('st-04')).toBe('NOT_CITIZEN');
  expect(v('st-01')).toBe('ALREADY_HAS_ACCOUNT');
});

test('overview respects the as-of date', async () => {
  const rows = await listEaOverview(hq, '2027-01-15');
  expect(rows.find((r) => r.personId === 'st-02')!.verdict).toBe('ELIGIBLE');
});

test('creation job: today creates st-08 only, rerun creates nothing, a later date creates st-02', async () => {
  const first = await runCreationJob(hq);
  expect(first.results.filter((r) => r.outcome === 'CREATED').map((r) => r.personId)).toEqual(['st-08']);
  const again = await runCreationJob(hq);
  expect(again.results.filter((r) => r.outcome === 'CREATED')).toHaveLength(0);
  const later = await runCreationJob(hq, '2027-01-15');
  expect(later.results.filter((r) => r.outcome === 'CREATED').map((r) => r.personId)).toEqual(['st-02']);
  const acc = getDb().accounts.find((a) => a.personId === 'st-08')!;
  expect(balanceOf(getDb(), acc.id)).toBe(0);
});

test('closure job: st-06 closed to CPF, st-09 blocked by its pending payment', async () => {
  const run = await runClosureJob(hq);
  const by = Object.fromEntries(run.results.map((r) => [r.personId, r]));
  expect(by['st-06']).toMatchObject({ outcome: 'CLOSED', amountCents: 12000 });
  expect(by['st-09']).toMatchObject({ outcome: 'BLOCKED_PENDING' });
  expect(getDb().accounts.find((a) => a.personId === 'st-06')!.status).toBe('CLOSED');
  expect(getDb().accounts.find((a) => a.personId === 'st-09')!.status).toBe('ACTIVE');
});

test('CPF failure leaves the account active and a retry succeeds', async () => {
  await updateSettings({ cpf: 'FAIL' });
  const failed = await runClosureJob(hq);
  expect(failed.results.find((r) => r.personId === 'st-06')!.outcome).toBe('TRANSFER_FAILED');
  expect(getDb().accounts.find((a) => a.personId === 'st-06')!.status).toBe('ACTIVE');
  await updateSettings({ cpf: 'OK' });
  const ok = await runClosureJob(hq);
  expect(ok.results.find((r) => r.personId === 'st-06')!.outcome).toBe('CLOSED');
});

test('only HQ runs jobs; invalid as-of date is rejected; history is newest first', async () => {
  await expect(runCreationJob({ kind: 'SCHOOL', schoolId: 'sch-01' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(runClosureJob(hq, '2027-02-31')).rejects.toMatchObject({ code: 'VALIDATION' });
  await runCreationJob(hq);
  await runClosureJob(hq);
  const runs = await listRuns(hq);
  expect(runs.map((r) => r.kind)).toEqual(['EA_CLOSE', 'EA_CREATE']);
});
