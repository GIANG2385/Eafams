import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSession } from '../features/session/SessionProvider';
import { signIn } from '../services/auth';
import { reset } from '../services/demo';
import { Button } from './ui';

export function ResetDemoButton() {
  const [toast, setToast] = useState(false);
  const [busy, setBusy] = useState(false);
  const session = useSession();
  const qc = useQueryClient();

  const handleReset = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await reset();
      await qc.invalidateQueries();
      if (session.guardian) {
        try {
          await signIn(session.guardian.id);
        } catch {
          // ignore
        }
      }
      setToast(true);
      setTimeout(() => setToast(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      {toast && (
        <span
          role="status"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-all"
        >
          ✓ Demo data reset
        </span>
      )}
      <Button
        variant="secondary"
        disabled={busy}
        className="shadow-md border-slate-300 bg-white/95 backdrop-blur text-xs font-semibold text-slate-800 hover:text-rose-700 hover:border-rose-300 transition-all flex items-center gap-1.5"
        onClick={() => void handleReset()}
      >
        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {busy ? 'Resetting…' : 'Reset demo data'}
      </Button>
    </div>
  );
}
