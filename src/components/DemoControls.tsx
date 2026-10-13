import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Settings } from '../domain/types';
import { useSession } from '../features/session/SessionProvider';
import { PERSONAS } from '../mock-db/seed';
import { getDb, subscribe } from '../mock-db/store';
import { signIn } from '../services/auth';
import { grantDemoFunds, reset, setToday, updateSettings } from '../services/demo';
import { announcePanelOpen, useCloseWhenOtherPanelOpens } from './panelBus';
import { errorMessage } from './StateView';
import { Button } from './ui';

function Sel<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block text-xs">
      {label}
      <select
        className="mt-0.5 w-full rounded border border-slate-400 px-1 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DemoControls() {
  const [open, setOpen] = useState(false);
  const [todayInput, setTodayInput] = useState('');
  const [fundsTo, setFundsTo] = useState('');
  const [notice, setNotice] = useState('');
  useCloseWhenOtherPanelOpens('demo', () => setOpen(false));
  const db = useSyncExternalStore(subscribe, getDb);
  const s = db.settings;
  const session = useSession();
  const navigate = useNavigate();
  const patch = (p: Partial<Settings>) => void updateSettings(p);
  const accounts = db.accounts
    .filter((a) => a.status === 'ACTIVE')
    .map((a) => ({ value: a.personId, label: db.students.find((x) => x.personId === a.personId)?.name ?? a.personId }));
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setNotice('');
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" className="fixed bottom-3 right-3 z-50 shadow" onClick={() => { announcePanelOpen('demo'); setOpen(true); }}>
        Demo controls
      </Button>
    );
  }
  return (
    <section
      role="region"
      aria-label="Demo controls"
      className="fixed bottom-3 right-3 z-50 max-h-[85vh] w-72 space-y-2 overflow-y-auto rounded-lg border border-slate-400 bg-white p-3 text-sm shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Demo controls</h2>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Hide
        </Button>
      </div>
      <Sel label="Gateway result" value={s.gatewayMode} onChange={(v) => patch({ gatewayMode: v })}
        options={[
          { value: 'ASK', label: 'Ask on gateway page' }, { value: 'SUCCEEDED', label: 'Always success' },
          { value: 'FAILED', label: 'Always fail' }, { value: 'CANCELLED', label: 'Always cancel' },
          { value: 'TIMEOUT', label: 'Always timeout' }, { value: 'RANDOM', label: 'Random' },
        ]} />
      <Sel label="Timeout resolves to" value={s.timeoutResolution} onChange={(v) => patch({ timeoutResolution: v })}
        options={[
          { value: 'SUCCEEDED', label: 'Succeeded' }, { value: 'FAILED', label: 'Failed' }, { value: 'STILL_PENDING', label: 'Still pending' },
        ]} />
      <Sel label="SingPass" value={s.singpass} onChange={(v) => patch({ singpass: v })}
        options={[{ value: 'OK', label: 'Validation OK' }, { value: 'FAIL', label: 'Validation fails' }]} />
      <Sel label="Student source" value={s.source} onChange={(v) => patch({ source: v })}
        options={[{ value: 'OK', label: 'Available' }, { value: 'DENIED', label: 'Permission denied' }]} />
      <Sel label="CPF transfer" value={s.cpf} onChange={(v) => patch({ cpf: v })}
        options={[{ value: 'OK', label: 'Succeeds' }, { value: 'FAIL', label: 'Fails' }]} />
      <Sel label="Latency" value={s.latency} onChange={(v) => patch({ latency: v })}
        options={[{ value: 'off', label: 'None' }, { value: 'normal', label: 'Normal' }, { value: 'slow', label: 'Slow' }]} />
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={s.failNext} onChange={(e) => patch({ failNext: e.target.checked })} />
        Fail the next service call
      </label>
      <div className="flex items-end gap-1">
        <label className="flex-1 text-xs">
          Today
          <input
            className="mt-0.5 w-full rounded border border-slate-400 px-1 py-1 text-sm"
            placeholder={s.today}
            value={todayInput}
            onChange={(e) => setTodayInput(e.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={() => void run(() => setToday(todayInput || s.today))}>
          Set today
        </Button>
      </div>
      <p className="text-xs text-slate-600">Current date: {s.today}</p>
      <Sel label="Grant demo funds to" value={fundsTo || (accounts[0]?.value ?? '')} onChange={setFundsTo} options={accounts} />
      <Button variant="secondary" onClick={() => void run(() => grantDemoFunds(fundsTo || accounts[0]?.value, 10000))}>
        Grant S$100
      </Button>
      <Sel label="Parent persona" value={(session.guardian?.id ?? '') as string} onChange={(id) =>
        void run(async () => {
          const r = await signIn(id);
          session.setGuardian({ id: r.guardianId, name: r.displayName });
          navigate('/eservice/children');
        })
      } options={[{ value: '', label: '— choose —' }, ...PERSONAS.map((p) => ({ value: p.id, label: p.displayName }))]} />
      <Sel label="Admin persona" value={session.adminId} onChange={(id) => session.setAdminId(id)}
        options={session.adminPersonas.map((p) => ({ value: p.id, label: p.label }))} />
      {notice && <p role="alert" className="text-xs text-rose-700">{notice}</p>}
      <Button variant="danger" onClick={() => void run(async () => { await reset(); if (session.guardian) await signIn(session.guardian.id); })}>
        Reset data
      </Button>
    </section>
  );
}
