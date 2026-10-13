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
  const q = useQuery({
    queryKey: ['children', guardian?.id],
    queryFn: () => listChildren(guardian!.id),
    enabled: !!guardian,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">My children</h1>
        <p className="text-xs text-slate-500 mt-0.5">Linked student profiles under your guardianship</p>
      </div>
      <PbiChip code="PB-07" check="only linked children are listed" />

      <QueryState query={q} isEmpty={(d) => d.length === 0} emptyText="No children are linked to your account.">
        {(kids) => (
          <ul className="grid gap-4 sm:grid-cols-2">
            {kids.map((k) => (
              <li key={k.personId}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-800 font-bold text-sm shadow-2xs">
                        {k.name.charAt(0)}
                      </div>
                      <div>
                        <Link
                          className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors block"
                          to={`/eservice/children/${k.personId}`}
                        >
                          {k.name}
                        </Link>
                        <p className="text-xs text-slate-500 font-medium">
                          {k.schoolName} · {k.className}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-100">
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Account Balance
                      </span>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                        {k.account ? (
                          <>
                            <span className="mr-2 font-bold text-base text-blue-700">
                              {formatSgd(k.account.balanceCents)}
                            </span>
                            <Badge tone={k.account.status === 'ACTIVE' ? 'green' : 'slate'}>
                              {k.account.status === 'ACTIVE' ? 'Active' : 'Closed'}
                            </Badge>
                          </>
                        ) : (
                          <Badge>No Education Account</Badge>
                        )}
                      </p>
                    </div>

                    <Link
                      to={`/eservice/children/${k.personId}`}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <span>Manage</span>
                      <span>→</span>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
