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
        <p>Account created and linked to your children.</p>
        <Button className="mt-3" onClick={() => navigate('/eservice/children')}>
          Continue
        </Button>
      </Card>
    );
  }
  return (
    <Card>
      <h1 className="text-xl font-semibold">Sign in with SingPass</h1>
      <PbiChip code="PB-06" check="sign in and out; no data before sign-in" />
      <p className="mt-1 text-sm text-slate-600">Prototype: choose a test identity. No real SingPass is contacted.</p>
      <div className="mt-3">
        <QueryState query={personas}>
          {(list) => (
            <fieldset className="space-y-2">
              <legend className="sr-only">Test identities</legend>
              {list.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded border border-slate-200 p-2">
                  <input type="radio" name="persona" value={p.id} checked={chosen === p.id} onChange={() => setChosen(p.id)} />
                  <span>{p.displayName}</span>
                </label>
              ))}
            </fieldset>
          )}
        </QueryState>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-rose-700">
          {error}
        </p>
      )}
      <Button className="mt-4" disabled={!chosen || busy} onClick={() => void submit()}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </Card>
  );
}
