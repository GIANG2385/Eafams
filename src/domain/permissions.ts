import { schoolIdOfStudent } from './structure';
import type { Db, School, Student } from './types';

export type Actor =
  | { kind: 'HQ' }
  | { kind: 'SCHOOL'; schoolId: string }
  | { kind: 'PARENT'; guardianId: string };
export type Entity = 'SCHOOL' | 'LEVEL' | 'CLASS' | 'STUDENT' | 'FEE_TYPE' | 'FEE_COMPONENT' | 'FEE_BATCH';
export type Action = 'VIEW' | 'CREATE' | 'UPDATE' | 'DEACTIVATE';

/** R-ACC-2 + A-7. `schoolId` is the school that owns the record being touched. */
export function can(actor: Actor, action: Action, entity: Entity, schoolId?: string): boolean {
  if (actor.kind === 'PARENT') return false;
  if (actor.kind === 'HQ') return true;
  switch (entity) {
    case 'SCHOOL':
      return action === 'VIEW' && schoolId === actor.schoolId;
    case 'LEVEL':
    case 'CLASS':
    case 'STUDENT':
    case 'FEE_BATCH':
      return schoolId !== undefined && schoolId === actor.schoolId;
    case 'FEE_TYPE':
    case 'FEE_COMPONENT':
      return action === 'VIEW';
  }
}

/** R-ACC-1: a parent reaches a child only through an explicit link. */
export function canParentAccess(db: Db, guardianId: string, personId: string): boolean {
  return db.links.some((l) => l.guardianId === guardianId && l.personId === personId);
}

export function visibleSchools(db: Db, actor: Actor): School[] {
  if (actor.kind === 'HQ') return db.schools;
  if (actor.kind === 'SCHOOL') return db.schools.filter((s) => s.id === actor.schoolId);
  return [];
}

export function visibleStudents(db: Db, actor: Actor): Student[] {
  if (actor.kind === 'HQ') return db.students;
  if (actor.kind === 'SCHOOL') return db.students.filter((s) => schoolIdOfStudent(db, s.personId) === actor.schoolId);
  return [];
}

export interface AdminPersona {
  id: string;
  label: string;
  actor: Actor;
}

/** The role switcher: HQ plus every assigned School user. Ids are stable so a session survives a reset. */
export function adminPersonas(db: Db): AdminPersona[] {
  return [
    { id: 'hq', label: 'HQ admin', actor: { kind: 'HQ' } },
    ...db.schoolUsers.map((u) => ({
      id: u.id,
      label: `School user – ${u.name} (${db.schools.find((s) => s.id === u.schoolId)?.name ?? 'unknown school'})`,
      actor: { kind: 'SCHOOL', schoolId: u.schoolId } as Actor,
    })),
  ];
}
