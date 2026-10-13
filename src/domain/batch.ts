import { chargeTotal, componentsOfFeeType, computeLines } from './fees';
import { nextId } from './ids';
import { schoolIdOfClass } from './structure';
import type { BatchTarget, Cents, ChargeLine, Db, FeeBatch, IsoDate, Student } from './types';

export interface ChargePreview {
  personId: string;
  name: string;
  lines: ChargeLine[];
  subsidyCents: Cents;
  totalCents: Cents;
}
export type PublishError = 'NOT_FOUND' | 'FEE_TYPE_INACTIVE' | 'NO_COMPONENTS' | 'EMPTY_TARGET';

export function resolveTargets(db: Db, batch: Pick<FeeBatch, 'schoolId' | 'target'>): Student[] {
  const { target } = batch;
  return db.students.filter((s) => {
    if (s.enrolmentStatus !== 'ENROLLED' || !s.classId) return false;
    if (schoolIdOfClass(db, s.classId) !== batch.schoolId) return false;
    if (target.kind === 'STUDENTS') return target.ids.includes(s.personId);
    if (target.kind === 'CLASS') return target.ids.includes(s.classId);
    const levelId = db.classes.find((c) => c.id === s.classId)?.levelId;
    return levelId !== undefined && target.ids.includes(levelId);
  });
}

export function previewBatch(
  db: Db,
  batch: Pick<FeeBatch, 'schoolId' | 'feeTypeId' | 'target'>,
  asOf: IsoDate,
): ChargePreview[] {
  const lines = computeLines(componentsOfFeeType(db, batch.feeTypeId), asOf);
  return resolveTargets(db, batch).map((s) => ({
    personId: s.personId,
    name: s.name,
    lines,
    subsidyCents: 0,
    totalCents: chargeTotal(lines, 0),
  }));
}

export function createBatchDraft(
  db: Db,
  input: { schoolId: string; feeTypeId: string; target: BatchTarget; dueOn: IsoDate },
): { db: Db; batch: FeeBatch } {
  const r = nextId(db, 'batch');
  const batch: FeeBatch = { id: r.id, ...input, status: 'DRAFT', publishedAt: null };
  return { db: { ...r.db, batches: [...r.db.batches, batch] }, batch };
}

/** R-FEE-3: DRAFT -> PUBLISHED generates charges once; republishing is a no-op. */
export function publishBatch(
  db: Db,
  batchId: string,
  asOf: IsoDate,
): { db: Db; created: number; alreadyPublished: boolean; error?: PublishError } {
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) return { db, created: 0, alreadyPublished: false, error: 'NOT_FOUND' };
  if (batch.status === 'PUBLISHED') return { db, created: 0, alreadyPublished: true };
  const feeType = db.feeTypes.find((f) => f.id === batch.feeTypeId);
  if (!feeType || feeType.status !== 'ACTIVE') return { db, created: 0, alreadyPublished: false, error: 'FEE_TYPE_INACTIVE' };
  const lines = computeLines(componentsOfFeeType(db, batch.feeTypeId), asOf);
  if (lines.length === 0) return { db, created: 0, alreadyPublished: false, error: 'NO_COMPONENTS' };
  const targets = resolveTargets(db, batch);
  if (targets.length === 0) return { db, created: 0, alreadyPublished: false, error: 'EMPTY_TARGET' };
  let cur = db;
  for (const s of targets) {
    const r = nextId(cur, 'chg');
    cur = {
      ...r.db,
      charges: [
        ...r.db.charges,
        {
          id: r.id,
          personId: s.personId,
          batchId: batch.id,
          feeTypeId: feeType.id,
          feeTypeName: feeType.name,
          lines,
          subsidyCents: 0,
          totalCents: chargeTotal(lines, 0),
          dueOn: batch.dueOn,
          status: 'OUTSTANDING',
        },
      ],
    };
  }
  cur = { ...cur, batches: cur.batches.map((b) => (b.id === batch.id ? { ...b, status: 'PUBLISHED', publishedAt: asOf } : b)) };
  return { db: cur, created: targets.length, alreadyPublished: false };
}
