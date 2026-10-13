import { applyProfileUpdate, provisionGuardian } from './profile';
import type { Persona } from './profile';
import { dbWith } from './testing';

const persona: Persona = {
  id: 'g-tan',
  displayName: 'Tan Mei Ling',
  nric: 'S1234567A',
  profile: {
    residentialAddress: '12 Orchard Lane #05-01',
    residentialPostalCode: '238888',
    mailingAddress: '12 Orchard Lane #05-01',
    mailingPostalCode: '238888',
    mobile: '81234567',
    email: 'mei.ling@example.com',
  },
};

test('provisioning creates the guardian once with a masked NRIC', () => {
  const first = provisionGuardian(dbWith({}), persona);
  expect(first.created).toBe(true);
  expect(first.db.guardians[0]).toMatchObject({ id: 'g-tan', maskedNric: 'S****567A', mobile: '81234567' });
  const second = provisionGuardian(first.db, persona);
  expect(second.created).toBe(false);
  expect(second.db).toBe(first.db);
});

describe('applyProfileUpdate', () => {
  const base = provisionGuardian(dbWith({}), persona).db;

  test('stores trimmed values and logs only changed fields with old and new value', () => {
    const out = applyProfileUpdate(base, 'g-tan', { ...persona.profile, mobile: ' 91234567 ' }, '2026-10-13');
    expect(out.ok).toBe(true);
    expect(out.changed).toEqual(['mobile']);
    expect(out.db.guardians[0].mobile).toBe('91234567');
    expect(out.db.profileChanges).toEqual([
      expect.objectContaining({ guardianId: 'g-tan', field: 'mobile', oldValue: '81234567', newValue: '91234567', at: '2026-10-13' }),
    ]);
  });

  test('invalid input is rejected and nothing is stored', () => {
    const out = applyProfileUpdate(base, 'g-tan', { ...persona.profile, mobile: '12345678' }, '2026-10-13');
    expect(out.ok).toBe(false);
    expect(out.errors.mobile).toBeDefined();
    expect(out.db).toBe(base);
  });

  test('no-op update logs nothing', () => {
    const out = applyProfileUpdate(base, 'g-tan', persona.profile, '2026-10-13');
    expect(out.ok).toBe(true);
    expect(out.changed).toEqual([]);
    expect(out.db.profileChanges).toHaveLength(0);
  });

  test('unknown guardian', () => {
    const out = applyProfileUpdate(base, 'nope', persona.profile, '2026-10-13');
    expect(out.ok).toBe(false);
    expect(out.errors.form).toBeDefined();
  });
});
