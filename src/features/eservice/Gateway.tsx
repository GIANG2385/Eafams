import { useQuery } from '@tanstack/react-query';
import { useState, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { IntegrationBadges } from '../../components/Shell';
import { QueryState, errorMessage } from '../../components/StateView';
import { Button, Card } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import type { GatewayOutcome } from '../../domain/types';
import { ServiceError } from '../../services/core';
import { currentGatewayMode, onDataChange } from '../../services/demo';
import { completeGateway, getPayment } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { Forbidden } from './ChildGuard';
import { PbiChip } from '../../components/PbiChip';

export function Gateway() {
  const { paymentId = '' } = useParams();
  const { guardian } = useSession();
  const navigate = useNavigate();
  const mode = useSyncExternalStore(onDataChange, currentGatewayMode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ['payment', guardian?.id, paymentId],
    queryFn: () => getPayment(guardian!.id, paymentId),
    enabled: !!guardian,
  });
  if (q.error instanceof ServiceError && q.error.code === 'FORBIDDEN') return <Forbidden />;

  async function finish(choice?: GatewayOutcome) {
    setBusy(true);
    setError('');
    try {
      await completeGateway(guardian!.id, paymentId, choice);
      navigate(`/eservice/receipt/${paymentId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <QueryState query={q}>
      {({ payment }) => {
        if (payment.status !== 'PENDING') return <Navigate to={`/eservice/receipt/${paymentId}`} replace />;
        return (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span role="note" className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                SANDBOX ENVIRONMENT – Simulated Gateway
              </span>
              <IntegrationBadges items={['Payment gateway (sandbox)']} />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Online Payment Gateway</h1>
            <PbiChip code="PB-11" check="success, failure, cancel and timeout never double-collect" />

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Payment Reference</span>
                <span className="font-mono font-bold text-slate-900">{payment.referenceNo}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200/80 pt-2 text-sm">
                <span className="text-slate-500 font-medium">Settlement Amount</span>
                <span className="text-lg font-bold text-blue-700 tabular-nums">{formatSgd(payment.totalCents)}</span>
              </div>
            </div>

            {error && <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

            {mode === 'ASK' ? (
              <div className="mt-5 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Simulate Outcome</span>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Button disabled={busy} onClick={() => void finish('SUCCEEDED')}>Simulate success</Button>
                  <Button variant="danger" disabled={busy} onClick={() => void finish('FAILED')}>Simulate failure</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void finish('CANCELLED')}>Cancel payment</Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void finish('TIMEOUT')}>Simulate timeout</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Demo setting forces outcome: <strong>{mode}</strong></p>
                <Button className="mt-3" disabled={busy} onClick={() => void finish()}>Pay now</Button>
              </div>
            )}
          </Card>
        );
      }}
    </QueryState>
  );
}
