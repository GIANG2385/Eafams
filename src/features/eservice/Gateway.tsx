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
            <p role="note" className="mb-3 rounded bg-sky-100 p-2 text-sm text-sky-950">
              SANDBOX – no real payment is made
            </p>
            <IntegrationBadges items={['Payment gateway (sandbox)']} />
            <h1 className="mt-3 text-xl font-semibold">Online payment</h1>
            <PbiChip code="PB-11" check="success, failure, cancel and timeout never double-collect" />
            <p className="text-sm">
              Reference {payment.referenceNo} · {formatSgd(payment.totalCents)}
            </p>
            {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
            {mode === 'ASK' ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button disabled={busy} onClick={() => void finish('SUCCEEDED')}>Simulate success</Button>
                <Button variant="danger" disabled={busy} onClick={() => void finish('FAILED')}>Simulate failure</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void finish('CANCELLED')}>Cancel payment</Button>
                <Button variant="secondary" disabled={busy} onClick={() => void finish('TIMEOUT')}>Simulate timeout</Button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-slate-600">Demo setting forces the result: {mode}</p>
                <Button className="mt-2" disabled={busy} onClick={() => void finish()}>Pay now</Button>
              </div>
            )}
          </Card>
        );
      }}
    </QueryState>
  );
}
