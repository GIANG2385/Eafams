import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card } from '../../components/ui';
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
          payment.status === 'SUCCEEDED'
            ? 'Payment successful'
            : payment.status === 'PENDING'
              ? 'Payment pending'
              : payment.status === 'CANCELLED'
                ? 'Payment cancelled'
                : 'Payment failed';

        const statusTone =
          payment.status === 'SUCCEEDED'
            ? 'green'
            : payment.status === 'PENDING'
              ? 'amber'
              : 'red';

        return (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{heading}</h1>
              <Badge tone={statusTone}>{payment.status}</Badge>
            </div>
            <PbiChip code="PB-10" check="reference and result of the payment" />

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <dl className="grid grid-cols-2 gap-y-2 text-xs sm:text-sm">
                <dt className="text-slate-500 font-medium">Reference No.</dt>
                <dd className="font-mono font-semibold text-slate-900">{payment.referenceNo}</dd>
                <dt className="text-slate-500 font-medium">Student</dt>
                <dd className="font-semibold text-slate-900">{childName}</dd>
                <dt className="text-slate-500 font-medium">Payment Method</dt>
                <dd className="text-slate-800">{payment.method === 'EA' ? 'Education Account' : 'Online payment (sandbox)'}</dd>
                <dt className="text-slate-500 font-medium">Date &amp; Time</dt>
                <dd className="text-slate-800">{payment.createdAt}</dd>
                <dt className="text-slate-500 font-medium pt-1 border-t border-slate-200">Total Settlement</dt>
                <dd className="font-bold text-base text-blue-700 tabular-nums pt-1 border-t border-slate-200">{formatSgd(payment.totalCents)}</dd>
              </dl>
            </div>

            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">Itemized Charges</span>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm">
                {charges.map((c) => (
                  <li key={c.id} className="flex justify-between p-3">
                    <span className="text-slate-800 font-medium">{c.feeTypeName}</span>
                    <span className="font-semibold tabular-nums text-slate-900">{formatSgd(c.totalCents)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {payment.status === 'PENDING' && (
              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs text-amber-900 font-medium">We have not received a confirmation yet. Your fees are held and will not be charged twice.</p>
                <Button className="mt-3 text-xs" onClick={() => void check()}>
                  Check status
                </Button>
                {note && <p role="status" className="mt-2 text-xs font-medium text-amber-800">{note}</p>}
              </div>
            )}

            {(payment.status === 'FAILED' || payment.status === 'CANCELLED') && (
              <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs text-rose-900 font-medium">Nothing was charged and your fee account is unchanged.</p>
                <div className="mt-3 flex gap-2">
                  <Link className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all" to={retry}>
                    Retry payment
                  </Link>
                  <Link className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-all" to="/eservice/children">
                    Exit
                  </Link>
                </div>
              </div>
            )}

            {payment.status === 'SUCCEEDED' && (
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                <Button variant="secondary" className="print:hidden text-xs" onClick={() => window.print()}>
                  Print receipt
                </Button>
                <Link className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors" to={`/eservice/children/${payment.personId}`}>
                  Back to account
                </Link>
              </div>
            )}
          </Card>
        );
      }}
    </QueryState>
  );
}
