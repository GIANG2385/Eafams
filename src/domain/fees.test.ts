import { chargeTotal, componentsOfFeeType, computeLines, isEffective, sumLines } from './fees';
import { dbWith, mkComponent } from './testing';

const base = mkComponent({ id: 'c-base', name: 'Term fee', amountCents: 10000 });
const mat = mkComponent({ id: 'c-mat', name: 'Materials', amountCents: 1000 });
const gst = mkComponent({ id: 'c-gst', name: 'GST 9%', calcType: 'PERCENT', rateBp: 900, amountCents: 0 });

test('GST applies to the fixed subtotal and total equals the sum of rounded lines', () => {
  const lines = computeLines([base, mat, gst], '2026-10-13');
  expect(lines.map((l) => l.amountCents)).toEqual([10000, 1000, 990]);
  expect(sumLines(lines)).toBe(11990);
  expect(chargeTotal(lines)).toBe(11990);
});

test('each percent component rounds on its own', () => {
  const a = mkComponent({ id: 'a', calcType: 'PERCENT', rateBp: 450, amountCents: 0 });
  const b = mkComponent({ id: 'b', calcType: 'PERCENT', rateBp: 450, amountCents: 0 });
  const fixed = mkComponent({ id: 'f', amountCents: 1005 });
  const lines = computeLines([fixed, a, b], '2026-10-13');
  expect(lines.map((l) => l.amountCents)).toEqual([1005, 45, 45]);
  expect(sumLines(lines)).toBe(1095);
});

test('percent on a zero subtotal is zero', () => {
  expect(computeLines([gst], '2026-10-13').map((l) => l.amountCents)).toEqual([0]);
});

test('inactive and out-of-period components are excluded', () => {
  const expired = mkComponent({ id: 'old', effectiveTo: '2026-06-30' });
  const future = mkComponent({ id: 'new', effectiveFrom: '2027-01-01' });
  const off = mkComponent({ id: 'off', status: 'INACTIVE' });
  expect(isEffective(expired, '2026-10-13')).toBe(false);
  expect(isEffective(future, '2026-10-13')).toBe(false);
  expect(isEffective(off, '2026-10-13')).toBe(false);
  expect(computeLines([expired, future, off, base], '2026-10-13')).toHaveLength(1);
});

test('chargeTotal subtracts subsidy and never goes below zero', () => {
  const lines = computeLines([base], '2026-10-13');
  expect(chargeTotal(lines, 2500)).toBe(7500);
  expect(chargeTotal(lines, 99999)).toBe(0);
});

test('componentsOfFeeType returns components ordered by link order', () => {
  const db = dbWith({
    feeComponents: [base, mat, gst],
    feeTypeComponents: [
      { feeTypeId: 'ft', componentId: 'c-gst', order: 3 },
      { feeTypeId: 'ft', componentId: 'c-base', order: 1 },
      { feeTypeId: 'ft', componentId: 'c-mat', order: 2 },
      { feeTypeId: 'other', componentId: 'c-mat', order: 1 },
    ],
  });
  expect(componentsOfFeeType(db, 'ft').map((c) => c.id)).toEqual(['c-base', 'c-mat', 'c-gst']);
});
