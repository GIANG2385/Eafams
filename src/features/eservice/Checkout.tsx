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
      <h1 className="text-xl font-semibold">Pay fees for {child.name}</h1>
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
                <ul className="text-sm">
                  {info.charges.map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <span>{c.feeTypeName}</span>
                      <span>{formatSgd(c.totalCents)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t pt-2 text-right font-semibold">Total {formatSgd(info.totalCents)}</p>
              </Card>
              {!review ? (
                <Card title="Choose payment method">
                  <fieldset className="space-y-2">
                    <legend className="sr-only">Payment method</legend>
                    <label className="flex items-start gap-2">
                      <input type="radio" name="method" disabled={!info.eligibility.allowed} checked={method === 'EA'} onChange={() => setMethod('EA')} />
                      <span>
                        Education Account <span className="text-sm text-slate-600">({eaNote})</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input type="radio" name="method" checked={method === 'ONLINE'} onChange={() => setMethod('ONLINE')} />
                      <span>Online payment <span className="text-sm text-slate-600">(sandbox)</span></span>
                    </label>
                  </fieldset>
                  {!info.eligibility.allowed && info.eligibility.reason === 'INSUFFICIENT_BALANCE' && (
                    <p className="mt-2 text-sm text-amber-900">Your Education Account balance is not enough. You can pay online instead.</p>
                  )}
                  <Button className="mt-3" disabled={!method} onClick={() => setReview(true)}>
                    Review payment
                  </Button>
                </Card>
              ) : (
                <Card title="Review and confirm">
                  <p>
                    Method: <strong>{method === 'EA' ? 'Education Account' : 'Online payment'}</strong>
                  </p>
                  <p>
                    Amount: <strong>{formatSgd(info.totalCents)}</strong>
                  </p>
                  {error && (
                    <p role="alert" className="mt-2 text-rose-700">
                      {error}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" disabled={busy} onClick={() => setReview(false)}>
                      Back
                    </Button>
                    <Button disabled={busy} onClick={() => void confirm()}>
                      {busy ? 'Processing…' : `Confirm and pay ${formatSgd(info.totalCents)}`}
                    </Button>
                  </div>
                </Card>
              )}
              <Link className="text-indigo-700 underline" to={`/eservice/children/${child.personId}/charges`}>
                Back to fees
              </Link>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
