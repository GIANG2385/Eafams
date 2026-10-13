import { getDb, setDb } from '../mock-db/store';

export type ServiceErrorCode =
  | 'SERVICE_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'SINGPASS_VALIDATION_FAILED'
  | 'SOURCE_DENIED'
  | 'CONFLICT';

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ServiceError';
  }
}

const DELAY_MS = { off: 0, normal: 250, slow: 1500 } as const;

/** Every service goes through here: simulated latency, then the one-shot failure switch. */
export async function call<T>(fn: () => T): Promise<T> {
  const ms = DELAY_MS[getDb().settings.latency];
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  const db = getDb();
  if (db.settings.failNext) {
    setDb({ ...db, settings: { ...db.settings, failNext: false } });
    throw new ServiceError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable. Please try again.');
  }
  return fn();
}
