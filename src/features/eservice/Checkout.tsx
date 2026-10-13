import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { QueryState, errorMessage } from '../../components/StateView';
import { Button, Card } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import { getCheckout, payByEa, startOnline } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { useChild } from './ChildGuard';
import { newKey } from './idempotency';
import { PbiChip } from '../../components/PbiChip';

type Method = 'EA' | 'ONLINE';

export function Checkout() {
  const child = useChild();
  const { guardian } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = (params.get('charges') ?? '').split(',').filter(Boolean);
  const key = useRef(newKey()); // one key per checkout attempt (R-PAY-4)
  const [method, setMethod] = useState<Method | null>(null);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const q = useQuery({
    queryKey: ['checkout', guardian?.id, child.personId, ids.join(',')],
    queryFn: () => getCheckout(guardian!.id, child.personId, ids),
    enabled: !!guardian,
  });

  async function confirm() {
    if (!method || !guardian || busy) return;
    setBusy(true);
    setError('');
    try {
      const input = { personId: child.personId, chargeIds: ids, idempotencyKey: key.current };
      if (method === 'EA') {
        const p = await payByEa(guardian.id, input);
        navigate(`/eservice/receipt/${p.id}`);
      } else {
        const p = await startOnline(guardian.id, input);
        navigate(`/eservice/gateway/${p.id}`);
      }
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pay fees for {child.name}</h1>
        <p className="text-xs text-slate-500 font-medium">Checkout and settlement</p>
      </div>
      <PbiChip code="PB-10" check="pay once; balance and fee update together" />

      <QueryState query={q}>
        {(info) => {
          const eaNote =
            info.eligibility.allowed
              ? `balance ${formatSgd(info.balanceCents ?? 0)}`
              : info.eligibility.reason === 'NO_ACCOUNT'
                ? 'No Education Account for this student'
                : info.eligibility.reason === 'ACCOUNT_CLOSED'
                  ? 'This account is closed'
                  : `Not enough balance (${formatSgd(info.balanceCents ?? 0)} available)`;

          return (
            <>
              <Card title="Fees to pay">
                <ul className="divide-y divide-slate-100 text-sm">
                  {info.charges.map((c) => (
                    <li key={c.id} className="flex justify-between py-2 text-slate-700">
                      <span className="font-medium text-slate-800">{c.feeTypeName}</span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatSgd(c.totalCents)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="font-semibold text-slate-700">Total payable</span>
                  <span className="text-lg font-bold tabular-nums text-slate-900">{formatSgd(info.totalCents)}</span>
                </div>
              </Card>

              {!review ? (
                <Card title="Choose payment method">
                  <fieldset className="space-y-3">
                    <legend className="sr-only">Payment method</legend>
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                        !info.eligibility.allowed
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : method === 'EA'
                            ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        disabled={!info.eligibility.allowed}
                        checked={method === 'EA'}
                        onChange={() => setMethod('EA')}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">Education Account</span>
                        <span className="text-xs text-slate-500">Government subsidised account ({eaNote})</span>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                        method === 'ONLINE'
                          ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        checked={method === 'ONLINE'}
                        onChange={() => setMethod('ONLINE')}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-bold text-sm text-slate-900 block">Online payment</span>
                        <span className="text-xs text-slate-500">Credit / Debit card or PayNow (sandbox environment)</span>
                      </div>
                    </label>
                  </fieldset>

                  {!info.eligibility.allowed && info.eligibility.reason === 'INSUFFICIENT_BALANCE' && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      Your Education Account balance is not enough. You can pay online instead.
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Button disabled={!method} onClick={() => setReview(true)}>
                      Review payment
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card title="Review and confirm">
                  <div className="space-y-2 rounded-lg bg-slate-50 p-4 border border-slate-100 text-sm">
                    <p>
                      Method: <strong>{method === 'EA' ? 'Education Account' : 'Online payment'}</strong>
                    </p>
                    <p>
                      Amount: <strong>{formatSgd(info.totalCents)}</strong>
                    </p>
                  </div>

                  {error && (
                    <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      {error}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    <Button variant="secondary" disabled={busy} onClick={() => setReview(false)}>
                      Back
                    </Button>
                    <Button disabled={busy} onClick={() => void confirm()}>
                      {busy ? 'Processing settlement…' : `Confirm and pay ${formatSgd(info.totalCents)}`}
                    </Button>
                  </div>
                </Card>
              )}

              <div className="pt-2">
                <Link className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1" to={`/eservice/children/${child.personId}/charges`}>
                  Back to fees
                </Link>
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
