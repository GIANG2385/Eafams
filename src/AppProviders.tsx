import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SessionProvider } from './features/session/SessionProvider';
import type { GuardianSession } from './features/session/SessionProvider';
import type { Db } from './domain/types';
import { getDb, subscribe } from './mock-db/store';

export function AppProviders({
  children,
  initialGuardian,
  initialAdminId,
}: {
  children: ReactNode;
  initialGuardian?: GuardianSession | null;
  initialAdminId?: string;
}) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } }));
  // every write to the mock db refreshes whatever is on screen
  // Toggling only the one-shot "fail next call" switch must not refresh the screen: the refresh would consume the failure.
  useEffect(() => {
    let prev = getDb();
    return subscribe(() => {
      const cur = getDb();
      const same = (Object.keys(cur) as (keyof Db)[]).every((k) => {
        if (k !== 'settings') return cur[k] === prev[k];
        const a = cur.settings as unknown as Record<string, unknown>;
        const b = prev.settings as unknown as Record<string, unknown>;
        return Object.keys(a).every((f) => f === 'failNext' || a[f] === b[f]);
      });
      prev = cur;
      if (!same) void client.invalidateQueries();
    });
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <SessionProvider initialGuardian={initialGuardian} initialAdminId={initialAdminId}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}
