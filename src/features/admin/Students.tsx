import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import type { EnrolmentStatus } from '../../domain/types';
import { listStructure, listStudents, saveStudent } from '../../services/admin';
import type { StudentRow } from '../../services/admin';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

const BLANK = { name: '', dob: '', citizenship: '', address: '', classId: '', enrolmentStatus: 'ENROLLED' };

export function Students() {
  const { actor } = useSession();
  const rows = useQuery({ queryKey: ['students', actor], queryFn: () => listStudents(actor) });
  const structure = useQuery({ queryKey: ['structure', actor], queryFn: () => listStructure(actor) });
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const [editing, setEditing] = useState<string | null>(null);
  const inFlight = useRef(false);

  function edit(s: StudentRow) {
    setEditing(s.personId);
    setForm({ name: s.name, dob: s.dob ?? '', citizenship: s.citizenship ?? '', address: s.address, classId: s.classId ?? '', enrolmentStatus: s.enrolmentStatus });
    setError('');
  }

  async function save() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await saveStudent(actor, { personId: editing ?? undefined, ...form, classId: form.classId || null, enrolmentStatus: form.enrolmentStatus as EnrolmentStatus });
      setForm(BLANK);
      setEditing(null);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      inFlight.current = false;
    }
  }
  const classes = structure.data?.classes.filter((c) => c.status === 'ACTIVE') ?? [];
  const levelName = (id: string) => structure.data?.levels.find((l) => l.id === id)?.name ?? '';
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Students</h2>
      <PbiChip code="PB-02" check="register, assign class, change enrolment" />
      <QueryState query={rows} isEmpty={(d) => d.length === 0} emptyText="No students in scope.">
        {(list) => (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th>Name</th><th>Person ID</th><th>DOB</th><th>Citizenship</th><th>School / class</th><th>Enrolment</th><th>Education Account</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.personId} className="border-t border-slate-100">
                  <td className="py-1">{s.name}</td><td>{s.personId}</td><td>{s.dob ?? '—'}</td><td>{s.citizenship ?? '—'}</td>
                  <td>{s.schoolName} · {s.className}</td>
                  <td>{s.enrolmentStatus.charAt(0) + s.enrolmentStatus.slice(1).toLowerCase()}</td>
                  <td>{s.accountStatus ? <Badge tone={s.accountStatus === 'ACTIVE' ? 'green' : 'slate'}>{s.accountStatus === 'ACTIVE' ? 'Active' : 'Closed'}</Badge> : <span className="text-slate-500">None</span>}</td>
                  <td className="text-right"><Button variant="secondary" aria-label={`Edit ${s.name}`} onClick={() => edit(s)}>Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </QueryState>
      <Card title={editing ? 'Edit student' : 'Register student'}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field id="st-name" label="Name" value={form.name} onChange={set('name')} />
          <Field id="st-dob" label="Date of birth (YYYY-MM-DD)" value={form.dob} onChange={set('dob')} />
          <div>
            <label htmlFor="st-cit" className="block text-sm font-medium">Citizenship</label>
            <select id="st-cit" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={form.citizenship} onChange={set('citizenship')}>
              <option value="">Choose…</option>
              <option value="SC">Singapore Citizen</option>
              <option value="PR">Permanent Resident</option>
              <option value="FOREIGN">Foreign student</option>
            </select>
          </div>
          <Field id="st-addr" label="Address" value={form.address} onChange={set('address')} />
          <div>
            <label htmlFor="st-class" className="block text-sm font-medium">Class</label>
            <select id="st-class" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={form.classId} onChange={set('classId')}>
              <option value="">Unassigned</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{levelName(c.levelId)} · {c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="st-enrol" className="block text-sm font-medium">Enrolment status</label>
            <select id="st-enrol" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm" value={form.enrolmentStatus} onChange={set('enrolmentStatus')}>
              <option value="ENROLLED">Enrolled</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="LEFT">Left</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-600">Enrolment status does not change the Education Account.</p>
        {error && <p role="alert" className="mt-2 text-rose-700">{error}</p>}
        <div className="mt-3 flex gap-2">
          <Button onClick={() => void save()}>Save student</Button>
          {editing && <Button variant="secondary" onClick={() => { setEditing(null); setForm(BLANK); setError(''); }}>Cancel edit</Button>}
        </div>
      </Card>
    </div>
  );
}
