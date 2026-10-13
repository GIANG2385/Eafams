import { createBatchDraft, previewBatch, publishBatch, resolveTargets } from './batch';
import { dbWith, mkComponent, mkStudent } from './testing';
import type { Db } from './types';

function setup(): Db {
  return dbWith({
    schools: [
      { id: 'sch-1', code: 'SCH-01', name: 'Sunrise', status: 'ACTIVE' },
      { id: 'sch-2', code: 'SCH-02', name: 'Harbour', status: 'ACTIVE' },
    ],
    levels: [
      { id: 'lv-1', schoolId: 'sch-1', name: 'Primary 2', status: 'ACTIVE' },
      { id: 'lv-2', schoolId: 'sch-2', name: 'Secondary 3', status: 'ACTIVE' },
    ],
    classes: [
      { id: 'cl-1', levelId: 'lv-1', name: '2A', academicYear: '2026', status: 'ACTIVE' },
      { id: 'cl-2', levelId: 'lv-1', name: '2B', academicYear: '2026', status: 'ACTIVE' },
      { id: 'cl-3', levelId: 'lv-2', name: '3A', academicYear: '2026', status: 'ACTIVE' },
    ],
    students: [
      mkStudent({ personId: 's1', name: 'One', classId: 'cl-1' }),
      mkStudent({ personId: 's2', name: 'Two', classId: 'cl-1', enrolmentStatus: 'LEFT' }),
      mkStudent({ personId: 's3', name: 'Three', classId: 'cl-2' }),
      mkStudent({ personId: 's4', name: 'Other school', classId: 'cl-3' }),
      mkStudent({ personId: 's5', name: 'Unassigned', classId: null }),
    ],
    feeTypes: [{ id: 'ft-1', code: 'SCHOOL', name: 'School fee', description: '', status: 'ACTIVE' }],
    feeComponents: [
      mkComponent({ id: 'c-base', name: 'Term fee', amountCents: 10000 }),
      mkComponent({ id: 'c-mat', name: 'Materials', amountCents: 1000 }),
      mkComponent({ id: 'c-gst', name: 'GST 9%', calcType: 'PERCENT', rateBp: 900, amountCents: 0 }),
    ],
    feeTypeComponents: [
      { feeTypeId: 'ft-1', componentId: 'c-base', order: 1 },
      { feeTypeId: 'ft-1', componentId: 'c-mat', order: 2 },
      { feeTypeId: 'ft-1', componentId: 'c-gst', order: 3 },
    ],
  });
}

const TODAY = '2026-10-13';

test('resolveTargets honours scope, enrolment and school', () => {
  const db = setup();
  const ids = (t: ReturnType<typeof resolveTargets>) => t.map((s) => s.personId).sort();
  expect(ids(resolveTargets(db, { schoolId: 'sch-1', target: { kind: 'CLASS', ids: ['cl-1'] } }))).toEqual(['s1']);
  expect(ids(resolveTargets(db, { schoolId: 'sch-1', target: { kind: 'LEVEL', ids: ['lv-1'] } }))).toEqual(['s1', 's3']);
  expect(ids(resolveTargets(db, { schoolId: 'sch-1', target: { kind: 'STUDENTS', ids: ['s1', 's4', 's5'] } }))).toEqual(['s1']);
});

test('preview shows components including shared GST and total', () => {
  const rows = previewBatch(setup(), { schoolId: 'sch-1', feeTypeId: 'ft-1', target: { kind: 'LEVEL', ids: ['lv-1'] } }, TODAY);
  expect(rows).toHaveLength(2);
  expect(rows[0].lines.map((l) => l.label)).toEqual(['Term fee', 'Materials', 'GST 9%']);
  expect(rows[0].totalCents).toBe(11990);
  expect(rows[0].subsidyCents).toBe(0);
});

test('publish creates OUTSTANDING charges once; republish is a no-op', () => {
  const draft = createBatchDraft(setup(), { schoolId: 'sch-1', feeTypeId: 'ft-1', target: { kind: 'LEVEL', ids: ['lv-1'] }, dueOn: '2026-11-30' });
  expect(draft.batch.status).toBe('DRAFT');
  const first = publishBatch(draft.db, draft.batch.id, TODAY);
  expect(first).toMatchObject({ created: 2, alreadyPublished: false });
  expect(first.db.charges.every((c) => c.status === 'OUTSTANDING' && c.totalCents === 11990 && c.dueOn === '2026-11-30')).toBe(true);
  expect(first.db.batches[0]).toMatchObject({ status: 'PUBLISHED', publishedAt: TODAY });
  const second = publishBatch(first.db, draft.batch.id, TODAY);
  expect(second).toMatchObject({ created: 0, alreadyPublished: true });
  expect(second.db.charges).toHaveLength(2);
});

test('editing a component later does not rewrite published charges', () => {
  const draft = createBatchDraft(setup(), { schoolId: 'sch-1', feeTypeId: 'ft-1', target: { kind: 'CLASS', ids: ['cl-1'] }, dueOn: '2026-11-30' });
  const pub = publishBatch(draft.db, draft.batch.id, TODAY);
  const edited = { ...pub.db, feeComponents: pub.db.feeComponents.map((c) => (c.id === 'c-base' ? { ...c, amountCents: 20000 } : c)) };
  expect(publishBatch(edited, draft.batch.id, TODAY).db.charges[0].totalCents).toBe(11990);
  const next = createBatchDraft(edited, { schoolId: 'sch-1', feeTypeId: 'ft-1', target: { kind: 'CLASS', ids: ['cl-2'] }, dueOn: '2026-11-30' });
  const pub2 = publishBatch(next.db, next.batch.id, TODAY);
  expect(pub2.db.charges.find((c) => c.personId === 's3')!.totalCents).toBe(22890);
});

test.each([
  ['unknown batch', 'nope', undefined, 'NOT_FOUND'],
  ['empty target', undefined, { kind: 'CLASS' as const, ids: ['cl-3'] }, 'EMPTY_TARGET'],
])('publish error: %s', (_n, id, target, error) => {
  const base = setup();
  const draft = createBatchDraft(base, { schoolId: 'sch-1', feeTypeId: 'ft-1', target: target ?? { kind: 'CLASS', ids: ['cl-1'] }, dueOn: '2026-11-30' });
  const out = publishBatch(draft.db, id ?? draft.batch.id, TODAY);
  expect(out.error).toBe(error);
  expect(out.db.charges).toHaveLength(0);
});

test('inactive fee type cannot be published', () => {
  const base = setup();
  const draft = createBatchDraft(
    { ...base, feeTypes: base.feeTypes.map((f) => ({ ...f, status: 'INACTIVE' as const })) },
    { schoolId: 'sch-1', feeTypeId: 'ft-1', target: { kind: 'CLASS', ids: ['cl-1'] }, dueOn: '2026-11-30' },
  );
  expect(publishBatch(draft.db, draft.batch.id, TODAY).error).toBe('FEE_TYPE_INACTIVE');
});
