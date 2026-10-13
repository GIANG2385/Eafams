import { can, canParentAccess, visibleSchools, visibleStudents } from './permissions';
import type { Actor, Action, Entity } from './permissions';
import { dbWith, mkStudent } from './testing';

const hq: Actor = { kind: 'HQ' };
const school: Actor = { kind: 'SCHOOL', schoolId: 'sch-1' };
const parent: Actor = { kind: 'PARENT', guardianId: 'g-1' };
const ACTIONS: Action[] = ['VIEW', 'CREATE', 'UPDATE', 'DEACTIVATE'];

test('HQ can do everything', () => {
  for (const e of ['SCHOOL', 'LEVEL', 'CLASS', 'STUDENT', 'FEE_TYPE', 'FEE_COMPONENT', 'FEE_BATCH'] as Entity[]) {
    for (const a of ACTIONS) expect(can(hq, a, e)).toBe(true);
  }
});

test('School user: school record is read-only and only their own', () => {
  expect(can(school, 'VIEW', 'SCHOOL', 'sch-1')).toBe(true);
  expect(can(school, 'UPDATE', 'SCHOOL', 'sch-1')).toBe(false);
  expect(can(school, 'CREATE', 'SCHOOL', 'sch-1')).toBe(false);
  expect(can(school, 'VIEW', 'SCHOOL', 'sch-2')).toBe(false);
});

test('School user: level, class, student, batch within own school only', () => {
  for (const e of ['LEVEL', 'CLASS', 'STUDENT', 'FEE_BATCH'] as Entity[]) {
    for (const a of ACTIONS) {
      expect(can(school, a, e, 'sch-1')).toBe(true);
      expect(can(school, a, e, 'sch-2')).toBe(false);
      expect(can(school, a, e)).toBe(false);
    }
  }
});

test('School user: fee types and components are read-only (A-7)', () => {
  for (const e of ['FEE_TYPE', 'FEE_COMPONENT'] as Entity[]) {
    expect(can(school, 'VIEW', e)).toBe(true);
    expect(can(school, 'CREATE', e)).toBe(false);
    expect(can(school, 'UPDATE', e)).toBe(false);
  }
});

test('Parent has no admin permissions', () => {
  expect(can(parent, 'VIEW', 'STUDENT', 'sch-1')).toBe(false);
});

const db = dbWith({
  schools: [
    { id: 'sch-1', code: 'S1', name: 'One', status: 'ACTIVE' },
    { id: 'sch-2', code: 'S2', name: 'Two', status: 'ACTIVE' },
  ],
  levels: [
    { id: 'lv-1', schoolId: 'sch-1', name: 'P1', status: 'ACTIVE' },
    { id: 'lv-2', schoolId: 'sch-2', name: 'S3', status: 'ACTIVE' },
  ],
  classes: [
    { id: 'cl-1', levelId: 'lv-1', name: 'A', academicYear: '2026', status: 'ACTIVE' },
    { id: 'cl-2', levelId: 'lv-2', name: 'B', academicYear: '2026', status: 'ACTIVE' },
  ],
  students: [
    mkStudent({ personId: 'a', classId: 'cl-1' }),
    mkStudent({ personId: 'b', classId: 'cl-2' }),
    mkStudent({ personId: 'c', classId: null }),
  ],
  links: [{ guardianId: 'g-1', personId: 'a' }],
});

test('visibleStudents and visibleSchools are scoped', () => {
  expect(visibleStudents(db, hq).map((s) => s.personId)).toEqual(['a', 'b', 'c']);
  expect(visibleStudents(db, school).map((s) => s.personId)).toEqual(['a']);
  expect(visibleStudents(db, parent)).toEqual([]);
  expect(visibleSchools(db, school).map((s) => s.id)).toEqual(['sch-1']);
  expect(visibleSchools(db, hq)).toHaveLength(2);
});

test('parent access is limited to linked children (IDOR)', () => {
  expect(canParentAccess(db, 'g-1', 'a')).toBe(true);
  expect(canParentAccess(db, 'g-1', 'b')).toBe(false);
  expect(canParentAccess(db, 'g-2', 'a')).toBe(false);
  expect(canParentAccess(db, 'g-1', 'does-not-exist')).toBe(false);
});
