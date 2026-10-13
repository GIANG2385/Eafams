import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';

export function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      {/* Brand Hero */}
      <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
        <Logo size="lg" showSubtitle={true} className="mb-3" />
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 leading-relaxed">
          The unified digital platform connecting parents, schools, and Ministry HQ for automated fee billing, Education Account subsidies, and transparent ledger settlements.
        </p>
      </div>

      {/* Two Main Portals */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Parents Portal Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                For Parents &amp; Guardians
              </span>
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Parent e-Service
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Check your children's Education Account balance, review itemized school fee breakdowns with subsidies, and settle charges instantly.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">✓</span> SingPass verified identity
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">✓</span> Direct Education Account debit
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">✓</span> Full statement &amp; payment receipts
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all"
              to="/eservice/login"
            >
              <span>e-Service Portal (parents)</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Admin Portal Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-slate-400 transition-all duration-200">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                For HQ &amp; School Officers
              </span>
              <svg className="h-6 w-6 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Institutional Admin
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Maintain institutional registries, manage student cohorts, configure tiered fee structures, and execute automated fee batch cycles.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-2">
                <span className="text-slate-800 font-bold">✓</span> Role-based access (HQ &amp; School)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-800 font-bold">✓</span> Bulk student file imports &amp; validation
              </li>
              <li className="flex items-center gap-2">
                <span className="text-slate-800 font-bold">✓</span> Education Account lifecycle automation
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-[0.99] transition-all"
              to="/admin"
            >
              <span>Admin Portal (HQ and schools)</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Platform Features Footer */}
      <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200">
        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Security</div>
          <div className="mt-1 text-sm font-medium text-slate-900">SingPass Authenticated</div>
          <p className="mt-0.5 text-xs text-slate-500">Official citizen authentication with automatic child linkage.</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Integrity</div>
          <div className="mt-1 text-sm font-medium text-slate-900">Auditable Double Ledger</div>
          <p className="mt-0.5 text-xs text-slate-500">Zero double-collection and idempotent transaction processing.</p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Governance</div>
          <div className="mt-1 text-sm font-medium text-slate-900">Multi-Tier Administration</div>
          <p className="mt-0.5 text-xs text-slate-500">Strict separation of duties between HQ policy and school operations.</p>
        </div>
      </div>
    </main>
  );
}
