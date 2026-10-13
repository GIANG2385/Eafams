import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { QueryState } from '../../components/StateView';
import { Badge, Card } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import { listChildren } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

export function Children() {
  const { guardian } = useSession();
  const q = useQuery({ queryKey: ['children', guardian?.id], queryFn: () => listChildren(guardian!.id), enabled: !!guardian });
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">My children</h1>
      <PbiChip code="PB-07" check="only linked children are listed" />
      <QueryState query={q} isEmpty={(d) => d.length === 0} emptyText="No children are linked to your account.">
        {(kids) => (
          <ul className="grid gap-3 sm:grid-cols-2">
            {kids.map((k) => (
              <li key={k.personId}>
                <Card>
                  <Link className="text-lg font-medium text-indigo-700 underline" to={`/eservice/children/${k.personId}`}>
                    {k.name}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {k.schoolName} · {k.className}
                  </p>
                  <p className="mt-2 text-sm">
                    {k.account ? (
                      <>
                        <Badge tone={k.account.status === 'ACTIVE' ? 'green' : 'slate'}>{k.account.status === 'ACTIVE' ? 'Active' : 'Closed'}</Badge>{' '}
                        {formatSgd(k.account.balanceCents)}
                      </>
                    ) : (
                      <Badge>No Education Account</Badge>
                    )}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
