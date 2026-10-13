import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QueryState } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import type { NoAccountReason } from '../../domain/ea';
import { listCharges, listTransactions } from '../../services/parent';
import type { TxnType } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { useChild } from './ChildGuard';
import { PbiChip } from '../../components/PbiChip';
import { FinancialSummaryChart } from './FinancialSummaryChart';

const REASON: Record<NoAccountReason, string> = {
  NOT_CITIZEN: 'This student is not a Singapore Citizen, so no Education Account is held. Fees are paid online.',
  UNDER_7: 'An Education Account is opened automatically when the child turns 7.',
  AT_OR_OVER_16: 'Education Accounts close at age 16.',
  MISSING_DATA: 'Student details are incomplete, so no account has been opened yet.',
  NOT_YET_CREATED: 'The account has not been created yet. It is opened automatically.',
  ALREADY_HAS_ACCOUNT: '',
};

const TYPE_LABEL = {
  TOPUP_SEED: 'Credit',
  DEMO_FUNDS: 'Credit',
  FEE_DEBIT: 'Fee payment',
  CPF_TRANSFER: 'CPF transfer',
} as const;

export function Dashboard() {
  const child = useChild();
  const { guardian } = useSession();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<TxnType>('ALL');
  const q = useQuery({
    queryKey: ['txns', guardian?.id, child.personId, page, from, to, type],
    queryFn: () => listTransactions(guardian!.id, child.personId, { page, from: from || undefined, to: to || undefined, type }),
    enabled: !!guardian && !!child.account,
  });
  const chargesQ = useQuery({
    queryKey: ['charges', guardian?.id, child.personId],
    queryFn: () => listCharges(guardian!.id, child.personId),
    enabled: !!guardian,
  });
  const acc = child.account;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{child.name}</h1>
        <p className="text-xs text-slate-500 font-medium">Student Account &amp; Financial Overview</p>
      </div>
      <PbiChip code="PB-08" check="balance, status and transactions" />

      {/* Account Balance Card */}
      <Card title="Education Account">
        {acc ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-bold tabular-nums text-slate-900 tracking-tight">
                {formatSgd(acc.balanceCents)}
              </span>
              <Badge tone={acc.status === 'ACTIVE' ? 'green' : 'slate'}>
                {acc.status === 'ACTIVE' ? 'Active' : 'Closed'}
              </Badge>
            </div>
            {acc.status === 'CLOSED' && (
              <p className="text-xs text-slate-500">This account is closed. Records are preserved read-only.</p>
            )}
            <Link
              className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              to={`/eservice/children/${child.personId}/charges`}
            >
              View outstanding fees
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold text-slate-800">No Education Account</p>
            <p className="text-xs text-slate-500">{child.noAccountReason ? REASON[child.noAccountReason] : ''}</p>
            <Link
              className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              to={`/eservice/children/${child.personId}/charges`}
            >
              View outstanding fees
            </Link>
          </div>
        )}
      </Card>

      {/* Financial Expenses Visual Summary with Recharts */}
      {chargesQ.isLoading ? (
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="h-5 w-52 bg-slate-200 animate-pulse rounded mb-4" />
          <div className="h-44 w-full bg-slate-100 animate-pulse rounded" />
        </section>
      ) : chargesQ.data ? (
        <FinancialSummaryChart
          outstanding={chargesQ.data.outstanding}
          paid={chargesQ.data.paid}
          pending={chargesQ.data.pending}
        />
      ) : null}

      {/* Transactions History Card */}
      {acc && (
        <Card title="Transactions History">
          <div className="mb-4 grid gap-3 sm:grid-cols-4 rounded-lg bg-slate-50 p-3 border border-slate-100">
            <Field id="from" label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Field id="to" label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <div>
              <label htmlFor="ttype" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Transaction Type
              </label>
              <select
                id="ttype"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={type}
                onChange={(e) => { setType(e.target.value as TxnType); setPage(1); }}
              >
                <option value="ALL">All Types</option>
                <option value="CREDIT">Credit</option>
                <option value="FEE_PAYMENT">Fee payment</option>
                <option value="CPF_TRANSFER">CPF transfer</option>
              </select>
            </div>
          </div>

          <QueryState query={q} isEmpty={(d) => d.total === 0} emptyText="No transactions match your filter criteria.">
            {(d) => (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.rows.map((r) => {
                        const isCredit = r.amountCents > 0;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{r.postedAt}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{TYPE_LABEL[r.type]}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">{r.ref}</td>
                            <td className={`py-2.5 px-3 text-right font-semibold tabular-nums whitespace-nowrap ${isCredit ? 'text-emerald-700' : 'text-slate-800'}`}>
                              {isCredit ? '+' : ''}{formatSgd(r.amountCents)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" className="text-xs px-2.5 py-1" disabled={d.page <= 1} onClick={() => setPage(d.page - 1)}>
                      Previous
                    </Button>
                    <span className="font-medium">
                      Page {d.page} of {d.pages}
                    </span>
                    <Button variant="secondary" className="text-xs px-2.5 py-1" disabled={d.page >= d.pages} onClick={() => setPage(d.page + 1)}>
                      Next
                    </Button>
                  </div>
                  <Button variant="secondary" className="text-xs px-2.5 py-1 print:hidden" onClick={() => window.print()}>
                    Print statement
                  </Button>
                </div>
              </div>
            )}
          </QueryState>
        </Card>
      )}
    </div>
  );
}
