import { DB_VERSION } from '../domain/emptyDb';
import { createSeed } from './seed';
import { forgetCacheForTests, getDb, resetDb, setDb, subscribe } from './store';

const KEY = 'edufarm.mockdb.v1';

beforeEach(() => {
  localStorage.clear();
  forgetCacheForTests();
});
afterEach(() => vi.restoreAllMocks());

test('boots from seed when storage is empty', () => {
  expect(getDb().students.length).toBeGreaterThan(0);
});

test('corrupt JSON falls back to seed', () => {
  localStorage.setItem(KEY, '{not json');
  expect(getDb().schools).toHaveLength(3);
});

test('wrong version or missing arrays falls back to seed', () => {
  localStorage.setItem(KEY, JSON.stringify({ ...createSeed(), version: 999 }));
  expect(getDb().version).toBe(DB_VERSION);
  localStorage.setItem(KEY, JSON.stringify({ version: DB_VERSION, students: 'oops' }));
  forgetCacheForTests();
  expect(Array.isArray(getDb().students)).toBe(true);
});

test('blocked storage does not crash reads or writes', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(() => getDb()).not.toThrow();
  expect(() => setDb({ ...getDb(), seq: 5 })).not.toThrow();
  expect(getDb().seq).toBe(5);
});

test('setDb persists, notifies subscribers, and resetDb restores the seed', () => {
  const fn = vi.fn();
  const off = subscribe(fn);
  setDb({ ...getDb(), seq: 42 });
  expect(fn).toHaveBeenCalledTimes(1);
  forgetCacheForTests();
  expect(getDb().seq).toBe(42);
  resetDb();
  expect(getDb().seq).toBe(createSeed().seq);
  off();
  setDb({ ...getDb(), seq: 1 });
  expect(fn).toHaveBeenCalledTimes(2);
});
