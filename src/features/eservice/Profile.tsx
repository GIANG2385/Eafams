import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { QueryState } from '../../components/StateView';
import { Button, Card, Field } from '../../components/ui';
import type { ProfileErrors, ProfileInput } from '../../domain/profile';
import { getProfile, listChildren, listProfileChanges, updateProfile } from '../../services/parent';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

const LABELS: Record<keyof ProfileInput, string> = {
  residentialAddress: 'Residential address',
  residentialPostalCode: 'Residential postal code',
  mailingAddress: 'Mailing address',
  mailingPostalCode: 'Mailing postal code',
  mobile: 'Mobile number',
  email: 'Email',
};
const FIELDS = Object.keys(LABELS) as (keyof ProfileInput)[];

export function Profile() {
  const { guardian } = useSession();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ['profile', guardian?.id], queryFn: () => getProfile(guardian!.id), enabled: !!guardian });
  const history = useQuery({ queryKey: ['profile-changes', guardian?.id], queryFn: () => listProfileChanges(guardian!.id), enabled: !!guardian });
  const children = useQuery({ queryKey: ['children', guardian?.id], queryFn: () => listChildren(guardian!.id), enabled: !!guardian });
  const [form, setForm] = useState<ProfileInput | null>(null);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [notice, setNotice] = useState<{ kind: 'ok' | 'fail'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile.data && !form) {
      const g = profile.data;
      setForm({
        residentialAddress: g.residentialAddress, residentialPostalCode: g.residentialPostalCode,
        mailingAddress: g.mailingAddress, mailingPostalCode: g.mailingPostalCode, mobile: g.mobile, email: g.email,
      });
    }
  }, [profile.data, form]);

  async function save() {
    if (!form || !guardian) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await updateProfile(guardian.id, form);
      setErrors(r.errors);
      if (r.ok && r.changed.length === 0) {
        setNotice({ kind: 'ok', text: 'No changes to save.' });
      } else if (r.ok) {
        setNotice({ kind: 'ok', text: 'Your details have been updated.' });
        await qc.invalidateQueries();
      }
    } catch {
      setNotice({ kind: 'fail', text: 'We could not update your details. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My details</h1>
      <PbiChip code="PB-15" check="editable fields save; protected fields read-only" />
      <QueryState query={profile}>
        {(g) => (
          <>
            <Card title="From SingPass (read-only)">
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt>Name</dt>
                <dd>{g.displayName}</dd>
                <dt>NRIC</dt>
                <dd>{g.maskedNric}</dd>
                <dt>Guardian of</dt>
                <dd>{children.data?.length ? children.data.map((c) => c.name).join(', ') : '—'}</dd>
              </dl>
            </Card>
            <Card title="Contact details">
              {form && (
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
                  {FIELDS.map((f) => (
                    <Field key={f} id={f} label={LABELS[f]} value={form[f]} error={errors[f]}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
                  ))}
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={busy}>Save changes</Button>
                  </div>
                </form>
              )}
              {notice?.kind === 'ok' && <p role="status" className="mt-2 text-emerald-800">{notice.text}</p>}
              {notice?.kind === 'fail' && <p role="alert" className="mt-2 text-rose-700">{notice.text}</p>}
            </Card>
          </>
        )}
      </QueryState>
      <Card title="Change history">
        <QueryState query={history} isEmpty={(d) => d.length === 0} emptyText="No changes yet.">
          {(rows) => (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table aria-label="Change history" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Old value</th>
                    <th className="py-2.5 px-3">New value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-xs">{r.at}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{LABELS[r.field as keyof ProfileInput] ?? r.field}</td>
                      <td className="py-2.5 px-3 text-slate-500 line-through text-xs">{r.oldValue}</td>
                      <td className="py-2.5 px-3 text-slate-900 font-medium text-xs">{r.newValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </Card>
    </div>
  );
}
