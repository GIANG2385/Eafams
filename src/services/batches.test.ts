import type { Actor } from '../domain/permissions';
import { getDb, resetDb } from '../mock-db/store';
import { listCharges } from './parent';
import { listBatches, previewFeeBatch, publishFeeBatch } from './fees';

beforeEach(() => resetDb());
const hq: Actor = { kind: 'HQ' };
const sunrise: Actor = { kind: 'SCHOOL', schoolId: 'sch-01' };
const input = { schoolId: 'sch-03', feeTypeId: 'ft-music', target: { kind: 'LEVEL' as const, ids: ['lv-06'] }, dueOn: '2026-12-15' };

test('preview does not create anything', async () => {
  const rows = await previewFeeBatch(hq, input);
  expect(rows.map((r) => r.personId)).toEqual(['st-08']);
  expect(rows[0].totalCents).toBe(3488);
  expect(getDb().batches).toHaveLength(8);
});

test('publish creates the charge and the parent sees it', async () => {
  const before = (await listCharges('g-koh', 'st-08')).outstanding.length;
  const out = await publishFeeBatch(hq, input);
  expect(out.created).toBe(1);
  const after = await listCharges('g-koh', 'st-08');
  expect(after.outstanding.length).toBe(before + 1);
  expect(after.outstanding.at(-1)).toMatchObject({ feeTypeName: 'Music class', totalCents: 3488, dueOn: '2026-12-15', status: 'OUTSTANDING' });
});

test('publishing the identical batch again is refused (no duplicate charges)', async () => {
  await publishFeeBatch(hq, input);
  const n = getDb().charges.length;
  await expect(publishFeeBatch(hq, input)).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(getDb().charges).toHaveLength(n);
});

test('School user is limited to their own school', async () => {
  await expect(publishFeeBatch(sunrise, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(previewFeeBatch(sunrise, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  const own = await publishFeeBatch(sunrise, { schoolId: 'sch-01', feeTypeId: 'ft-misc', target: { kind: 'CLASS', ids: ['cl-02'] }, dueOn: '2026-12-15' });
  expect(own.created).toBe(1);
});

test('empty target, bad date and inactive fee type are rejected', async () => {
  await expect(publishFeeBatch(hq, { ...input, target: { kind: 'STUDENTS', ids: [] } })).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(publishFeeBatch(hq, { ...input, dueOn: '2026-12-40' })).rejects.toMatchObject({ code: 'VALIDATION' });
  const db = getDb();
  const { setDb } = await import('../mock-db/store');
  setDb({ ...db, feeTypes: db.feeTypes.map((f) => (f.id === 'ft-music' ? { ...f, status: 'INACTIVE' as const } : f)) });
  await expect(publishFeeBatch(hq, input)).rejects.toMatchObject({ code: 'VALIDATION' });
});

test('history lists batches with counts and names', async () => {
  await publishFeeBatch(hq, input);
  const rows = await listBatches(hq);
  const mine = rows.find((r) => r.batch.dueOn === '2026-12-15')!;
  expect(mine).toMatchObject({ feeTypeName: 'Music class', schoolName: 'Lakeside Primary', chargeCount: 1 });
  expect((await listBatches(sunrise)).every((r) => r.batch.schoolId === 'sch-01')).toBe(true);
});
