import { createBatchDraft, previewBatch, publishBatch } from '../domain/batch';
import type { ChargePreview } from '../domain/batch';
import { isValidIso } from '../domain/date';
import { chargeTotal, componentsOfFeeType, computeLines } from '../domain/fees';
import { nextId } from '../domain/ids';
import { can } from '../domain/permissions';
import type { Actor } from '../domain/permissions';
import type { BatchTarget, Cents, EntityStatus, FeeBatch, FeeComponent, FeeType } from '../domain/types';
import { getDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

const invalid = (m: string): never => {
  throw new ServiceError('VALIDATION', m);
};
function needHq(actor: Actor, action: 'CREATE' | 'UPDATE' | 'DEACTIVATE', entity: 'FEE_TYPE' | 'FEE_COMPONENT'): void {
  if (!can(actor, action, entity)) throw new ServiceError('FORBIDDEN', 'Only HQ can change fee configuration.');
}

export interface FeeTypeView {
  type: FeeType;
  components: FeeComponent[];
  exampleTotalCents: Cents;
}

export function listFeeConfig(actor: Actor): Promise<{ types: FeeTypeView[]; components: FeeComponent[] }> {
  return call(() => {
    if (!can(actor, 'VIEW', 'FEE_TYPE')) throw new ServiceError('FORBIDDEN', 'You cannot view fee configuration.');
    const db = getDb();
    return {
      components: db.feeComponents,
      types: db.feeTypes.map((type) => {
        const components = componentsOfFeeType(db, type.id);
        return { type, components, exampleTotalCents: chargeTotal(computeLines(components, db.settings.today)) };
      }),
    };
  });
}

export interface ComponentInput {
  id?: string;
  code: string;
  name: string;
  calcType: 'FIXED' | 'PERCENT';
  amountCents: number;
  rateBp: number;
  effectiveFrom: string;
  effectiveTo: string;
}

export function saveComponent(actor: Actor, input: ComponentInput): Promise<FeeComponent> {
  return call(() => {
    needHq(actor, input.id ? 'UPDATE' : 'CREATE', 'FEE_COMPONENT');
    const db = getDb();
    const code = input.code.trim();
    const name = input.name.trim();
    const from = input.effectiveFrom.trim();
    const to = input.effectiveTo.trim();
    if (!code || !name) invalid('Code and name are required.');
    if (db.feeComponents.some((c) => c.code.toLowerCase() === code.toLowerCase() && c.id !== input.id)) invalid('Component code already exists.');
    if (!isValidIso(from)) invalid('Enter a valid start date (YYYY-MM-DD).');
    if (to && !isValidIso(to)) invalid('Enter a valid end date (YYYY-MM-DD) or leave it empty.');
    if (to && to < from) invalid('End date cannot be before the start date.');
    if (input.calcType === 'FIXED' && (!Number.isInteger(input.amountCents) || input.amountCents < 0)) invalid('Amount must be zero or more, in whole cents.');
    if (input.calcType === 'PERCENT' && (!Number.isInteger(input.rateBp) || input.rateBp < 0 || input.rateBp > 10000)) invalid('Rate must be between 0% and 100%.');
    const fields = {
      code, name, calcType: input.calcType,
      amountCents: input.calcType === 'FIXED' ? input.amountCents : 0,
      rateBp: input.calcType === 'PERCENT' ? input.rateBp : 0,
      effectiveFrom: from, effectiveTo: to || null,
    };
    if (input.id) {
      const existing = db.feeComponents.find((c) => c.id === input.id);
      if (!existing) throw new ServiceError('NOT_FOUND', 'Component not found.');
      const next: FeeComponent = { ...existing, ...fields };
      setDb({ ...db, feeComponents: db.feeComponents.map((c) => (c.id === next.id ? next : c)) });
      return next;
    }
    const r = nextId(db, 'fc');
    const component: FeeComponent = { id: r.id, ...fields, status: 'ACTIVE' };
    setDb({ ...r.db, feeComponents: [...r.db.feeComponents, component] });
    return component;
  });
}

export interface FeeTypeInput {
  id?: string;
  code: string;
  name: string;
  description: string;
  componentIds: string[];
}

export function saveFeeType(actor: Actor, input: FeeTypeInput): Promise<FeeType> {
  return call(() => {
    needHq(actor, input.id ? 'UPDATE' : 'CREATE', 'FEE_TYPE');
    const db = getDb();
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) invalid('Code and name are required.');
    if (db.feeTypes.some((t) => t.code.toLowerCase() === code.toLowerCase() && t.id !== input.id)) invalid('Fee type code already exists.');
    const ids = Array.from(new Set(input.componentIds));
    if (ids.length === 0) invalid('Choose at least one component.');
    if (ids.some((id) => !db.feeComponents.some((c) => c.id === id))) invalid('One of the chosen components does not exist.');
    let cur = db;
    let type: FeeType;
    if (input.id) {
      const existing = db.feeTypes.find((t) => t.id === input.id);
      if (!existing) throw new ServiceError('NOT_FOUND', 'Fee type not found.');
      type = { ...existing, code, name, description: input.description.trim() };
      cur = { ...cur, feeTypes: cur.feeTypes.map((t) => (t.id === type.id ? type : t)) };
    } else {
      const r = nextId(cur, 'ft');
      type = { id: r.id, code, name, description: input.description.trim(), status: 'ACTIVE' };
      cur = { ...r.db, feeTypes: [...r.db.feeTypes, type] };
    }
    cur = {
      ...cur,
      feeTypeComponents: [
        ...cur.feeTypeComponents.filter((l) => l.feeTypeId !== type.id),
        ...ids.map((componentId, i) => ({ feeTypeId: type.id, componentId, order: i + 1 })),
      ],
    };
    setDb(cur);
    return type;
  });
}

