import { NavLink, Outlet } from 'react-router-dom';
import { IntegrationBadges } from '../../components/Shell';
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
const LATER = ['Top-up (Sprint 2)', 'FAS schemes & applications (Sprint 3)', 'Budget & statistics (Sprint 3)', 'Simulate views (Sprint 3)'];

export function AdminLayout() {
  const { adminId, adminPersonas, setAdminId } = useSession();
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Admin Portal</h1>
          <IntegrationBadges items={['Student source (mock)', 'CPF transfer (simulated)', 'Charge source (proposed batch, unconfirmed)']} />
        </div>
        <label className="text-sm">
          Acting as
          <select className="ml-2 rounded border border-slate-400 px-2 py-1" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
            {adminPersonas.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
      </header>
      <nav aria-label="Admin sections" className="flex flex-wrap gap-3 border-b border-slate-200 pb-2 text-sm">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'font-semibold underline' : 'text-indigo-700')}>
            {label}
          </NavLink>
        ))}
        {LATER.map((l) => (
          <span key={l} aria-disabled="true" className="cursor-not-allowed text-slate-400">{l}</span>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
