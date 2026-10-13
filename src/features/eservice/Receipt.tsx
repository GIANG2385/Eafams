import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QueryState, errorMessage } from '../../components/StateView';
import { Button, Card } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import { ServiceError } from '../../services/core';
import { checkPaymentStatus, getPayment } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { Forbidden } from './ChildGuard';
import { PbiChip } from '../../components/PbiChip';

export function Receipt() {
  const { paymentId = '' } = useParams();
  const { guardian } = useSession();
  const [note, setNote] = useState('');
  const q = useQuery({
    queryKey: ['payment', guardian?.id, paymentId],
    queryFn: () => getPayment(guardian!.id, paymentId),
    enabled: !!guardian,
  });
  if (q.error instanceof ServiceError && q.error.code === 'FORBIDDEN') return <Forbidden />;

  async function check() {
    try {
      const p = await checkPaymentStatus(guardian!.id, paymentId);
      setNote(p.status === 'PENDING' ? 'Still waiting for the payment provider. Please check again shortly.' : '');
    } catch (e) {
      setNote(errorMessage(e));
    }
  }

  return (
    <QueryState query={q}>
      {({ payment, charges, childName }) => {
        const retry = `/eservice/children/${payment.personId}/checkout?charges=${payment.chargeIds.join(',')}`;
        const heading =
          payment.status === 'SUCCEEDED' ? 'Payment successful'
          : payment.status === 'PENDING' ? 'Payment pending'
          : payment.status === 'CANCELLED' ? 'Payment cancelled'
          : 'Payment failed';
        return (
          <Card>
            <h1 className="text-xl font-semibold">{heading}</h1>
      <PbiChip code="PB-10" check="reference and result of the payment" />
            <dl className="mt-3 grid grid-cols-2 gap-1 text-sm">
              <dt>Reference</dt><dd>{payment.referenceNo}</dd>
              <dt>Student</dt><dd>{childName}</dd>
              <dt>Method</dt><dd>{payment.method === 'EA' ? 'Education Account' : 'Online payment (sandbox)'}</dd>
              <dt>Date</dt><dd>{payment.createdAt}</dd>
              <dt>Amount</dt><dd>{formatSgd(payment.totalCents)}</dd>
            </dl>
            <ul className="mt-3 text-sm">
              {charges.map((c) => (
                <li key={c.id}>{c.feeTypeName}: {formatSgd(c.totalCents)}</li>
              ))}
            </ul>
            {payment.status === 'PENDING' && (
              <div className="mt-3">
                <p>We have not received a confirmation yet. Your fees are held and will not be charged twice.</p>
                <Button className="mt-2" onClick={() => void check()}>Check status</Button>
                {note && <p role="status" className="mt-2 text-sm">{note}</p>}
              </div>
            )}
            {(payment.status === 'FAILED' || payment.status === 'CANCELLED') && (
              <div className="mt-3">
                <p>Nothing was charged and your fees are unchanged.</p>
                <div className="mt-2 flex gap-3">
                  <Link className="rounded bg-indigo-700 px-3 py-2 text-sm text-white" to={retry}>Retry</Link>
                  <Link className="rounded border border-slate-400 px-3 py-2 text-sm" to="/eservice/children">Exit</Link>
                </div>
              </div>
            )}
            {payment.status === 'SUCCEEDED' && (
              <div className="mt-3 flex gap-3">
                <Button variant="secondary" className="print:hidden" onClick={() => window.print()}>Print receipt</Button>
                <Link className="text-indigo-700 underline" to={`/eservice/children/${payment.personId}`}>Back to account</Link>
              </div>
            )}
          </Card>
        );
      }}
    </QueryState>
  );
}
