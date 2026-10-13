import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QueryState, errorMessage } from '../../components/StateView';
import { Button, Card } from '../../components/ui';
import { listPersonas, signIn } from '../../services/auth';
import { useSession } from '../session/SessionProvider';
import { PbiChip } from '../../components/PbiChip';

export function Login() {
  const personas = useQuery({ queryKey: ['personas'], queryFn: listPersonas });
  const { setGuardian } = useSession();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const r = await signIn(chosen);
      setGuardian({ id: r.guardianId, name: r.displayName });
      if (r.firstLogin) setWelcome(r.displayName);
      else navigate('/eservice/children');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (welcome) {
    return (
      <Card title={`Welcome, ${welcome}`}>
        <div className="space-y-3">
          <p className="text-sm text-slate-700">Account created and linked to your children.</p>
          <Button onClick={() => navigate('/eservice/children')}>
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in with SingPass</h1>
      </div>
      <PbiChip code="PB-06" check="sign in and out; no data before sign-in" />
      <p className="mt-1 text-sm text-slate-600">
        Select a citizen profile to log in to the e-Service portal.
      </p>

      <div className="mt-4">
        <QueryState query={personas}>
          {(list) => (
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Test identities</legend>
              {list.map((p) => {
                const isSelected = chosen === p.id;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={p.id}
                      checked={isSelected}
                      onChange={() => setChosen(p.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                        {p.displayName.charAt(0)}
                      </div>
                      <span className="font-semibold text-sm text-slate-900">{p.displayName}</span>
                    </div>
                  </label>
                );
              })}
            </fieldset>
          )}
        </QueryState>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 pt-3 border-t border-slate-100">
        <Button
          disabled={!chosen || busy}
          onClick={() => void submit()}
          className="w-full sm:w-auto"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>
    </Card>
  );
}
