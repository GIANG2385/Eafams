import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../AppProviders';
import { AppRoutes } from '../AppRoutes';
import type { GuardianSession } from '../features/session/SessionProvider';
import { forgetCacheForTests, resetDb } from '../mock-db/store';

export function resetTestState(): void {
  window.localStorage.clear();
  window.sessionStorage.clear();
  forgetCacheForTests();
  resetDb();
}

export function renderApp(route = '/', opts: { guardian?: GuardianSession; adminId?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders initialGuardian={opts.guardian ?? null} initialAdminId={opts.adminId ?? 'hq'}>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}
