import { nextId } from './ids';
import type { Db } from './types';

test('nextId increments seq and does not mutate input', () => {
  const db = { seq: 7 } as Db;
  const out = nextId(db, 'chg');
  expect(out.id).toBe('chg-8');
  expect(out.db.seq).toBe(8);
  expect(db.seq).toBe(7);
});
