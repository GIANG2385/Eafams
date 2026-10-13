import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { errorMessage } from '../../components/StateView';
import { Button, Card } from '../../components/ui';
import { ServiceError } from '../../services/core';
import { getChild } from '../../services/parent';
import type { ChildSummary } from '../../services/parent';
import { useSession } from '../session/SessionProvider';

export function Forbidden() {
  return (
    <Card>
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2">You do not have access to this student’s records.</p>
      <Link className="mt-3 inline-block text-indigo-700 underline" to="/eservice/children">
        Back to my children
      </Link>
    </Card>
  );
}

export function useChild(): ChildSummary {
  return useOutletContext<ChildSummary>();
}

/** Layout route: every /children/:personId/* page is behind this access check (R-ACC-1). */
export function ChildGuard() {
  const { personId = '' } = useParams();
  const { guardian } = useSession();
  const q = useQuery({
    queryKey: ['child', guardian?.id, personId],
    queryFn: () => getChild(guardian!.id, personId),
    enabled: !!guardian,
  });
  if (q.isPending) return <p role="status">Loading…</p>;
  if (q.error instanceof ServiceError && q.error.code === 'FORBIDDEN') return <Forbidden />;
  if (q.isError) {
    return (
      <div role="alert">
        <p>{errorMessage(q.error)}</p>
        <Button variant="secondary" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }
  return <Outlet context={q.data} />;
}
