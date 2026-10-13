import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import { can } from '../../domain/permissions';
import { listFeeConfig, saveComponent, saveFeeType, setFeeStatus } from '../../services/fees';
import type { FeeComponent } from '../../domain/types';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

const BLANK_C = { id: undefined as string | undefined, code: '', name: '', calcType: 'FIXED' as 'FIXED' | 'PERCENT', amount: '', rate: '', from: '2026-01-01', to: '' };
const BLANK_T = { id: undefined as string | undefined, code: '', name: '', description: '', componentIds: [] as string[] };

export function FeeConfig() {
  const { actor } = useSession();
  const q = useQuery({ queryKey: ['fee-config', actor], queryFn: () => listFeeConfig(actor) });
  const [c, setC] = useState(BLANK_C);
  const [t, setT] = useState(BLANK_T);
  const [error, setError] = useState('');
  const canEdit = can(actor, 'CREATE', 'FEE_TYPE');
  const editComponent = (x: FeeComponent) =>
    setC({
      id: x.id, code: x.code, name: x.name, calcType: x.calcType,
      amount: x.calcType === 'FIXED' ? (x.amountCents / 100).toFixed(2) : '',
      rate: x.calcType === 'PERCENT' ? String(x.rateBp / 100) : '',
      from: x.effectiveFrom, to: x.effectiveTo ?? '',
    });
  const inFlight = useRef(false);
  const run = async (fn: () => Promise<unknown>, reset: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await fn();
      reset();
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Fee types and components</h2>
      <PbiChip code="PB-12" check="fee type and component can be configured" />
      {!canEdit && <p className="text-sm text-slate-600">Fee configuration is maintained by HQ. You can view it here.</p>}
      <QueryState query={q}>
        {({ types, components }) => (
          <>
            <ul className="space-y-2">
              {types.map((v) => (
                <li key={v.type.id} className="rounded border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <strong>{v.type.name}</strong>
                    <Badge tone={v.type.status === 'ACTIVE' ? 'green' : 'slate'}>{v.type.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                    {canEdit && (
                      <Button variant="secondary" aria-label={`Edit fee type ${v.type.name}`}
                        onClick={() => setT({ id: v.type.id, code: v.type.code, name: v.type.name, description: v.type.description, componentIds: v.components.map((x) => x.id) })}>
                        Edit
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="secondary" onClick={() => void run(() => setFeeStatus(actor, 'TYPE', v.type.id, v.type.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'), () => undefined)}>
                        {v.type.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">
                    {v.components.map((x) => x.name).join(' + ')} · example total {formatSgd(v.exampleTotalCents)}
                  </p>
                </li>
              ))}
            </ul>
            <Card title="Components (reusable across fee types)">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-600"><th>Code</th><th>Name</th><th>Calculation</th><th>Effective</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {components.map((x) => (
                    <tr key={x.id} className="border-t border-slate-100">
                      <td className="py-1">{x.code}</td>
                      <td>{x.name}</td>
                      <td>{x.calcType === 'FIXED' ? formatSgd(x.amountCents) : `${x.rateBp / 100}% of subtotal`}</td>
                      <td>{x.effectiveFrom} → {x.effectiveTo ?? 'open'}</td>
                      <td>{x.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                      <td className="space-x-2 text-right">
                        {canEdit && (
                          <>
                            <Button variant="secondary" aria-label={`Edit component ${x.name}`} onClick={() => editComponent(x)}>Edit</Button>
                            <Button variant="secondary"
                              aria-label={`${x.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} component ${x.name}`}
                              onClick={() => void run(() => setFeeStatus(actor, 'COMPONENT', x.id, x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'), () => undefined)}>
                              {x.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            {canEdit && (
              <>
                <Card title={c.id ? 'Edit component' : 'Add component'}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="comp-code" label="Component code" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
                    <Field id="comp-name" label="Component name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
                    <div>
                      <label htmlFor="comp-type" className="block text-sm font-medium">Calculation</label>
                      <select id="comp-type" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={c.calcType} onChange={(e) => setC({ ...c, calcType: e.target.value as 'FIXED' | 'PERCENT' })}>
                        <option value="FIXED">Fixed amount</option>
                        <option value="PERCENT">Percent of subtotal</option>
                      </select>
                    </div>
                    {c.calcType === 'FIXED' ? (
                      <Field id="comp-amount" label="Amount (S$)" inputMode="decimal" value={c.amount} onChange={(e) => setC({ ...c, amount: e.target.value })} />
                    ) : (
                      <Field id="comp-rate" label="Rate (%)" inputMode="decimal" value={c.rate} onChange={(e) => setC({ ...c, rate: e.target.value })} />
                    )}
                    <Field id="comp-from" label="Effective from" value={c.from} onChange={(e) => setC({ ...c, from: e.target.value })} />
                    <Field id="comp-to" label="Effective to (optional)" value={c.to} onChange={(e) => setC({ ...c, to: e.target.value })} />
                  </div>
                  <Button className="mt-3" onClick={() => void run(() => saveComponent(actor, {
                    id: c.id, code: c.code, name: c.name, calcType: c.calcType,
                    amountCents: Math.round(Number(c.amount || '0') * 100), rateBp: Math.round(Number(c.rate || '0') * 100),
                    effectiveFrom: c.from, effectiveTo: c.to,
                  }), () => setC(BLANK_C))}>{c.id ? 'Save component' : 'Add component'}</Button>
                  {c.id && <Button className="ml-2 mt-3" variant="secondary" onClick={() => setC(BLANK_C)}>Cancel</Button>}
                </Card>
                <Card title={t.id ? 'Edit fee type' : 'Add fee type'}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field id="ft-code" label="Fee type code" value={t.code} onChange={(e) => setT({ ...t, code: e.target.value })} />
                    <Field id="ft-name" label="Fee type name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
                    <Field id="ft-desc" label="Description" value={t.description} onChange={(e) => setT({ ...t, description: e.target.value })} />
                  </div>
                  <fieldset className="mt-3 flex flex-wrap gap-3">
                    <legend className="text-sm font-medium">Components</legend>
                    {components.filter((x) => x.status === 'ACTIVE' || t.componentIds.includes(x.id)).map((x) => (
                      <label key={x.id} className="flex items-center gap-1 text-sm">
                        <input type="checkbox" checked={t.componentIds.includes(x.id)}
                          onChange={() => setT({ ...t, componentIds: t.componentIds.includes(x.id) ? t.componentIds.filter((i) => i !== x.id) : [...t.componentIds, x.id] })} />
                        {x.name}
                      </label>
                    ))}
                  </fieldset>
                  <Button className="mt-3" onClick={() => void run(() => saveFeeType(actor, t), () => setT(BLANK_T))}>{t.id ? 'Save fee type' : 'Add fee type'}</Button>
                  {t.id && <Button className="ml-2 mt-3" variant="secondary" onClick={() => setT(BLANK_T)}>Cancel</Button>}
                </Card>
              </>
            )}
            {error && <p role="alert" className="text-rose-700">{error}</p>}
          </>
        )}
      </QueryState>
    </div>
  );
}
