import { percentOf } from './money';
import type { Cents, ChargeLine, Db, FeeComponent, IsoDate } from './types';

export function isEffective(c: FeeComponent, asOf: IsoDate): boolean {
  return c.status === 'ACTIVE' && c.effectiveFrom <= asOf && (c.effectiveTo === null || asOf <= c.effectiveTo);
}

/**
 * PERCENT components apply to the subtotal of the FIXED components of the same fee type.
 * Every line is rounded half-up on its own (R-FEE-1).
 */
export function computeLines(components: FeeComponent[], asOf: IsoDate): ChargeLine[] {
  const active = components.filter((c) => isEffective(c, asOf));
  const subtotal = active.filter((c) => c.calcType === 'FIXED').reduce((s, c) => s + c.amountCents, 0);
  return active.map((c) => ({
    componentId: c.id,
    label: c.name,
    amountCents: c.calcType === 'FIXED' ? c.amountCents : percentOf(subtotal, c.rateBp),
  }));
}

export function sumLines(lines: ChargeLine[]): Cents {
  return lines.reduce((s, l) => s + l.amountCents, 0);
}

export function chargeTotal(lines: ChargeLine[], subsidyCents: Cents = 0): Cents {
  return Math.max(0, sumLines(lines) - subsidyCents);
}

export function componentsOfFeeType(db: Db, feeTypeId: string): FeeComponent[] {
  return db.feeTypeComponents
    .filter((l) => l.feeTypeId === feeTypeId)
    .sort((a, b) => a.order - b.order)
    .map((l) => db.feeComponents.find((c) => c.id === l.componentId))
    .filter((c): c is FeeComponent => c !== undefined);
}
