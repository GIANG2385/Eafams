import { DB_VERSION, defaultSettings } from '../domain/emptyDb';
import type { Db } from '../domain/types';
import { createSeed } from './seed';

const KEY = 'edufarm.mockdb.v1';
const ARRAYS: (keyof Db)[] = [
  'schools', 'schoolUsers', 'levels', 'classes', 'students', 'guardians', 'links', 'accounts', 'ledger', 'cpfTransfers',
  'feeTypes', 'feeComponents', 'feeTypeComponents', 'batches', 'charges', 'payments', 'profileChanges', 'runs',
];

let current: Db | null = null;
const listeners = new Set<() => void>();

function isDb(x: unknown): x is Db {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.version !== DB_VERSION || typeof o.seq !== 'number' || !o.settings || typeof o.settings !== 'object') return false;
  const settings = o.settings as Record<string, unknown>;
  const sound = Object.entries(defaultSettings()).every(([k, v]) => typeof settings[k] === typeof v);
  return sound && ARRAYS.every((k) => Array.isArray(o[k]));
}

function load(): Db {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isDb(parsed)) return parsed;
    }
  } catch {
    /* storage blocked or corrupt: fall through to seed */
  }
  return createSeed();
}

function persist(db: Db): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* in-memory only */
  }
}

export function getDb(): Db {
  if (!current) current = load();
  return current;
}

export function setDb(next: Db): void {
  current = next;
  persist(next);
  listeners.forEach((fn) => fn());
}

export function resetDb(): void {
  setDb(createSeed());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function forgetCacheForTests(): void {
  current = null;
}
