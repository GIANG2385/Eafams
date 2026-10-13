import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { useSession } from '../session/SessionProvider';

const LINKS = [
  ['/admin/schools', 'Schools'],
  ['/admin/structure', 'Levels & classes'],
  ['/admin/students', 'Students'],
  ['/admin/import', 'Import students'],
  ['/admin/ea', 'Education Accounts'],
  ['/admin/fees', 'Fee types'],
  ['/admin/batches', 'Fee batches'],
] as const;

const LATER = [
  'Top-up (Sprint 2)',
  'FAS schemes & applications (Sprint 3)',
  'Budget & statistics (Sprint 3)',
  'Simulate views (Sprint 3)',
];

export function AdminLayout() {
  const { adminId, adminPersonas, setAdminId } = useSession();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header Bar */}
      <header className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link to="/" title="eafams home" className="hover:opacity-90 transition-opacity">
              <Logo size="sm" showSubtitle={false} />
            </Link>
            <div className="h-7 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-none">Admin Portal</h1>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Institutional Governance</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
              <span className="font-semibold text-slate-700">Acting as:</span>
              <select
                aria-label="Acting as"
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              >
                {adminPersonas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Section Navigation */}
        <nav
          aria-label="Admin sections"
          className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-sm"
        >
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="ml-auto hidden xl:flex items-center gap-2">
            {LATER.map((l) => (
              <span
                key={l}
                aria-disabled="true"
                className="cursor-not-allowed rounded-md px-2 py-1 text-[11px] text-slate-400"
              >
                {l}
              </span>
            ))}
          </div>
        </nav>
      </header>

      {/* Main View Container */}
      <main className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <Outlet />
      </main>
    </div>
  );
}
