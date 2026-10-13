import { Link, Navigate, Outlet, Route, useLocation } from 'react-router-dom';
import { IntegrationBadges } from '../../components/Shell';
import { Button } from '../../components/ui';
import { useSession } from '../session/SessionProvider';
import { Login } from './Login';
import { Children } from './Children';
import { ChildGuard } from './ChildGuard';
import { Dashboard } from './Dashboard';
import { Charges } from './Charges';
import { Checkout } from './Checkout';
import { Receipt } from './Receipt';
import { Gateway } from './Gateway';
import { Profile } from './Profile';
import { Assistant } from './Assistant';

const LATER = ['Top-up (Sprint 2)', 'FAS application (Sprint 3)', 'Application status (Sprint 3)'];

function EserviceLayout() {
  const { guardian, setGuardian } = useSession();
  const loc = useLocation();
  if (!guardian && !loc.pathname.endsWith('/login')) return <Navigate to="/eservice/login" replace />;
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link to="/eservice/children" className="text-lg font-semibold">
            e-Service Portal
          </Link>
          <IntegrationBadges items={['SingPass (mock)']} />
        </div>
        {guardian && (
          <div className="flex items-center gap-3 text-sm">
            <span>{guardian.name}</span>
            <Link className="underline" to="/eservice/profile">
              Profile
            </Link>
            <Button variant="secondary" onClick={() => setGuardian(null)}>
              Sign out
            </Button>
          </div>
        )}
      </header>
      {guardian && (
        <ul aria-label="Not in this prototype" className="flex flex-wrap gap-3 border-b border-slate-200 pb-2 text-sm">
          {LATER.map((l) => (
            <li key={l} aria-disabled="true" className="cursor-not-allowed text-slate-400">{l}</li>
          ))}
        </ul>
      )}
      <Outlet />
      {guardian && <Assistant />}
    </div>
  );
}

export const eserviceRoutes = (
  <Route path="/eservice" element={<EserviceLayout />}>
    <Route index element={<Navigate to="children" replace />} />
    <Route path="login" element={<Login />} />
    <Route path="children" element={<Children />} />
    <Route path="children/:personId" element={<ChildGuard />}>
      <Route index element={<Dashboard />} />
      <Route path="charges" element={<Charges />} />
      <Route path="checkout" element={<Checkout />} />
    </Route>
    <Route path="receipt/:paymentId" element={<Receipt />} />
    <Route path="gateway/:paymentId" element={<Gateway />} />
    <Route path="profile" element={<Profile />} />
    <Route path="*" element={<p className="p-4">Page not found.</p>} />
  </Route>
);
