import { runImport, validateSourceRecord } from './importer';
import type { SourceRecord } from './importer';
import { dbWith, mkStudent } from './testing';

const good: SourceRecord = { personId: 'src-1', name: 'Rylan Goh', dob: '2018-04-02', citizenship: 'SC', address: '3 Bishan Rd' };

describe('validateSourceRecord', () => {
  test('accepts a complete record and normalises it', () => {
    const v = validateSourceRecord({ ...good, citizenship: ' sc ', name: '  Rylan Goh ' });
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.student).toMatchObject({ personId: 'src-1', name: 'Rylan Goh', citizenship: 'SC', classId: null, enrolmentStatus: 'ENROLLED' });
  });

  test.each([
    ['no personId', { personId: '' }, ['MISSING_PERSON_ID']],
    ['no name', { name: undefined }, ['MISSING_NAME']],
    ['no dob', { dob: undefined }, ['MISSING_DOB']],
    ['bad dob', { dob: '2018-02-31' }, ['INVALID_DOB']],
    ['bad citizenship', { citizenship: 'ALIEN' }, ['INVALID_CITIZENSHIP']],
    ['several problems', { name: '', dob: 'x', citizenship: '' }, ['MISSING_NAME', 'INVALID_DOB', 'INVALID_CITIZENSHIP']],
  ])('rejects %s', (_n, patch, reasons) => {
    const v = validateSourceRecord({ ...good, ...patch });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reasons).toEqual(reasons);
  });

  test('address is optional', () => {
    expect(validateSourceRecord({ ...good, address: undefined }).ok).toBe(true);
  });
});

describe('runImport', () => {
  test('creates, updates by personId (keeps class/enrolment) and rejects bad rows', () => {
    const db = dbWith({ students: [mkStudent({ personId: 'src-9', name: 'Old', classId: 'cl-1', enrolmentStatus: 'TRANSFERRED' })] });
    const { db: out, run } = runImport(
      db,
      [good, { ...good, personId: 'src-9', name: 'New Name' }, { ...good, personId: 'src-2', dob: undefined }],
      '2026-10-13',
    );
    expect(out.students).toHaveLength(2);
    expect(out.students.find((s) => s.personId === 'src-9')).toMatchObject({ name: 'New Name', classId: 'cl-1', enrolmentStatus: 'TRANSFERRED' });
    expect(run.results.map((r) => r.outcome)).toEqual(['CREATED', 'UPDATED', 'REJECTED']);
    expect(run.results[2].reason).toBe('MISSING_DOB');
    expect(out.students.some((s) => s.personId === 'src-2')).toBe(false);
  });

  test('importing the same file twice is idempotent', () => {
    const once = runImport(dbWith({}), [good], '2026-10-13');
    const twice = runImport(once.db, [good], '2026-10-13');
    expect(twice.db.students).toHaveLength(1);
    expect(twice.run.results[0].outcome).toBe('UPDATED');
  });

  test('empty file produces an empty run', () => {
    expect(runImport(dbWith({}), [], '2026-10-13').run.results).toEqual([]);
  });
});
