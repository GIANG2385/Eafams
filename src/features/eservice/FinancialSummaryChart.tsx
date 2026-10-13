import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { Charge } from '../../domain/types';
import { formatSgd } from '../../domain/money';

interface FinancialSummaryProps {
  outstanding: Charge[];
  paid: Charge[];
  pending: Charge[];
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export function FinancialSummaryChart({ outstanding, paid, pending }: FinancialSummaryProps) {
  const [activeTab, setActiveTab] = useState<'category' | 'status' | 'breakdown'>('category');

  const allCharges = [...paid, ...outstanding, ...pending];

  // 1. Calculate KPI totals
  const totalPaidCents = paid.reduce((s, c) => s + c.totalCents, 0);
  const totalDueCents = outstanding.reduce((s, c) => s + c.totalCents, 0);
  const totalPendingCents = pending.reduce((s, c) => s + c.totalCents, 0);
  const totalSubsidyCents = allCharges.reduce((s, c) => s + (c.subsidyCents || 0), 0);
  const totalIncurredCents = allCharges.reduce((s, c) => s + c.totalCents, 0);

  // 2. Aggregate by Category for BarChart
  const catMap = new Map<string, { name: string; paid: number; outstanding: number; subsidy: number; total: number }>();
  for (const c of allCharges) {
    const cur = catMap.get(c.feeTypeName) || {
      name: c.feeTypeName,
      paid: 0,
      outstanding: 0,
      subsidy: 0,
      total: 0,
    };
    const totalDollars = c.totalCents / 100;
    if (c.status === 'PAID') {
      cur.paid += totalDollars;
    } else {
      cur.outstanding += totalDollars;
    }
    cur.subsidy += (c.subsidyCents || 0) / 100;
    cur.total += totalDollars;
    catMap.set(c.feeTypeName, cur);
  }
  const categoryData = Array.from(catMap.values());

  // 3. Status Distribution for Donut PieChart
  const statusData = [
    { name: 'Paid Fees', value: totalPaidCents / 100, color: '#10B981' },
    { name: 'Outstanding Due', value: totalDueCents / 100, color: '#2563EB' },
    { name: 'Pending Processing', value: totalPendingCents / 100, color: '#F59E0B' },
  ].filter((d) => d.value > 0);

  // 4. Line items / component breakdown
  const compMap = new Map<string, { name: string; amount: number }>();
  for (const c of allCharges) {
    for (const l of c.lines) {
      const cur = compMap.get(l.label) || { name: l.label, amount: 0 };
      cur.amount += l.amountCents / 100;
      compMap.set(l.label, cur);
    }
  }
  const componentData = Array.from(compMap.values()).sort((a, b) => b.amount - a.amount);

  if (allCharges.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 mb-2">Financial Expenses Summary</h2>
        <p className="text-xs text-slate-500">No fee expenses recorded for this academic period yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Financial Expenses Summary</h2>
          <p className="text-xs text-slate-500">Visual breakdown of school fees, payments, and government subsidies</p>
        </div>

        {/* Segmented View Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'category'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Fee Category
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'breakdown'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Components
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total Incurred
          </span>
          <span className="text-base font-bold text-slate-900 tabular-nums">
            {formatSgd(totalIncurredCents)}
          </span>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Total Settled
          </span>
          <span className="text-base font-bold text-emerald-800 tabular-nums">
            {formatSgd(totalPaidCents)}
          </span>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-blue-700">
            Outstanding Due
          </span>
          <span className="text-base font-bold text-blue-800 tabular-nums">
            {formatSgd(totalDueCents)}
          </span>
        </div>
        <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-purple-700">
            Subsidies Applied
          </span>
          <span className="text-base font-bold text-purple-800 tabular-nums">
            {formatSgd(totalSubsidyCents)}
          </span>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="h-64 w-full">
        {activeTab === 'category' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(v: number) => `S$${v}`}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `S$${Number(value ?? 0).toFixed(2)}`,
                  name === 'paid' ? 'Paid' : name === 'outstanding' ? 'Outstanding' : 'Subsidy',
                ]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
                formatter={(val) => (val === 'paid' ? 'Paid' : val === 'outstanding' ? 'Outstanding' : 'Subsidy')}
              />
              <Bar dataKey="paid" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="paid" />
              <Bar dataKey="outstanding" stackId="a" fill="#2563EB" radius={[4, 4, 0, 0]} name="outstanding" />
              <Bar dataKey="subsidy" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="subsidy" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'status' && (
          <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-4">
            <div className="h-56 w-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`S$${Number(val ?? 0).toFixed(2)}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}:</span>
                  <span className="font-bold text-slate-900 tabular-nums">S${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={componentData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" tickFormatter={(v: number) => `S$${v}`} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={110} />
              <Tooltip
                formatter={(v: any) => [`S$${Number(v ?? 0).toFixed(2)}`, 'Total']}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#CBD5E1',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="amount" fill="#4F46E5" radius={[0, 4, 4, 0]}>
                {componentData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
