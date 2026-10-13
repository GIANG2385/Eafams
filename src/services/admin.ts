import { isValidIso } from '../domain/date';
import { accountOf } from '../domain/ea';
import { nextId } from '../domain/ids';
import { can, visibleSchools, visibleStudents } from '../domain/permissions';
import type { Actor } from '../domain/permissions';
import { schoolIdOfClass, schoolIdOfStudent } from '../domain/structure';
import type {
  AccountStatus, Citizenship, EnrolmentStatus, EntityStatus, Level, School, SchoolClass, SchoolUser, Student,
} from '../domain/types';
import { getDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

function need(ok: boolean, what: string): void {
  if (!ok) throw new ServiceError('FORBIDDEN', `You do not have permission to ${what}.`);
}
function invalid(message: string): never {
  throw new ServiceError('VALIDATION', message);
}

export function listSchools(actor: Actor): Promise<School[]> {
  return call(() => visibleSchools(getDb(), actor));
}

export function saveSchool(actor: Actor, input: { id?: string; code: string; name: string }): Promise<School> {
  return call(() => {
    const db = getDb();
    need(can(actor, input.id ? 'UPDATE' : 'CREATE', 'SCHOOL', input.id), input.id ? 'edit schools' : 'add schools');
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) invalid('School code and name are required.');
    if (db.schools.some((s) => s.code.toLowerCase() === code.toLowerCase() && s.id !== input.id)) invalid('School code already exists.');
    if (input.id) {
      const existing = db.schools.find((s) => s.id === input.id);
      if (!existing) throw new ServiceError('NOT_FOUND', 'School not found.');
      const next = { ...existing, code, name };
      setDb({ ...db, schools: db.schools.map((s) => (s.id === next.id ? next : s)) });
      return next;
    }
    const r = nextId(db, 'sch');
    const school: School = { id: r.id, code, name, status: 'ACTIVE' };
    setDb({ ...r.db, schools: [...r.db.schools, school] });
    return school;
  });
}

export function listSchoolUsers(actor: Actor): Promise<SchoolUser[]> {
  return call(() => {
    const db = getDb();
    if (actor.kind === 'HQ') return db.schoolUsers;
    if (actor.kind === 'SCHOOL') return db.schoolUsers.filter((u) => u.schoolId === actor.schoolId);
    return [];
  });
}

/** HQ assigns a (mock) School user to a school; the user then appears in the role switcher. */
export function assignSchoolUser(actor: Actor, input: { name: string; schoolId: string }): Promise<SchoolUser> {
  return call(() => {
    const db = getDb();
    need(can(actor, 'UPDATE', 'SCHOOL', input.schoolId), 'assign school users');
    const name = input.name.trim();
    if (!name) invalid('User name is required.');
    if (!db.schools.some((s) => s.id === input.schoolId)) throw new ServiceError('NOT_FOUND', 'School not found.');
    const r = nextId(db, 'school-user');
    const user: SchoolUser = { id: r.id, name, schoolId: input.schoolId };
    setDb({ ...r.db, schoolUsers: [...r.db.schoolUsers, user] });
    return user;
  });
}

/** R-DATA-1: records are deactivated, never deleted. */
export function setStatus(actor: Actor, entity: 'SCHOOL' | 'LEVEL' | 'CLASS', id: string, status: EntityStatus): Promise<void> {
  return call(() => {
    const db = getDb();
    let schoolId: string | undefined;
    if (entity === 'SCHOOL') schoolId = id;
    else if (entity === 'LEVEL') schoolId = db.levels.find((l) => l.id === id)?.schoolId;
    else schoolId = schoolIdOfClass(db, id);
    need(can(actor, 'DEACTIVATE', entity, schoolId), 'change this record');
    if (entity === 'SCHOOL') setDb({ ...db, schools: db.schools.map((x) => (x.id === id ? { ...x, status } : x)) });
    else if (entity === 'LEVEL') setDb({ ...db, levels: db.levels.map((x) => (x.id === id ? { ...x, status } : x)) });
    else setDb({ ...db, classes: db.classes.map((x) => (x.id === id ? { ...x, status } : x)) });
  });
}

export function listStructure(actor: Actor): Promise<{ schools: School[]; levels: Level[]; classes: SchoolClass[] }> {
  return call(() => {
    const db = getDb();
    const schools = visibleSchools(db, actor);
    const ids = new Set(schools.map((s) => s.id));
    const levels = db.levels.filter((l) => ids.has(l.schoolId));
    const lv = new Set(levels.map((l) => l.id));
    return { schools, levels, classes: db.classes.filter((c) => lv.has(c.levelId)) };
  });
}

