import type { Actor } from '../domain/permissions';
import { getDb, resetDb } from '../mock-db/store';
import { listFeeConfig, saveComponent, saveFeeType, setFeeStatus } from './fees';

beforeEach(() => resetDb());
const hq: Actor = { kind: 'HQ' };
const school: Actor = { kind: 'SCHOOL', schoolId: 'sch-01' };
const comp = { code: 'LAB', name: 'Lab fee', calcType: 'FIXED' as const, amountCents: 2500, rateBp: 0, effectiveFrom: '2026-01-01', effectiveTo: '' };

test('list shows each type with ordered components and an example total', async () => {
  const cfg = await listFeeConfig(hq);
  const school_fee = cfg.types.find((t) => t.type.id === 'ft-school')!;
  expect(school_fee.components.map((c) => c.name)).toEqual(['Term fee', 'Materials', 'GST 9%']);
  expect(school_fee.exampleTotalCents).toBe(11990);
});

test('one GST component is reused by every seeded fee type', async () => {
  const cfg = await listFeeConfig(hq);
  expect(cfg.types.every((t) => t.components.some((c) => c.id === 'fc-gst'))).toBe(true);
});

test('HQ creates a component and a fee type that reuses GST', async () => {
  const c = await saveComponent(hq, comp);
  const t = await saveFeeType(hq, { code: 'LABFEE', name: 'Lab fee', description: 'Science lab', componentIds: [c.id, 'fc-gst'] });
  const cfg = await listFeeConfig(hq);
  const view = cfg.types.find((x) => x.type.id === t.id)!;
  expect(view.components.map((x) => x.id)).toEqual([c.id, 'fc-gst']);
  expect(view.exampleTotalCents).toBe(2725); // 2500 + 9% = 225
  expect(getDb().feeTypeComponents.filter((l) => l.componentId === 'fc-gst').length).toBe(7);
});

test('School users can read but not change fee configuration', async () => {
  expect((await listFeeConfig(school)).types.length).toBeGreaterThan(0);
  await expect(saveComponent(school, comp)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(saveFeeType(school, { code: 'X', name: 'X', description: '', componentIds: ['fc-term'] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(setFeeStatus(school, 'TYPE', 'ft-school', 'INACTIVE')).rejects.toMatchObject({ code: 'FORBIDDEN' });
});

test.each([
  ['blank name', { name: ' ' }],
  ['blank code', { code: '' }],
  ['negative amount', { amountCents: -1 }],
  ['fractional cents', { amountCents: 10.5 }],
  ['bad date', { effectiveFrom: '2026-02-30' }],
  ['end before start', { effectiveTo: '2025-12-31' }],
  ['duplicate code', { code: 'term' }],
])('component validation: %s', async (_n, patch) => {
  await expect(saveComponent(hq, { ...comp, ...patch })).rejects.toMatchObject({ code: 'VALIDATION' });
});

test('percent rate must be between 0 and 100%', async () => {
  await expect(saveComponent(hq, { ...comp, code: 'P', calcType: 'PERCENT', amountCents: 0, rateBp: 10001 })).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(saveComponent(hq, { ...comp, code: 'P', calcType: 'PERCENT', amountCents: 0, rateBp: -5 })).rejects.toMatchObject({ code: 'VALIDATION' });
});

test('fee type needs at least one existing component and a unique code', async () => {
  await expect(saveFeeType(hq, { code: 'E', name: 'Empty', description: '', componentIds: [] })).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(saveFeeType(hq, { code: 'E', name: 'Ghost', description: '', componentIds: ['fc-nope'] })).rejects.toMatchObject({ code: 'VALIDATION' });
  await expect(saveFeeType(hq, { code: 'school', name: 'Dup', description: '', componentIds: ['fc-term'] })).rejects.toMatchObject({ code: 'VALIDATION' });
});

test('deactivating keeps the record; published charges are untouched', async () => {
  const before = getDb().charges.length;
  await setFeeStatus(hq, 'COMPONENT', 'fc-gst', 'INACTIVE');
  expect(getDb().feeComponents.find((c) => c.id === 'fc-gst')!.status).toBe('INACTIVE');
  expect(getDb().charges).toHaveLength(before);
});
