import type { Db } from './types';

export function schoolIdOfClass(db: Db, classId: string | null): string | undefined {
  if (!classId) return undefined;
  const cls = db.classes.find((c) => c.id === classId);
  return cls ? db.levels.find((l) => l.id === cls.levelId)?.schoolId : undefined;
}

export function schoolIdOfStudent(db: Db, personId: string): string | undefined {
  const s = db.students.find((x) => x.personId === personId);
  return s ? schoolIdOfClass(db, s.classId) : undefined;
}
