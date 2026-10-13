import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Button, Card, Field } from '../../components/ui';
import type { ChargePreview } from '../../domain/batch';
import { formatSgd } from '../../domain/money';
import type { BatchTarget } from '../../domain/types';
import { listStructure, listSchools, listStudents } from '../../services/admin';
import { listBatches, listFeeConfig, previewFeeBatch, publishFeeBatch } from '../../services/fees';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

type Kind = BatchTarget['kind'];

export function FeeBatch() {
  const { actor } = useSession();
  const structure = useQuery({ queryKey: ['structure', actor], queryFn: () => listStructure(actor) });
  const config = useQuery({ queryKey: ['fee-config', actor], queryFn: () => listFeeConfig(actor) });
  const schools = useQuery({ queryKey: ['schools', actor], queryFn: () => listSchools(actor) });
  const students = useQuery({ queryKey: ['students', actor], queryFn: () => listStudents(actor) });
  const batches = useQuery({ queryKey: ['batches', actor], queryFn: () => listBatches(actor) });
  const [schoolId, setSchoolId] = useState('');
  const [feeTypeId, setFeeTypeId] = useState('');
  const [kind, setKind] = useState<Kind>('CLASS');
  const [ids, setIds] = useState<string[]>([]);
  const [dueOn, setDueOn] = useState('2026-11-30');
  const [preview, setPreview] = useState<ChargePreview[] | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState('');

  const sid = actor.kind === 'SCHOOL' ? actor.schoolId : schoolId || schools.data?.[0]?.id || '';
  const ftid = feeTypeId || config.data?.types.find((t) => t.type.status === 'ACTIVE')?.type.id || '';
  const levels = structure.data?.levels.filter((l) => l.schoolId === sid && l.status === 'ACTIVE') ?? [];
  const classes = structure.data?.classes.filter((c) => levels.some((l) => l.id === c.levelId) && c.status === 'ACTIVE') ?? [];
  const allClasses = structure.data?.classes.filter((c) => structure.data?.levels.some((l) => l.id === c.levelId && l.schoolId === sid)) ?? [];
  const candidates = (students.data ?? []).filter(
    (s) => s.enrolmentStatus === 'ENROLLED' && allClasses.some((c) => c.id === s.classId),
  );
  const input = { schoolId: sid, feeTypeId: ftid, target: { kind, ids } as BatchTarget, dueOn };
  const options =
    kind === 'CLASS'
      ? classes.map((c) => ({ id: c.id, label: `${levels.find((l) => l.id === c.levelId)?.name} · ${c.name}` }))
      : kind === 'LEVEL'
        ? levels.map((l) => ({ id: l.id, label: l.name }))
        : candidates.map((s) => ({ id: s.personId, label: `${s.name} · ${s.className}` }));
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const inFlight = useRef(false);
  async function run(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await fn();
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Fee batches</h2>
      <PbiChip code="PB-13" check="charge appears against the right student" />
      <p className="text-sm text-slate-600">Select students and a fee type, preview the charges, then publish. Published charges appear in the parents’ portal.</p>
      {done !== null && (
        <p role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3">
          Student fees ready: {done} {done === 1 ? 'charge' : 'charges'} created.
        </p>
      )}
      {!preview ? (
        <Card title="Select targets">
          <div className="grid gap-3 sm:grid-cols-4">
            {actor.kind === 'HQ' ? (
              <div>
                <label htmlFor="b-school" className="block text-sm font-medium">School</label>
                <select id="b-school" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={sid} onChange={(e) => { setSchoolId(e.target.value); setIds([]); }}>
                  {schools.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            ) : (
              <p className="self-end text-sm">School: <strong>{schools.data?.[0]?.name}</strong></p>
            )}
            <div>
              <label htmlFor="b-type" className="block text-sm font-medium">Fee type</label>
              <select id="b-type" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={ftid} onChange={(e) => setFeeTypeId(e.target.value)}>
                {config.data?.types.filter((t) => t.type.status === 'ACTIVE').map((t) => <option key={t.type.id} value={t.type.id}>{t.type.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="b-kind" className="block text-sm font-medium">Apply to</label>
              <select id="b-kind" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={kind} onChange={(e) => { setKind(e.target.value as Kind); setIds([]); }}>
                <option value="CLASS">Classes</option>
                <option value="LEVEL">Levels</option>
                <option value="STUDENTS">Students</option>
              </select>
            </div>
            <Field id="b-due" label="Due date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </div>
          <fieldset className="mt-3 flex flex-wrap gap-3">
            <legend className="text-sm font-medium">{{ CLASS: 'Classes', LEVEL: 'Levels', STUDENTS: 'Students' }[kind]}</legend>
            {options.map((o) => (
              <label key={o.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={ids.includes(o.id)} onChange={() => toggle(o.id)} />
                {o.label}
              </label>
            ))}
          </fieldset>
          {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
          <Button className="mt-3" onClick={() => void run(async () => { setDone(null); setPreview(await previewFeeBatch(actor, input)); })}>
            Preview charges
          </Button>
        </Card>
      ) : (
        <Card title="Charge preview">
          <table aria-label="Charge preview" className="w-full text-sm">
            <thead><tr className="text-left text-slate-600"><th>Student</th><th>Components</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.personId} className="border-t border-slate-100">
                  <td className="py-1">{r.name}</td>
                  <td>{r.lines.map((l) => `${l.label} ${formatSgd(l.amountCents)}`).join(' · ')}</td>
                  <td className="text-right">{formatSgd(r.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length === 0 && <p className="mt-2 text-sm">No enrolled students match this selection.</p>}
          {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setPreview(null)}>Revise</Button>
            <Button disabled={preview.length === 0} onClick={() => void run(async () => {
              const r = await publishFeeBatch(actor, input);
              setDone(r.created);
              setPreview(null);
              setIds([]);
            })}>Publish batch</Button>
          </div>
        </Card>
      )}
      <Card title="Published batches">
        <QueryState query={batches} isEmpty={(d) => d.length === 0} emptyText="No batches yet.">
          {(rows) => (
            <ul className="text-sm">
              {rows.map((r) => (
                <li key={r.batch.id}>{r.schoolName} · {r.feeTypeName} · {r.chargeCount} charges · due {r.batch.dueOn}</li>
              ))}
            </ul>
          )}
        </QueryState>
      </Card>
    </div>
  );
}
