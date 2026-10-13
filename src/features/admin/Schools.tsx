import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { QueryState, errorMessage } from '../../components/StateView';
import { Badge, Button, Card, Field } from '../../components/ui';
import { can } from '../../domain/permissions';
import { assignSchoolUser, listSchoolUsers, listSchools, saveSchool, setStatus } from '../../services/admin';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

export function Schools() {
  const { actor } = useSession();
  const q = useQuery({ queryKey: ['schools', actor], queryFn: () => listSchools(actor) });
  const users = useQuery({ queryKey: ['school-users', actor], queryFn: () => listSchoolUsers(actor) });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [userSchool, setUserSchool] = useState('');
  const [error, setError] = useState('');
  const canCreate = can(actor, 'CREATE', 'SCHOOL');
  const schoolLabel = (id: string) => {
    const s = q.data?.find((x) => x.id === id);
    return s ? `${s.code} · ${s.name}` : '—';
  };

  const inFlight = useRef(false);
  async function guard(fn: () => Promise<void>) {
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
  const clearForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
  };
  const save = () =>
    guard(async () => {
      await saveSchool(actor, { id: editingId ?? undefined, code, name });
      clearForm();
    });
  const assign = () =>
    guard(async () => {
      await assignSchoolUser(actor, { name: userName, schoolId: userSchool || q.data?.[0]?.id || '' });
      setUserName('');
    });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Schools</h2>
      <PbiChip code="PB-02" check="HQ edits schools; schools view their own" />
      {!canCreate && <p className="text-sm text-slate-600">School records are maintained by HQ. You can view your own school.</p>}
      <QueryState query={q} isEmpty={(d) => d.length === 0} emptyText="No schools.">
        {(rows) => (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{s.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-2.5 px-3">
                      <Badge tone={s.status === 'ACTIVE' ? 'green' : 'slate'}>{s.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="py-2.5 px-3 space-x-2 text-right">
                      {can(actor, 'UPDATE', 'SCHOOL', s.id) && (
                        <Button variant="secondary" className="text-xs px-2.5 py-1" aria-label={`Edit ${s.name}`} onClick={() => { setEditingId(s.id); setCode(s.code); setName(s.name); setError(''); }}>
                          Edit
                        </Button>
                      )}
                      {can(actor, 'DEACTIVATE', 'SCHOOL', s.id) && (
                        <Button variant="secondary" className="text-xs px-2.5 py-1" onClick={() => void guard(() => setStatus(actor, 'SCHOOL', s.id, s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'))}>
                          {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
      {canCreate && (
        <Card title={editingId ? 'Edit school' : 'Add school'}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="school-code" label="School code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Field id="school-name" label="School name" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex items-end gap-2">
              <Button onClick={() => void save()}>{editingId ? 'Save school' : 'Add school'}</Button>
              {editingId && <Button variant="secondary" onClick={clearForm}>Cancel</Button>}
            </div>
          </div>
        </Card>
      )}
      <Card title="School users">
        <QueryState query={users} isEmpty={(d) => d.length === 0} emptyText="No school users assigned.">
          {(rows) => (
            <table aria-label="School users" className="w-full text-sm">
              <thead><tr className="text-left text-slate-600"><th>Name</th><th>School</th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="py-1">{u.name}</td>
                    <td>{schoolLabel(u.schoolId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryState>
        {canCreate && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field id="su-name" label="User name" value={userName} onChange={(e) => setUserName(e.target.value)} />
            <div>
              <label htmlFor="su-school" className="block text-sm font-medium">School</label>
              <select id="su-school" className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm"
                value={userSchool || q.data?.[0]?.id || ''} onChange={(e) => setUserSchool(e.target.value)}>
                {q.data?.map((s) => <option key={s.id} value={s.id}>{schoolLabel(s.id)}</option>)}
              </select>
            </div>
            <div className="flex items-end"><Button onClick={() => void assign()}>Assign school user</Button></div>
          </div>
        )}
      </Card>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
    </div>
  );
}
