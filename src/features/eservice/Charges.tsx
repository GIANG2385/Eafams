import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QueryState } from '../../components/StateView';
import { Badge, Button, Card } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import type { Charge } from '../../domain/types';
import { listCharges } from '../../services/parent';
import { IntegrationBadges } from '../../components/Shell';
import { useSession } from '../session/SessionProvider';
import { useChild } from './ChildGuard';
import { PbiChip } from '../../components/PbiChip';

function ChargeBlock({
  c,
  selectable,
  checked,
  onToggle,
  paymentId,
}: {
  c: Charge;
  selectable: boolean;
  checked: boolean;
  onToggle: () => void;
  paymentId?: string;
}) {
  return (
    <li className={`rounded-xl border p-4 transition-all ${checked ? 'border-blue-500 bg-blue-50/20 shadow-xs' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          {selectable && (
            <input
              type="checkbox"
              aria-label={`Select ${c.feeTypeName}`}
              checked={checked}
              onChange={onToggle}
              className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
            />
          )}
          <div>
            <span className="font-bold text-sm text-slate-900 block">{c.feeTypeName}</span>
            <span className="text-xs text-slate-500">Due on {c.dueOn}</span>
          </div>
        </label>
        {c.status === 'PENDING_PAYMENT' && (
          <span className="flex items-center gap-2">
            <Badge tone="amber">Payment pending</Badge>
            {paymentId && (
              <Link className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors" to={`/eservice/receipt/${paymentId}`}>
                Check payment status
              </Link>
            )}
          </span>
        )}
        {c.status === 'PAID' && <Badge tone="green">Paid</Badge>}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50/80 p-3 border border-slate-100">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-100">
            {c.lines.map((l) => (
              <tr key={l.componentId}>
                <td className="py-1 text-slate-600">{l.label}</td>
                <td className="py-1 text-right font-medium text-slate-800 tabular-nums">{formatSgd(l.amountCents)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1 text-slate-600">Subsidy</td>
              <td className="py-1 text-right font-medium text-emerald-700 tabular-nums">-{formatSgd(c.subsidyCents)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-bold text-slate-900 text-sm">
              <td className="pt-2">Total Due</td>
              <td className="pt-2 text-right tabular-nums">{formatSgd(c.totalCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </li>
  );
}

export function Charges() {
  const child = useChild();
  const { guardian } = useSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>([]);
  const q = useQuery({
    queryKey: ['charges', guardian?.id, child.personId],
    queryFn: () => listCharges(guardian!.id, child.personId),
    enabled: !!guardian,
  });
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fees for {child.name}</h1>
        <p className="text-xs text-slate-500 font-medium">Outstanding and completed term fees</p>
      </div>
      <PbiChip code="PB-09" check="fees with components, GST and total" />
      <IntegrationBadges items={['Charge source (proposed batch, unconfirmed)']} />

      <QueryState query={q}>
        {(d) => {
          const total = d.outstanding.filter((c) => selected.includes(c.id)).reduce((s, c) => s + c.totalCents, 0);
          const nothing = d.outstanding.length === 0 && d.pending.length === 0;

          return (
            <>
              <Card>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Education Account balance:</span>
                  <strong className="text-base font-bold tabular-nums text-slate-900">
                    {d.balanceCents === null ? 'No Education Account' : formatSgd(d.balanceCents)}
                  </strong>
                </div>
              </Card>

              {nothing && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
                  You have no outstanding fees at this time.
                </div>
              )}

              {(d.outstanding.length > 0 || d.pending.length > 0) && (
                <ul className="space-y-3">
                  {d.outstanding.map((c) => (
                    <ChargeBlock key={c.id} c={c} selectable checked={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
                  ))}
                  {d.pending.map((c) => (
                    <ChargeBlock
                      key={c.id}
                      c={c}
                      selectable={false}
                      checked={false}
                      onToggle={() => undefined}
                      paymentId={d.pendingPayments[c.id]}
                    />
                  ))}
                </ul>
              )}

              {d.outstanding.length > 0 && (
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 block">Selected Total</span>
                    <span className="text-lg font-bold text-slate-900 tabular-nums">{formatSgd(total)}</span>
                  </div>
                  <Button
                    disabled={selected.length === 0}
                    onClick={() => navigate(`/eservice/children/${child.personId}/checkout?charges=${selected.join(',')}`)}
                  >
                    {`Pay selected (${formatSgd(total)})`}
                  </Button>
                </div>
              )}

              {d.paid.length > 0 && (
                <Card title="Paid History">
                  <ul className="space-y-3">
                    {d.paid.map((c) => (
                      <ChargeBlock key={c.id} c={c} selectable={false} checked={false} onToggle={() => undefined} />
                    ))}
                  </ul>
                </Card>
              )}

              <div className="pt-2">
                <Link className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1" to={`/eservice/children/${child.personId}`}>
                  Back to account
                </Link>
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