export function saveLevel(actor: Actor, input: { id?: string; schoolId: string; name: string }): Promise<Level> {
  return call(() => {
    const db = getDb();
    const existing = input.id ? db.levels.find((l) => l.id === input.id) : undefined;
    if (input.id && !existing) throw new ServiceError('NOT_FOUND', 'Level not found.');
    const schoolId = existing ? existing.schoolId : input.schoolId; // never trust a client-supplied school on update
    need(can(actor, input.id ? 'UPDATE' : 'CREATE', 'LEVEL', schoolId), 'manage levels of this school');
    const name = input.name.trim();
    if (!name) invalid('Level name is required.');
    if (existing) {
      const next = { ...existing, name };
      setDb({ ...db, levels: db.levels.map((l) => (l.id === next.id ? next : l)) });
      return next;
    }
    if (!db.schools.some((s) => s.id === schoolId)) throw new ServiceError('NOT_FOUND', 'School not found.');
    const r = nextId(db, 'lv');
    const level: Level = { id: r.id, schoolId, name, status: 'ACTIVE' };
    setDb({ ...r.db, levels: [...r.db.levels, level] });
    return level;
  });
}

export function saveClass(
  actor: Actor,
  input: { id?: string; levelId: string; name: string; academicYear: string },
): Promise<SchoolClass> {
  return call(() => {
    const db = getDb();
    const existing = input.id ? db.classes.find((c) => c.id === input.id) : undefined;
    if (input.id && !existing) throw new ServiceError('NOT_FOUND', 'Class not found.');
    const levelId = existing ? existing.levelId : input.levelId;
    const level = db.levels.find((l) => l.id === levelId);
    if (!level) throw new ServiceError('NOT_FOUND', 'Level not found.');
    need(can(actor, input.id ? 'UPDATE' : 'CREATE', 'CLASS', level.schoolId), 'manage classes of this school');
    const name = input.name.trim();
    const academicYear = input.academicYear.trim();
    if (!name || !academicYear) invalid('Class name and academic year are required.');
    if (existing) {
      const next = { ...existing, name, academicYear };
      setDb({ ...db, classes: db.classes.map((c) => (c.id === next.id ? next : c)) });
      return next;
    }
    const r = nextId(db, 'cl');
    const cls: SchoolClass = { id: r.id, levelId, name, academicYear, status: 'ACTIVE' };
    setDb({ ...r.db, classes: [...r.db.classes, cls] });
    return cls;
  });
}

export interface StudentRow extends Student {
  schoolName: string;
  className: string;
  accountStatus: AccountStatus | null;
}

export function listStudents(actor: Actor): Promise<StudentRow[]> {
  return call(() => {
    const db = getDb();
    return visibleStudents(db, actor).map((s) => ({
      ...s,
      schoolName: db.schools.find((x) => x.id === schoolIdOfStudent(db, s.personId))?.name ?? '—',
      className: db.classes.find((c) => c.id === s.classId)?.name ?? '—',
      accountStatus: accountOf(db, s.personId)?.status ?? null,
    }));
  });
}

export interface StudentInput {
  personId?: string;
  name: string;
  dob: string;
  citizenship: string;
  address: string;
  classId: string | null;
  enrolmentStatus: EnrolmentStatus;
}

const CITIZENSHIPS: Citizenship[] = ['SC', 'PR', 'FOREIGN'];

export function saveStudent(actor: Actor, input: StudentInput): Promise<Student> {
  return call(() => {
    const db = getDb();
    const existing = input.personId ? db.students.find((s) => s.personId === input.personId) : undefined;
    if (input.personId && !existing) throw new ServiceError('NOT_FOUND', 'Student not found.');
    const targetSchool = schoolIdOfClass(db, input.classId);
    if (existing) {
      need(can(actor, 'UPDATE', 'STUDENT', schoolIdOfStudent(db, existing.personId)), 'edit this student');
      if (input.classId !== existing.classId) need(can(actor, 'UPDATE', 'STUDENT', targetSchool), 'move a student into that class');
    } else {
      need(can(actor, 'CREATE', 'STUDENT', targetSchool), 'add students to that class');
    }
    const name = input.name.trim();
    const dob = input.dob.trim();
    const citizenship = input.citizenship.trim().toUpperCase();
    if (!name) invalid('Student name is required.');
    if (!isValidIso(dob)) invalid('Enter a valid date of birth (YYYY-MM-DD).');
    if (!CITIZENSHIPS.includes(citizenship as Citizenship)) invalid('Choose a citizenship.');
    const fields = { name, dob, citizenship: citizenship as Citizenship, address: input.address.trim(), classId: input.classId, enrolmentStatus: input.enrolmentStatus };
    if (existing) {
      const next: Student = { ...existing, ...fields };
      setDb({ ...db, students: db.students.map((s) => (s.personId === next.personId ? next : s)) });
      return next;
    }
    const r = nextId(db, 'stu');
    const student: Student = { personId: r.id, ...fields };
    setDb({ ...r.db, students: [...r.db.students, student] });
    return student;
  });
}
