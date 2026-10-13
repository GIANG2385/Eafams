import type { Actor } from '../domain/permissions';
import { getDb, resetDb } from '../mock-db/store';
import { listSchools, listStructure, listStudents, saveClass, saveLevel, saveSchool, saveStudent, setStatus } from './admin';

beforeEach(() => resetDb());
const hq: Actor = { kind: 'HQ' };
const sunrise: Actor = { kind: 'SCHOOL', schoolId: 'sch-01' };

describe('schools', () => {
  test('HQ creates and edits; code must be unique', async () => {
    const s = await saveSchool(hq, { code: 'SCH-09', name: 'New School' });
    expect(s).toMatchObject({ code: 'SCH-09', status: 'ACTIVE' });
    await saveSchool(hq, { id: s.id, code: 'SCH-09', name: 'Renamed' });
    expect(getDb().schools.find((x) => x.id === s.id)!.name).toBe('Renamed');
    await expect(saveSchool(hq, { code: 'sch-09', name: 'Dup' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(saveSchool(hq, { code: '', name: 'x' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('School user sees only their school and cannot edit it or create another', async () => {
    expect((await listSchools(sunrise)).map((s) => s.id)).toEqual(['sch-01']);
    await expect(saveSchool(sunrise, { id: 'sch-01', code: 'SCH-01', name: 'Hacked' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveSchool(sunrise, { code: 'SCH-77', name: 'Mine' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(getDb().schools.find((s) => s.id === 'sch-01')!.name).toBe('Sunrise Primary');
  });

  test('deactivate keeps the record', async () => {
    await setStatus(hq, 'SCHOOL', 'sch-03', 'INACTIVE');
    expect(getDb().schools.find((s) => s.id === 'sch-03')!.status).toBe('INACTIVE');
    await expect(setStatus(sunrise, 'SCHOOL', 'sch-01', 'INACTIVE')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('levels and classes', () => {
  test('School user manages their own level and class but not another school’s', async () => {
    const lv = await saveLevel(sunrise, { schoolId: 'sch-01', name: 'Primary 6' });
    const cl = await saveClass(sunrise, { levelId: lv.id, name: '6A', academicYear: '2026' });
    expect(cl.levelId).toBe(lv.id);
    await expect(saveLevel(sunrise, { schoolId: 'sch-02', name: 'Sneaky' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveClass(sunrise, { levelId: 'lv-04', name: 'X', academicYear: '2026' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveLevel(sunrise, { id: 'lv-04', schoolId: 'sch-01', name: 'Moved' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('listStructure is scoped', async () => {
    const s = await listStructure(sunrise);
    expect(s.schools.map((x) => x.id)).toEqual(['sch-01']);
    expect(s.levels.every((l) => l.schoolId === 'sch-01')).toBe(true);
    expect(s.classes.every((c) => s.levels.some((l) => l.id === c.levelId))).toBe(true);
  });

  test('blank names are rejected', async () => {
    await expect(saveLevel(hq, { schoolId: 'sch-01', name: ' ' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('students', () => {
  const base = { name: 'New Kid', dob: '2018-05-05', citizenship: 'SC', address: '1 Test St', enrolmentStatus: 'ENROLLED' as const };

  test('School user sees only students of their school; unassigned ones are HQ-only', async () => {
    const ids = (await listStudents(sunrise)).map((s) => s.personId).sort();
    expect(ids).toEqual(['st-01', 'st-02', 'st-04']);
    const created = await saveStudent(hq, { ...base, classId: null });
    expect((await listStudents(sunrise)).some((s) => s.personId === created.personId)).toBe(false);
    expect((await listStudents(hq)).some((s) => s.personId === created.personId)).toBe(true);
  });

  test('School user can add into own class, cannot add into another school or without a class', async () => {
    const ok = await saveStudent(sunrise, { ...base, classId: 'cl-02' });
    expect(ok.personId).toMatch(/^stu-/);
    await expect(saveStudent(sunrise, { ...base, classId: 'cl-04' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveStudent(sunrise, { ...base, classId: null })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('School user cannot edit or move another school’s student', async () => {
    await expect(saveStudent(sunrise, { ...base, personId: 'st-03', classId: 'cl-04' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(saveStudent(sunrise, { ...base, personId: 'st-01', classId: 'cl-04' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('validation: name, DOB format, citizenship', async () => {
    await expect(saveStudent(hq, { ...base, name: ' ', classId: 'cl-02' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(saveStudent(hq, { ...base, dob: '05/05/2018', classId: 'cl-02' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(saveStudent(hq, { ...base, citizenship: 'XX', classId: 'cl-02' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('enrolment status changes never touch the Education Account', async () => {
    const before = getDb().accounts.find((a) => a.personId === 'st-01');
    await saveStudent(hq, { ...base, personId: 'st-01', name: 'Aiden Tan', dob: '2019-03-10', classId: 'cl-02', enrolmentStatus: 'LEFT' });
    expect(getDb().accounts.find((a) => a.personId === 'st-01')).toEqual(before);
    const row = (await listStudents(hq)).find((s) => s.personId === 'st-01')!;
    expect(row.enrolmentStatus).toBe('LEFT');
    expect(row.accountStatus).toBe('ACTIVE');
  });
});