/** R-DATA-1 / R-FEE-2: never delete; already published charges are not rewritten. */
export function setFeeStatus(actor: Actor, kind: 'TYPE' | 'COMPONENT', id: string, status: EntityStatus): Promise<void> {
  return call(() => {
    needHq(actor, 'DEACTIVATE', kind === 'TYPE' ? 'FEE_TYPE' : 'FEE_COMPONENT');
    const db = getDb();
    if (kind === 'TYPE') setDb({ ...db, feeTypes: db.feeTypes.map((t) => (t.id === id ? { ...t, status } : t)) });
    else setDb({ ...db, feeComponents: db.feeComponents.map((c) => (c.id === id ? { ...c, status } : c)) });
  });
}

export interface BatchInput {
  schoolId: string;
  feeTypeId: string;
  target: BatchTarget;
  dueOn: string;
}

function checkBatch(actor: Actor, input: BatchInput): void {
  if (!can(actor, 'CREATE', 'FEE_BATCH', input.schoolId)) {
    throw new ServiceError('FORBIDDEN', 'You can only create fee batches for your own school.');
  }
  if (!getDb().schools.some((s) => s.id === input.schoolId)) throw new ServiceError('NOT_FOUND', 'School not found.');
  if (input.target.ids.length === 0) invalid('Choose at least one class, level or student.');
  if (!isValidIso(input.dueOn)) invalid('Enter a valid due date (YYYY-MM-DD).');
  const type = getDb().feeTypes.find((t) => t.id === input.feeTypeId);
  if (!type || type.status !== 'ACTIVE') invalid('Choose an active fee type.');
}

export function previewFeeBatch(actor: Actor, input: BatchInput): Promise<ChargePreview[]> {
  return call(() => {
    checkBatch(actor, input);
    const db = getDb();
    return previewBatch(db, input, db.settings.today);
  });
}

const sameTarget = (a: BatchTarget, b: BatchTarget) =>
  a.kind === b.kind && [...a.ids].sort().join('|') === [...b.ids].sort().join('|');

/** R-FEE-3: create + publish in one step; an identical published batch is refused to avoid duplicate charges. */
export function publishFeeBatch(actor: Actor, input: BatchInput): Promise<{ batchId: string; created: number }> {
  return call(() => {
    checkBatch(actor, input);
    const db = getDb();
    const dup = db.batches.find(
      (b) =>
        b.status === 'PUBLISHED' && b.schoolId === input.schoolId && b.feeTypeId === input.feeTypeId &&
        b.dueOn === input.dueOn && sameTarget(b.target, input.target),
    );
    if (dup) throw new ServiceError('CONFLICT', 'An identical fee batch has already been published.');
    const draft = createBatchDraft(db, input);
    const out = publishBatch(draft.db, draft.batch.id, db.settings.today);
    if (out.error === 'EMPTY_TARGET') invalid('No enrolled students match this selection.');
    if (out.error) invalid('This batch cannot be published.');
    setDb(out.db);
    return { batchId: draft.batch.id, created: out.created };
  });
}

export interface BatchRow {
  batch: FeeBatch;
  feeTypeName: string;
  schoolName: string;
  chargeCount: number;
}

export function listBatches(actor: Actor): Promise<BatchRow[]> {
  return call(() => {
    const db = getDb();
    return db.batches
      .filter((b) => actor.kind === 'HQ' || (actor.kind === 'SCHOOL' && b.schoolId === actor.schoolId))
      .map((batch) => ({
        batch,
        feeTypeName: db.feeTypes.find((t) => t.id === batch.feeTypeId)?.name ?? '—',
        schoolName: db.schools.find((s) => s.id === batch.schoolId)?.name ?? '—',
        chargeCount: db.charges.filter((c) => c.batchId === batch.id).length,
      }));
  });
}
