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

function ChargeBlock({ c, selectable, checked, onToggle, paymentId }: { c: Charge; selectable: boolean; checked: boolean; onToggle: () => void; paymentId?: string }) {
  return (
    <li className="rounded border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-start gap-2">
          {selectable && (
            <input type="checkbox" aria-label={`Select ${c.feeTypeName}`} checked={checked} onChange={onToggle} className="mt-1" />
          )}
          <span>
            <span className="font-medium">{c.feeTypeName}</span>
            <span className="block text-xs text-slate-600">Due {c.dueOn}</span>
          </span>
        </label>
        {c.status === 'PENDING_PAYMENT' && (
          <span className="flex items-center gap-2">
            <Badge tone="amber">Payment pending</Badge>
            {paymentId && (
              <Link className="text-sm text-indigo-700 underline" to={`/eservice/receipt/${paymentId}`}>
                Check payment status
              </Link>
            )}
          </span>
        )}
        {c.status === 'PAID' && <Badge tone="green">Paid</Badge>}
      </div>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {c.lines.map((l) => (
            <tr key={l.componentId}>
              <td>{l.label}</td>
              <td className="text-right">{formatSgd(l.amountCents)}</td>
            </tr>
          ))}
          <tr>
            <td>Subsidy</td>
            <td className="text-right">{formatSgd(c.subsidyCents)}</td>
          </tr>
          <tr className="border-t border-slate-200 font-semibold">
            <td>Total</td>
            <td className="text-right">{formatSgd(c.totalCents)}</td>
          </tr>
        </tbody>
      </table>
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
      <h1 className="text-xl font-semibold">Fees for {child.name}</h1>
      <PbiChip code="PB-09" check="fees with components, GST and total" />
      <IntegrationBadges items={['Charge source (proposed batch, unconfirmed)']} />
      <QueryState query={q}>
        {(d) => {
          const total = d.outstanding.filter((c) => selected.includes(c.id)).reduce((s, c) => s + c.totalCents, 0);
          const nothing = d.outstanding.length === 0 && d.pending.length === 0;
          return (
            <>
              <Card>
                <p>
                  <span>Education Account balance: </span>
                  <strong>{d.balanceCents === null ? 'No Education Account' : formatSgd(d.balanceCents)}</strong>
                </p>
              </Card>
              {nothing && <p>You have no outstanding fees.</p>}
              {(d.outstanding.length > 0 || d.pending.length > 0) && (
                <ul className="space-y-3">
                  {d.outstanding.map((c) => (
                    <ChargeBlock key={c.id} c={c} selectable checked={selected.includes(c.id)} onToggle={() => toggle(c.id)} />
                  ))}
                  {d.pending.map((c) => (
                    <ChargeBlock key={c.id} c={c} selectable={false} checked={false} onToggle={() => undefined} paymentId={d.pendingPayments[c.id]} />
                  ))}
                </ul>
              )}
              {d.outstanding.length > 0 && (
                <Button
                  disabled={selected.length === 0}
                  onClick={() => navigate(`/eservice/children/${child.personId}/checkout?charges=${selected.join(',')}`)}
                >
                  {`Pay selected (${formatSgd(total)})`}
                </Button>
              )}
              {d.paid.length > 0 && (
                <Card title="Paid">
                  <ul className="space-y-3">
                    {d.paid.map((c) => (
                      <ChargeBlock key={c.id} c={c} selectable={false} checked={false} onToggle={() => undefined} />
                    ))}
                  </ul>
                </Card>
              )}
              <Link className="text-indigo-700 underline" to={`/eservice/children/${child.personId}`}>
                Back to account
              </Link>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
