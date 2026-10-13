import { useState } from 'react';
import { errorMessage } from '../../components/StateView';
import { Badge, Button, Card } from '../../components/ui';
import type { RejectReason } from '../../domain/importer';
import type { JobRun } from '../../domain/types';
import { previewSource, runImportJob } from '../../services/jobs';
import type { SourcePreviewRow } from '../../services/jobs';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

const REASON: Record<RejectReason, string> = {
  MISSING_PERSON_ID: 'Missing person ID',
  MISSING_NAME: 'Missing name',
  MISSING_DOB: 'Missing date of birth',
  INVALID_DOB: 'Invalid date of birth',
  INVALID_CITIZENSHIP: 'Invalid citizenship',
};

export function Import() {
  const { actor } = useSession();
  const [rows, setRows] = useState<SourcePreviewRow[] | null>(null);
  const [run, setRun] = useState<JobRun | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (actor.kind !== 'HQ') {
    return <p>Only HQ can import student data from the external source.</p>;
  }
  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setRows(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const valid = rows?.filter((r) => r.ok).length ?? 0;
  const count = (o: string) => run?.results.filter((r) => r.outcome === o).length ?? 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Import students</h2>
      <PbiChip code="PB-04" check="sample record loads with validation" />
      <Badge tone="blue">Student source (mock)</Badge>
      <p className="text-sm text-slate-600">Reads name, date of birth, citizenship and address. Class and enrolment stay as maintained by schools.</p>
      <Button disabled={busy} onClick={() => void guard(async () => { setRun(null); setRows(await previewSource(actor)); })}>
        Preview source
      </Button>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {rows && (
        <Card title="Source preview">
          <table aria-label="Source preview" className="w-full text-sm">
            <thead><tr className="text-left text-slate-600"><th>Person ID</th><th>Name</th><th>DOB</th><th>Citizenship</th><th>Result</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1">{r.record.personId ?? '—'}</td>
                  <td>{r.record.name ?? '—'}</td>
                  <td>{r.record.dob ?? '—'}</td>
                  <td>{r.record.citizenship ?? '—'}</td>
                  <td>
                    {r.ok ? <Badge tone="green">{r.existing ? 'Will update' : 'Will create'}</Badge> : <Badge tone="red">{r.reasons.map((x) => REASON[x]).join(', ')}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button className="mt-3" disabled={busy || valid === 0} onClick={() => void guard(async () => { setRun(await runImportJob(actor)); })}>
            {`Import ${valid} valid records`}
          </Button>
        </Card>
      )}
      {run && (
        <div role="status" aria-label="Import result" className="rounded border border-emerald-300 bg-emerald-50 p-3">
          Import finished: {count('CREATED')} created, {count('UPDATED')} updated, {count('REJECTED')} rejected.
        </div>
      )}
    </div>
  );
}
