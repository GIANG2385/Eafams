import type { Db, Settings } from './types';

export const DB_VERSION = 2;

export function defaultSettings(): Settings {
  return {
    today: '2026-10-13',
    gatewayMode: 'ASK',
    timeoutResolution: 'SUCCEEDED',
    singpass: 'OK',
    source: 'OK',
    cpf: 'OK',
    latency: 'off',
    failNext: false,
  };
}

export function emptyDb(): Db {
  return {
    version: DB_VERSION,
    seq: 0,
    settings: defaultSettings(),
    schools: [],
    schoolUsers: [],
    levels: [],
    classes: [],
    students: [],
    guardians: [],
    links: [],
    accounts: [],
    ledger: [],
    cpfTransfers: [],
    feeTypes: [],
    feeComponents: [],
    feeTypeComponents: [],
    batches: [],
    charges: [],
    payments: [],
    profileChanges: [],
    runs: [],
  };
}
