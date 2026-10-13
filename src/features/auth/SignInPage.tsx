import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { Button, Card, Field } from '../../components/ui';
import { PERSONAS } from '../../mock-db/seed';
import { signIn } from '../../services/auth';
import { errorMessage } from '../../components/StateView';
import { useSession } from '../session/SessionProvider';

type RoleTab = 'parent' | 'school' | 'hq';

export function SignInPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [activeTab, setActiveTab] = useState<RoleTab>('parent');

  // Parent SingPass State
  const [selectedPersona, setSelectedPersona] = useState<string>(PERSONAS[0]?.id ?? '');
  const [singpassBusy, setSingpassBusy] = useState(false);
  const [singpassError, setSingpassError] = useState('');

  // School Admin State
  const schoolPersonas = session.adminPersonas.filter((p) => p.id.startsWith('school_'));
  const [schoolUserId, setSchoolUserId] = useState<string>(schoolPersonas[0]?.id ?? 'school_raffles');
  const [schoolPassword, setSchoolPassword] = useState('demo1234');
  const [schoolError, setSchoolError] = useState('');

  // HQ Admin State
  const [hqUserId, setHqUserId] = useState('hq');
  const [hqPassword, setHqPassword] = useState('demo1234');
  const [hqError, setHqError] = useState('');

  // Handle Parent SingPass Sign In
  const handleParentSingPass = async () => {
    if (!selectedPersona) return;
    setSingpassBusy(true);
    setSingpassError('');
    try {
      const res = await signIn(selectedPersona);
      session.setGuardian({ id: res.guardianId, name: res.displayName });
      navigate('/eservice/children');
    } catch (e) {
      setSingpassError(errorMessage(e));
    } finally {
      setSingpassBusy(false);
    }
  };

  // Handle School Admin Sign In
  const handleSchoolSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolError('');
    if (!schoolUserId.trim()) {
      setSchoolError('Please enter a valid School User ID.');
      return;
    }
    if (!schoolPassword.trim()) {
      setSchoolError('Please enter your password.');
      return;
    }
    session.setAdminId(schoolUserId);
    navigate('/admin/schools');
  };

  // Handle HQ Officer Sign In
  const handleHqSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setHqError('');
    if (!hqUserId.trim()) {
      setHqError('Please enter HQ User ID.');
      return;
    }
    if (!hqPassword.trim()) {
      setHqError('Please enter your password.');
      return;
    }
    session.setAdminId(hqUserId);
    navigate('/admin/schools');
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      {/* Header and Back Link */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <span>←</span>
          <span>Back to Landing</span>
        </Link>
        <span className="text-[11px] font-medium text-slate-400">Sprint 1 Prototype</span>
      </div>

      <div className="flex flex-col items-center text-center mb-8">
        <Logo size="md" showSubtitle={false} className="mb-3" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Sign in to eafams</h1>
        <p className="mt-1 text-sm text-slate-500 max-w-md">
          Select your designated role to log in with SingPass or your staff credentials.
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div className="mb-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-200/70 p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('parent')}
          className={`flex flex-col items-center justify-center rounded-lg py-2.5 px-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'parent'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="font-bold">Parent / Guardian</span>
          <span className="text-[10px] font-normal opacity-80 mt-0.5">SingPass Login</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school')}
          className={`flex flex-col items-center justify-center rounded-lg py-2.5 px-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'school'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="font-bold">School Admin</span>
          <span className="text-[10px] font-normal opacity-80 mt-0.5">User ID &amp; Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hq')}
          className={`flex flex-col items-center justify-center rounded-lg py-2.5 px-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'hq'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="font-bold">Ministry HQ</span>
          <span className="text-[10px] font-normal opacity-80 mt-0.5">User ID &amp; Password</span>
        </button>
      </div>

      {/* Tab 1: Parent Sign In via SingPass */}
      {activeTab === 'parent' && (
        <Card title="SingPass Login for Parents">
          <div className="space-y-4">
            <div className="rounded-lg border border-red-100 bg-red-50/60 p-3.5 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-600 text-white font-bold text-xs tracking-tighter">
                sing<br />pass
              </div>
              <div className="text-xs">
                <span className="font-bold text-red-950 block">National Digital Identity (SingPass)</span>
                <span className="text-slate-600">
                  Parents authenticate securely with SingPass to view linked children's Education Accounts and approve fee deductions.
                </span>
              </div>
            </div>

            {singpassError && (
              <div role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {singpassError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Choose a Parent Persona (Demo Identity)
              </label>
              <div className="space-y-2">
                {PERSONAS.map((p) => {
                  const isSelected = selectedPersona === p.id;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="persona"
                          value={p.id}
                          checked={isSelected}
                          onChange={() => setSelectedPersona(p.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{p.displayName}</div>
                          <div className="text-[11px] text-slate-500">
                            NRIC: {p.nric} • {p.profile.email}
                          </div>
                        </div>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                        {p.nric}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 shadow-xs"
                disabled={!selectedPersona || singpassBusy}
                onClick={() => void handleParentSingPass()}
              >
                {singpassBusy ? 'Verifying SingPass…' : 'Log in with SingPass'}
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Fictional mock identity with simulated SingPass verification.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: School Administrator Sign In via User ID & Password */}
      {activeTab === 'school' && (
        <Card title="School Administrator Sign In">
          <form onSubmit={handleSchoolSignIn} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-800 text-white font-bold text-xs">
                SCH
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">School Staff Portal</span>
                <span className="text-slate-600">
                  Sign in with your institutional Staff ID and password to access student cohorts, classes, and fee batches.
                </span>
              </div>
            </div>

            {schoolError && (
              <div role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {schoolError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Demo School Account
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {schoolPersonas.map((sp) => (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => setSchoolUserId(sp.id)}
                      className={`text-left rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                        schoolUserId === sp.id
                          ? 'border-blue-600 bg-blue-50/60 font-semibold text-blue-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900 truncate">{sp.label.replace('School Admin - ', '')}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{sp.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Field
                id="school-userid"
                label="User ID"
                value={schoolUserId}
                onChange={(e) => setSchoolUserId(e.target.value)}
                placeholder="e.g. school_raffles"
              />

              <Field
                id="school-password"
                label="Password"
                type="password"
                value={schoolPassword}
                onChange={(e) => setSchoolPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                className="w-full justify-center py-2.5 font-bold"
              >
                Sign in to School Portal
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Default password for prototype demo: any character or demo1234.
              </p>
            </div>
          </form>
        </Card>
      )}

      {/* Tab 3: Ministry HQ Officer Sign In via User ID & Password */}
      {activeTab === 'hq' && (
        <Card title="Ministry of Education HQ Sign In">
          <form onSubmit={handleHqSignIn} className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3.5 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-700 text-white font-bold text-xs">
                MOE
              </div>
              <div className="text-xs">
                <span className="font-bold text-blue-950 block">Ministry HQ Officer Access</span>
                <span className="text-slate-600">
                  Full administrative authority for fee component models, student dataset imports, and cross-school financial audits.
                </span>
              </div>
            </div>

            {hqError && (
              <div role="alert" className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {hqError}
              </div>
            )}

            <div className="space-y-3">
              <Field
                id="hq-userid"
                label="HQ User ID"
                value={hqUserId}
                onChange={(e) => setHqUserId(e.target.value)}
                placeholder="hq"
              />

              <Field
                id="hq-password"
                label="Password"
                type="password"
                value={hqPassword}
                onChange={(e) => setHqPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                className="w-full justify-center bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5"
              >
                Sign in to HQ Portal
              </Button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Default prototype credential: User ID: hq, Password: demo1234.
              </p>
            </div>
          </form>
        </Card>
      )}

      {/* Direct Portal Links */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <span>Looking for direct portal access?</span>
        <div className="flex items-center gap-4">
          <Link to="/eservice/login" className="font-semibold text-blue-600 hover:text-blue-800">
            e-Service Portal
          </Link>
          <span className="text-slate-300">•</span>
          <Link to="/admin" className="font-semibold text-blue-600 hover:text-blue-800">
            Admin Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
