import { isValidIso } from './date';
import { nextId } from './ids';
import type { Citizenship, Db, IsoDate, JobResult, JobRun, Student } from './types';

export interface SourceRecord {
  personId?: string;
  name?: string;
  dob?: string;
  citizenship?: string;
  address?: string;
}
export type RejectReason =
  | 'MISSING_PERSON_ID'
  | 'MISSING_NAME'
  | 'MISSING_DOB'
  | 'INVALID_DOB'
  | 'INVALID_CITIZENSHIP';

const CITIZENSHIPS: Citizenship[] = ['SC', 'PR', 'FOREIGN'];

export function validateSourceRecord(
  rec: SourceRecord,
): { ok: true; student: Student } | { ok: false; reasons: RejectReason[] } {
  const reasons: RejectReason[] = [];
  const personId = (rec.personId ?? '').trim();
  const name = (rec.name ?? '').trim();
  const dob = (rec.dob ?? '').trim();
  const citizenship = (rec.citizenship ?? '').trim().toUpperCase();
  if (!personId) reasons.push('MISSING_PERSON_ID');
  if (!name) reasons.push('MISSING_NAME');
  if (!dob) {
    if (rec.dob === undefined) reasons.push('MISSING_DOB');
    else reasons.push('INVALID_DOB');
  } else if (!isValidIso(dob)) reasons.push('INVALID_DOB');
  if (!CITIZENSHIPS.includes(citizenship as Citizenship)) reasons.push('INVALID_CITIZENSHIP');
  if (reasons.length > 0) return { ok: false, reasons };
  return {
    ok: true,
    student: {
      personId,
      name,
      dob,
      citizenship: citizenship as Citizenship,
      address: (rec.address ?? '').trim(),
      classId: null,
      enrolmentStatus: 'ENROLLED',
    },
  };
}

/** PB-04: upsert by personId; class and enrolment are school-owned and survive a refresh. */
export function runImport(db: Db, records: SourceRecord[], asOf: IsoDate): { db: Db; run: JobRun } {
  let students = db.students;
  const results: JobResult[] = [];
  for (const rec of records) {
    const v = validateSourceRecord(rec);
    if (!v.ok) {
      results.push({ personId: rec.personId?.trim() || null, label: rec.name?.trim() || '(no name)', outcome: 'REJECTED', reason: v.reasons.join(', ') });
      continue;
    }
    const s = v.student;
    const existing = students.find((x) => x.personId === s.personId);
    if (existing) {
      students = students.map((x) =>
        x.personId === s.personId ? { ...x, name: s.name, dob: s.dob, citizenship: s.citizenship, address: s.address } : x,
      );
      results.push({ personId: s.personId, label: s.name, outcome: 'UPDATED' });
    } else {
      students = [...students, s];
      results.push({ personId: s.personId, label: s.name, outcome: 'CREATED' });
    }
  }
  const r = nextId({ ...db, students }, 'run');
  const run: JobRun = { id: r.id, kind: 'IMPORT', asOf, results };
  return { db: { ...r.db, runs: [...r.db.runs, run] }, run };
}
