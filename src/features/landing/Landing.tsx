import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="hover:opacity-95 transition-opacity">
            <Logo size="sm" showSubtitle={false} />
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              to="/signin"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-16 sm:px-6 flex-1 w-full flex items-center">
        {/* Hero Section - Two Column Layout */}
        <section className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Overline / Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50/80 px-3 py-1 text-xs font-semibold text-rose-800 mb-6">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
              <span>SPRINT 1 · DEMO PROTOTYPE</span>
            </div>

            {/* Tiêu đề */}
            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
              Education accounts and school fees, in one place.
            </h1>

            {/* Phụ đề */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Parents see balances and pay school fees. Schools and HQ manage students, accounts and fee batches. A clickable prototype of Sprint 1.
            </p>

            {/* Action Button: Chỉ giữ Sign in */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                to="/signin"
                aria-label="Sign in to prototype"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Sign in</span>
                <span className="text-base">→</span>
              </Link>
            </div>

            {/* Dòng nhỏ dưới nút */}
            <p className="mt-4 text-xs font-medium text-slate-500">
              Prototype with fictional data. No real accounts or payments.
            </p>
          </div>

          {/* Right Column: Interactive Education Account Preview Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative mx-auto max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50">
              {/* Card Ribbon / Top Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    AT
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Aiden Tan</h3>
                    <p className="text-[11px] text-slate-500">Primary 4 • Pei Hwa Presbyterian</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  SC Citizen
                </span>
              </div>

              {/* Balance Widget */}
              <div className="mt-5 rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 p-4 text-white">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Available Education Account Balance</span>
                  <span className="font-mono text-[10px] text-blue-300">EA-2024-8841</span>
                </div>
                <div className="mt-2 text-3xl font-extrabold tracking-tight">
                  $1,450.00
                </div>
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-800 text-[11px]">
                  <span className="text-emerald-400 font-medium">+$500.00 Annual Govt Top-up</span>
                  <span className="text-slate-400">Edusave Eligible</span>
                </div>
              </div>

              {/* Recent School Fee Charges Preview */}
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Upcoming &amp; Recent Fee Charges</span>
                  <span className="text-[10px] text-blue-600 font-normal">SingPass Settleable</span>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">Term 2 Learning Materials</span>
                    <span className="text-[11px] text-slate-500">50% Govt Subsidy Applied</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">$60.00</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Subsidized</span>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">Co-curricular Activity Fee</span>
                    <span className="text-[11px] text-slate-500">School Sports &amp; Enrichment</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">$35.00</span>
                    <span className="text-[10px] text-amber-600 font-medium">Pending Review</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Features */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="text-rose-600 font-bold">●</span> SingPass Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-blue-600 font-bold">●</span> Direct EA Deduction
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">●</span> Instant Ledger Sync
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
