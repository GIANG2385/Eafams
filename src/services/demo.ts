import { isValidIso } from '../domain/date';
import { accountOf } from '../domain/ea';
import { nextId } from '../domain/ids';
import type { Cents, IsoDate, Settings } from '../domain/types';
import { getDb, resetDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

export { subscribe as onDataChange } from '../mock-db/store';

/** Synchronous read for views that must react to a demo-control change immediately. */
export function currentGatewayMode(): Settings['gatewayMode'] {
  return getDb().settings.gatewayMode;
}

export function getSettings(): Promise<Settings> {
  return call(() => getDb().settings);
}

export function updateSettings(patch: Partial<Settings>): Promise<void> {
  return call(() => {
    const db = getDb();
    setDb({ ...db, settings: { ...db.settings, ...patch } });
  });
}

export function reset(): Promise<void> {
  return call(() => resetDb());
}

export function setToday(date: IsoDate): Promise<void> {
  return call(() => {
    if (!isValidIso(date)) throw new ServiceError('VALIDATION', 'Enter a valid date (YYYY-MM-DD)');
    const db = getDb();
    setDb({ ...db, settings: { ...db.settings, today: date } });
  });
}

/** Demo-only helper, not the R2 top-up feature. */
export function grantDemoFunds(personId: string, cents: Cents): Promise<void> {
  return call(() => {
    if (!Number.isInteger(cents) || cents <= 0) throw new ServiceError('VALIDATION', 'Amount must be positive');
    const db = getDb();
    const acc = accountOf(db, personId);
    if (!acc) throw new ServiceError('NOT_FOUND', 'No Education Account for this student');
    if (acc.status !== 'ACTIVE') throw new ServiceError('VALIDATION', 'This Education Account is closed.');
    const l = nextId(db, 'led');
    setDb({
      ...l.db,
      ledger: [
        ...l.db.ledger,
        { id: l.id, accountId: acc.id, type: 'DEMO_FUNDS', amountCents: cents, postedAt: db.settings.today, ref: 'Demo funds', idempotencyKey: null },
      ],
    });
  });
}
