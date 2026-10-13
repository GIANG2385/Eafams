import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';

export function Landing() {
  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="hover:opacity-95 transition-opacity">
            <Logo size="sm" showSubtitle={false} />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
            >
              How it works
            </button>
            <Link
              to="/signin"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        {/* 1. Hero Section */}
        <section className="text-center max-w-3xl mx-auto">
          {/* Brand Crest */}
          <div className="inline-flex items-center justify-center mb-6">
            <Logo size="lg" showSubtitle={true} />
          </div>

          {/* Tiêu đề */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
            Education accounts and school fees, in one place.
          </h1>

          {/* Phụ đề */}
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Parents see balances and pay school fees. Schools and HQ manage students, accounts and fee batches. A clickable prototype of Sprint 1.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* Nút chính */}
            <Link
              to="/signin"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Sign in</span>
              <span>→</span>
            </Link>

            {/* Nút phụ */}
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all cursor-pointer"
            >
              See how it works
            </button>
          </div>

          {/* Dòng nhỏ dưới nút */}
          <p className="mt-4 text-xs font-medium text-slate-500">
            Prototype with fictional data. No real accounts or payments.
          </p>
        </section>

        {/* 2. Core Stakeholders & Roles */}
        <section className="mt-16 sm:mt-24 pt-10 border-t border-slate-200">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Unified Architecture</span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Built for all key educational stakeholders
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              Role-based interfaces designed for the complete tuition &amp; subsidy lifecycle.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Role 1: Parents */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold mb-4">
                  👨‍👩‍👧
                </div>
                <h3 className="text-base font-bold text-slate-900">Parents &amp; Guardians</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Log in securely with SingPass. View real-time Education Account balances, review itemized school fee breakdowns with government subsidies, and settle charges online.
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 font-mono">
                  Authentication: SingPass Verified
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/signin"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Access Parent Portal →
                </Link>
              </div>
            </div>

            {/* Role 2: Schools */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-bold mb-4">
                  🏫
                </div>
                <h3 className="text-base font-bold text-slate-900">School Administrators</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Log in with staff User ID &amp; Password. Manage cohorts and classes, track fee collection statuses, and publish school-level charge cycles.
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 font-mono">
                  Authentication: Staff ID &amp; Password
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/signin"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Access School Admin →
                </Link>
              </div>
            </div>

            {/* Role 3: Ministry HQ */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold mb-4">
                  🏛️
                </div>
                <h3 className="text-base font-bold text-slate-900">Ministry HQ Officers</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Log in with HQ User ID &amp; Password. Configure standard fee models, import nationwide student datasets, and audit financial ledgers.
                </p>
                <div className="mt-4 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 font-mono">
                  Authentication: HQ ID &amp; Password
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link
                  to="/signin"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
                >
                  Access Ministry HQ →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Phần 3: How It Works */}
        <section id="how-it-works" className="mt-16 sm:mt-24 pt-12 border-t border-slate-200 scroll-mt-16">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Sprint 1 Prototype</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How it works
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
              Follow the end-to-end operational flow from policy configuration to parent settlement in 3 steps:
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-12">
            {/* Step 1 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Configure &amp; Publish</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                HQ configures standard fee components and school administrators schedule fee collection batches for student cohorts.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Calculate &amp; Subsidize</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                System automatically verifies Singapore citizenship, checks Education Account balances, and applies government fee subsidies.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Review &amp; Settle</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Parents sign in via SingPass, examine visual charts of expenses, and approve deduction from Education Accounts or pay online.
              </p>
            </div>
          </div>

          {/* Quick Portal Launchpad Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Parents Portal Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-blue-300 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    Parents &amp; Guardians
                  </span>
                  <span className="text-xs font-mono text-slate-400">SingPass Auth</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">e-Service Portal</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Direct parent access to student Education Accounts, fee charges, Recharts expense breakdowns, and online payments.
                </p>
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
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-slate-400 transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    HQ &amp; School Officers
                  </span>
                  <span className="text-xs font-mono text-slate-400">Staff Credentials</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Admin Portal</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Institutional access for schools and Ministry HQ to manage cohorts, student ledgers, fee batches, and data imports.
                </p>
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
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" showSubtitle={false} />
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-slate-600">eafams</span>
          </div>
          <div>
            Prototype with fictional data. No real accounts or payments.
          </div>
        </div>
      </footer>
    </div>
  );
}
