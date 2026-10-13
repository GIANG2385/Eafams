import type { Db, Guardian, IsoDate } from './types';
import { nextId } from './ids';
import { maskNric, validateProfile } from './validators';
import type { ProfileErrors, ProfileInput } from './validators';

export type { ProfileErrors, ProfileInput } from './validators';

export interface Persona {
  id: string;
  displayName: string;
  nric: string;
  profile: ProfileInput;
}

const FIELDS: (keyof ProfileInput)[] = [
  'residentialAddress',
  'residentialPostalCode',
  'mailingAddress',
  'mailingPostalCode',
  'mobile',
  'email',
];

/** R-AUTH-1: the guardian record is created on the first successful login. */
export function provisionGuardian(db: Db, persona: Persona): { db: Db; created: boolean } {
  if (db.guardians.some((g) => g.id === persona.id)) return { db, created: false };
  const guardian: Guardian = {
    id: persona.id,
    displayName: persona.displayName,
    maskedNric: maskNric(persona.nric),
    ...persona.profile,
  };
  return { db: { ...db, guardians: [...db.guardians, guardian] }, created: true };
}

/** R-PROF-1: only the six editable fields exist on `ProfileInput`; name/NRIC cannot be patched. */
export function applyProfileUpdate(
  db: Db,
  guardianId: string,
  patch: ProfileInput,
  at: IsoDate,
): { db: Db; ok: boolean; errors: ProfileErrors; changed: (keyof ProfileInput)[] } {
  const guardian = db.guardians.find((g) => g.id === guardianId);
  if (!guardian) return { db, ok: false, errors: { form: 'Account not found' }, changed: [] };
  const errors = validateProfile(patch);
  if (Object.keys(errors).length > 0) return { db, ok: false, errors, changed: [] };
  let cur = db;
  const changed: (keyof ProfileInput)[] = [];
  const next: Guardian = { ...guardian };
  for (const f of FIELDS) {
    const value = patch[f].trim();
    if (value === guardian[f]) continue;
    const r = nextId(cur, 'pc');
    cur = {
      ...r.db,
      profileChanges: [
        ...r.db.profileChanges,
        { id: r.id, guardianId, field: f, oldValue: guardian[f], newValue: value, at },
      ],
    };
    next[f] = value;
    changed.push(f);
  }
  cur = { ...cur, guardians: cur.guardians.map((g) => (g.id === guardianId ? next : g)) };
  return { db: cur, ok: true, errors: {}, changed };
}
