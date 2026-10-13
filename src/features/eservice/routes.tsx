import { Link, Navigate, Outlet, Route, useLocation } from 'react-router-dom';
import { Logo } from '../../components/Logo';
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

  if (!guardian && !loc.pathname.endsWith('/login')) {
    return <Navigate to="/eservice/login" replace />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      {/* Top Header */}
      <header className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Link to="/" title="eafams home" className="hover:opacity-90 transition-opacity">
              <Logo size="sm" showSubtitle={false} />
            </Link>
            <div className="h-7 w-px bg-slate-200" />
            <div>
              <Link
                to="/eservice/children"
                className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 hover:text-blue-600 transition-colors leading-none block"
              >
                e-Service Portal
              </Link>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Citizen Services</span>
            </div>
          </div>

          {guardian && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-2xs">
                  {guardian.name.charAt(0)}
                </div>
                <span className="font-semibold text-slate-800 text-xs sm:text-sm">{guardian.name}</span>
              </div>
              <span className="text-slate-300">|</span>
              <Link
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                to="/eservice/profile"
              >
                Profile
              </Link>
              <Button variant="secondary" className="text-xs px-2.5 py-1" onClick={() => setGuardian(null)}>
                Sign out
              </Button>
            </div>
          )}
        </div>

        {guardian && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
            {LATER.map((l) => (
              <span key={l} aria-disabled="true" className="cursor-not-allowed">
                {l}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Main Outlet */}
      <main className="space-y-4">
        <Outlet />
      </main>

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
