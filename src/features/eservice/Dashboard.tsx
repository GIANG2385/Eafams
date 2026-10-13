import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { QueryState } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import type { NoAccountReason } from '../../domain/ea';
import { listTransactions } from '../../services/parent';
import type { TxnType } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { useChild } from './ChildGuard';
import { PbiChip } from '../../components/PbiChip';

const REASON: Record<NoAccountReason, string> = {
  NOT_CITIZEN: 'This student is not a Singapore Citizen, so no Education Account is held. Fees are paid online.',
  UNDER_7: 'An Education Account is opened automatically when the child turns 7.',
  AT_OR_OVER_16: 'Education Accounts close at age 16.',
  MISSING_DATA: 'Student details are incomplete, so no account has been opened yet.',
  NOT_YET_CREATED: 'The account has not been created yet. It is opened automatically.',
  ALREADY_HAS_ACCOUNT: '',
};
const TYPE_LABEL = { TOPUP_SEED: 'Credit', DEMO_FUNDS: 'Credit', FEE_DEBIT: 'Fee payment', CPF_TRANSFER: 'CPF transfer' } as const;

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
  const acc = child.account;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{child.name}</h1>
      <PbiChip code="PB-08" check="balance, status and transactions" />
      <Card title="Education Account">
        {acc ? (
          <div className="space-y-1">
            <p className="text-3xl font-semibold">{formatSgd(acc.balanceCents)}</p>
            <Badge tone={acc.status === 'ACTIVE' ? 'green' : 'slate'}>{acc.status === 'ACTIVE' ? 'Active' : 'Closed'}</Badge>
            {acc.status === 'CLOSED' && (
              <p className="text-sm text-slate-700">This account is closed. Records are read-only.</p>
            )}
          </div>
        ) : (
          <div>
            <p className="font-medium">No Education Account</p>
            <p className="text-sm text-slate-700">{child.noAccountReason ? REASON[child.noAccountReason] : ''}</p>
          </div>
        )}
        <Link className="mt-3 inline-block text-indigo-700 underline" to={`/eservice/children/${child.personId}/charges`}>
          View outstanding fees
        </Link>
      </Card>
      {acc && (
        <Card title="Transactions">
          <div className="mb-3 grid gap-2 sm:grid-cols-4">
            <Field id="from" label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Field id="to" label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <div>
              <label htmlFor="ttype" className="block text-sm font-medium">Type</label>
              <select id="ttype" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={type}
                onChange={(e) => { setType(e.target.value as TxnType); setPage(1); }}>
                <option value="ALL">All</option>
                <option value="CREDIT">Credit</option>
                <option value="FEE_PAYMENT">Fee payment</option>
                <option value="CPF_TRANSFER">CPF transfer</option>
              </select>
            </div>
          </div>
          <QueryState query={q} isEmpty={(d) => d.total === 0} emptyText="No transactions match.">
            {(d) => (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-1">Date</th><th>Type</th><th>Reference</th><th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-1">{r.postedAt}</td>
                        <td>{TYPE_LABEL[r.type]}</td>
                        <td>{r.ref}</td>
                        <td className="text-right">{r.amountCents > 0 ? '+' : ''}{formatSgd(r.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex items-center gap-3">
                  <Button variant="secondary" disabled={d.page <= 1} onClick={() => setPage(d.page - 1)}>Previous</Button>
                  <span>Page {d.page} of {d.pages}</span>
                  <Button variant="secondary" disabled={d.page >= d.pages} onClick={() => setPage(d.page + 1)}>Next</Button>
                  <Button variant="secondary" className="ml-auto print:hidden" onClick={() => window.print()}>Print statement</Button>
                </div>
              </>
            )}
          </QueryState>
        </Card>
      )}
    </div>
  );
}
