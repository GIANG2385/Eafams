import type { Db } from './types';

export function nextId(db: Db, prefix: string): { db: Db; id: string } {
  const seq = db.seq + 1;
  return { db: { ...db, seq }, id: `${prefix}-${seq}` };
}
