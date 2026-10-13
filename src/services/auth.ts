import { provisionGuardian } from '../domain/profile';
import type { Persona } from '../domain/profile';
import { PERSONAS } from '../mock-db/seed';
import { getDb, setDb } from '../mock-db/store';
import { ServiceError, call } from './core';

export function listPersonas(): Promise<Persona[]> {
  return call(() => PERSONAS);
}

/** SingPass (mock): honours the demo switch, provisions the guardian on first login (R-AUTH-1). */
export function signIn(personaId: string): Promise<{ guardianId: string; displayName: string; firstLogin: boolean }> {
  return call(() => {
    const db = getDb();
    if (db.settings.singpass === 'FAIL') {
      throw new ServiceError('SINGPASS_VALIDATION_FAILED', 'SingPass could not verify your identity. Please try again.');
    }
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) throw new ServiceError('NOT_FOUND', 'Unknown SingPass identity');
    const out = provisionGuardian(db, persona);
    if (out.created) setDb(out.db);
    return { guardianId: persona.id, displayName: persona.displayName, firstLogin: out.created };
  });
}
