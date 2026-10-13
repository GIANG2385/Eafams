import { runImport, validateSourceRecord } from '../domain/importer';
import type { RejectReason, SourceRecord } from '../domain/importer';
import { isValidIso } from '../domain/date';
import { accountOf, assessEaEligibility, balanceOf, runEaClosure, runEaCreation } from '../domain/ea';
import type { SkipReason } from '../domain/ea';
import { visibleStudents } from '../domain/permissions';
import type { Actor } from '../domain/permissions';
import type { AccountStatus, Cents, Citizenship, IsoDate, JobRun } from '../domain/types';
import { SOURCE_FIXTURE } from '../mock-db/seed';
import { getDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

export function requireHq(actor: Actor, what: string): void {
  if (actor.kind !== 'HQ') throw new ServiceError('FORBIDDEN', `Only HQ can ${what}.`);
}

function readSource(): SourceRecord[] {
  if (getDb().settings.source === 'DENIED') {
    throw new ServiceError('SOURCE_DENIED', 'The student data source denied access (permission check failed). Nothing was imported.');
  }
  return SOURCE_FIXTURE;
}

export interface SourcePreviewRow {
  record: SourceRecord;
  ok: boolean;
  reasons: RejectReason[];
  existing: boolean;
}

export function previewSource(actor: Actor): Promise<SourcePreviewRow[]> {
  return call(() => {
    requireHq(actor, 'import student data');
    const records = readSource();
    const db = getDb();
    return records.map((record) => {
      const v = validateSourceRecord(record);
      return {
        record,
        ok: v.ok,
        reasons: v.ok ? [] : v.reasons,
        existing: !!record.personId && db.students.some((s) => s.personId === record.personId?.trim()),
      };
    });
  });
}

export function runImportJob(actor: Actor): Promise<JobRun> {
  return call(() => {
    requireHq(actor, 'import student data');
    const records = readSource();
    const db = getDb();
    const out = runImport(db, records, db.settings.today);
    setDb(out.db);
    return out.run;
  });
}

export interface EaOverviewRow {
  personId: string;
  name: string;
  dob: string | null;
  citizenship: Citizenship | null;
  verdict: 'ELIGIBLE' | SkipReason;
  accountStatus: AccountStatus | null;
  balanceCents: Cents | null;
}

function asOfOrToday(asOf: IsoDate | undefined): IsoDate {
  const date = asOf?.trim() || getDb().settings.today;
  if (!isValidIso(date)) throw new ServiceError('VALIDATION', 'Enter a valid as-of date (YYYY-MM-DD).');
  return date;
}

export function listEaOverview(actor: Actor, asOf?: IsoDate): Promise<EaOverviewRow[]> {
  return call(() => {
    const db = getDb();
    const date = asOfOrToday(asOf);
    return visibleStudents(db, actor).map((s) => {
      const acc = accountOf(db, s.personId);
      const v = assessEaEligibility(s, !!acc, date);
      return {
        personId: s.personId,
        name: s.name,
        dob: s.dob,
        citizenship: s.citizenship,
        verdict: v.eligible ? ('ELIGIBLE' as const) : v.reason,
        accountStatus: acc ? acc.status : null,
        balanceCents: acc ? balanceOf(db, acc.id) : null,
      };
    });
  });
}

export function runCreationJob(actor: Actor, asOf?: IsoDate): Promise<JobRun> {
  return call(() => {
    requireHq(actor, 'run the account creation job');
    const date = asOfOrToday(asOf);
    const out = runEaCreation(getDb(), date);
    setDb(out.db);
    return out.run;
  });
}

export function runClosureJob(actor: Actor, asOf?: IsoDate): Promise<JobRun> {
  return call(() => {
    requireHq(actor, 'run the account closure job');
    const date = asOfOrToday(asOf);
    const db = getDb();
    const out = runEaClosure(db, date, db.settings.cpf);
    setDb(out.db);
    return out.run;
  });
}

export function listRuns(actor: Actor): Promise<JobRun[]> {
  return call(() => {
    requireHq(actor, 'see job history');
    const seq = (id: string) => Number(id.split('-')[1]) || 0;
    return [...getDb().runs].sort((a, b) => seq(b.id) - seq(a.id));
  });
}
