import { createContext, useContext, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { adminPersonas } from '../../domain/permissions';
import type { Actor, AdminPersona } from '../../domain/permissions';
import { getDb, subscribe } from '../../mock-db/store';

export interface GuardianSession {
  id: string;
  name: string;
}
interface SessionValue {
  guardian: GuardianSession | null;
  adminId: string;
  adminPersonas: AdminPersona[];
  actor: Actor;
  setGuardian(g: GuardianSession | null): void;
  setAdminId(id: string): void;
}

const GKEY = 'edufarm.session.guardian';
const AKEY = 'edufarm.session.admin';
const Ctx = createContext<SessionValue | null>(null);

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* session lives in memory only */
  }
}

export function SessionProvider({
  children,
  initialGuardian,
  initialAdminId,
}: {
  children: ReactNode;
  initialGuardian?: GuardianSession | null;
  initialAdminId?: string;
}) {
  const [guardian, setG] = useState<GuardianSession | null>(() => {
    if (initialGuardian !== undefined) return initialGuardian;
    const raw = read(GKEY);
    try {
      return raw ? (JSON.parse(raw) as GuardianSession) : null;
    } catch {
      return null;
    }
  });
  const [adminId, setA] = useState<string>(() => initialAdminId ?? read(AKEY) ?? 'hq');
  const db = useSyncExternalStore(subscribe, getDb);
  const personas = useMemo(() => adminPersonas(db), [db]);

  const value = useMemo<SessionValue>(
    () => ({
      guardian,
      adminId,
      adminPersonas: personas,
      actor: personas.find((p) => p.id === adminId)?.actor ?? { kind: 'HQ' },
      setGuardian: (g) => {
        write(GKEY, g ? JSON.stringify(g) : null);
        setG(g);
      },
      setAdminId: (id) => {
        write(AKEY, id);
        setA(id);
      },
    }),
    [guardian, adminId, personas],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
