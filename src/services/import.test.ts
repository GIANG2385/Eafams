import type { Actor } from '../domain/permissions';
import { getDb, resetDb } from '../mock-db/store';
import { updateSettings } from './demo';
import { previewSource, runImportJob } from './jobs';

beforeEach(() => resetDb());
const hq: Actor = { kind: 'HQ' };

test('preview marks valid, rejected and already-existing records', async () => {
  const rows = await previewSource(hq);
  expect(rows).toHaveLength(8);
  expect(rows.filter((r) => r.ok)).toHaveLength(6);
  expect(rows.find((r) => r.record.personId === 'src-105')).toMatchObject({ ok: false, reasons: ['MISSING_DOB'] });
  expect(rows.find((r) => r.record.personId === 'src-106')!.reasons).toEqual(['INVALID_CITIZENSHIP']);
  expect(rows.find((r) => r.record.personId === 'st-01')).toMatchObject({ ok: true, existing: true });
});

test('import creates new, updates existing, rejects the bad ones, and leaves class/enrolment alone', async () => {
  const run = await runImportJob(hq);
  const count = (o: string) => run.results.filter((r) => r.outcome === o).length;
  expect([count('CREATED'), count('UPDATED'), count('REJECTED')]).toEqual([5, 1, 2]);
  const aiden = getDb().students.find((s) => s.personId === 'st-01')!;
  expect(aiden.address).toMatch(/updated/);
  expect(aiden.classId).toBe('cl-02');
  expect(getDb().students.some((s) => s.personId === 'src-105')).toBe(false);
});

test('importing twice does not duplicate', async () => {
  await runImportJob(hq);
  const n = getDb().students.length;
  const again = await runImportJob(hq);
  expect(getDb().students).toHaveLength(n);
  expect(again.results.filter((r) => r.outcome === 'CREATED')).toHaveLength(0);
});

test('source denied: nothing is read or changed', async () => {
  await updateSettings({ source: 'DENIED' });
  const before = getDb().students.length;
  await expect(previewSource(hq)).rejects.toMatchObject({ code: 'SOURCE_DENIED' });
  await expect(runImportJob(hq)).rejects.toMatchObject({ code: 'SOURCE_DENIED' });
  expect(getDb().students).toHaveLength(before);
});

test('School users cannot run the import', async () => {
  await expect(runImportJob({ kind: 'SCHOOL', schoolId: 'sch-01' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(previewSource({ kind: 'PARENT', guardianId: 'g-tan' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
