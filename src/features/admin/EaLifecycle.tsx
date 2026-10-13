import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { formatSgd } from '../../domain/money';
import type { JobResult, JobRun } from '../../domain/types';
import { listEaOverview, listRuns, runClosureJob, runCreationJob } from '../../services/jobs';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

const VERDICT: Record<string, string> = {
  ELIGIBLE: 'Eligible',
  UNDER_7: 'Under 7',
  AT_OR_OVER_16: '16 or over',
  NOT_CITIZEN: 'Not a Singapore Citizen',
  MISSING_DATA: 'Missing data',
  ALREADY_HAS_ACCOUNT: 'Has account',
};

function describe(r: JobResult): string {
  switch (r.outcome) {
    case 'CREATED': return 'Created';
    case 'CLOSED': return `Closed – ${formatSgd(r.amountCents ?? 0)} transferred to CPF`;
    case 'BLOCKED_PENDING': return 'Blocked – pending transaction, retry after it settles';
    case 'TRANSFER_FAILED': return `Transfer failed – ${formatSgd(r.amountCents ?? 0)} stays in the account, retry later`;
    default: return `Skipped${r.reason ? ` – ${VERDICT[r.reason] ?? r.reason}` : ''}`;
  }
}

export function EaLifecycle() {
  const { actor } = useSession();
  const [asOf, setAsOf] = useState('');
  const [run, setRun] = useState<JobRun | null>(null);
  const [error, setError] = useState('');
  const overview = useQuery({ queryKey: ['ea-overview', actor, asOf], queryFn: () => listEaOverview(actor, asOf || undefined) });
  const history = useQuery({ queryKey: ['ea-runs', actor], queryFn: () => listRuns(actor), enabled: actor.kind === 'HQ' });
  const isHq = actor.kind === 'HQ';

  async function go(fn: () => Promise<JobRun>) {
    try {
      setRun(await fn());
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const created = run?.results.filter((r) => r.outcome === 'CREATED').length ?? 0;
  const shown = run?.results.filter((r) => r.outcome !== 'SKIPPED' || run.kind === 'EA_CREATE') ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Education Accounts</h2>
      <PbiChip code="PB-05" check="eligible gets an account once; ineligible does not" />
      <Badge tone="blue">CPF transfer (simulated)</Badge>
      {isHq ? (
        <Card title="Run jobs">
          <p className="mb-2 text-sm text-slate-600">In production these run automatically every day at 00:00. Run them here with any as-of date.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field id="asof" label="As of (YYYY-MM-DD, blank = today)" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
            <Button onClick={() => void go(() => runCreationJob(actor, asOf || undefined))}>Run age-7 job</Button>
            <Button variant="secondary" onClick={() => void go(() => runClosureJob(actor, asOf || undefined))}>Run closure job (age 16)</Button>
          </div>
          {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
        </Card>
      ) : (
        <p className="text-sm text-slate-600">Jobs are run by HQ. You can see the students of your school below.</p>
      )}
      {run && (
        <section role="region" aria-label="Job result" className="rounded border border-slate-300 bg-white p-3">
          <h3 className="font-semibold">{run.kind === 'EA_CREATE' ? 'Creation job' : 'Closure job'} as of {run.asOf}</h3>
          {run.kind === 'EA_CREATE' && <p className="text-sm">{created} created</p>}
          {shown.length === 0 && <p className="text-sm">No accounts were due.</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {shown.map((r, i) => (
              <li key={i}><strong>{r.label}</strong> <span>{describe(r)}</span></li>
            ))}
          </ul>
        </section>
      )}
      <QueryState query={overview} isEmpty={(d) => d.length === 0} emptyText="No students in scope.">
        {(rows) => (
          <table aria-label="Education accounts" className="w-full text-sm">
            <thead><tr className="text-left text-slate-600"><th>Student</th><th>DOB</th><th>Citizenship</th><th>Eligibility</th><th>Account</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.personId} className="border-t border-slate-100">
                  <td className="py-1">{r.name}</td>
                  <td>{r.dob ?? '—'}</td>
                  <td>{r.citizenship ?? '—'}</td>
                  <td>{VERDICT[r.verdict]}</td>
                  <td>{r.accountStatus ? (r.accountStatus === 'ACTIVE' ? 'Active' : 'Closed') : 'None'}</td>
                  <td className="text-right">{r.balanceCents === null ? '—' : formatSgd(r.balanceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </QueryState>
      {isHq && (
        <Card title="Job history">
          <QueryState query={history} isEmpty={(d) => d.length === 0} emptyText="No jobs run yet.">
            {(runs) => (
              <ul className="text-sm">
                {runs.map((r) => (
                  <li key={r.id}>{r.kind === 'EA_CREATE' ? 'Creation' : r.kind === 'EA_CLOSE' ? 'Closure' : 'Import'} · as of {r.asOf} · {r.results.length} results</li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>
      )}
    </div>
  );
}
