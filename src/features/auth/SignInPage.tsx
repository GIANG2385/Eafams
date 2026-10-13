import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginBg from '../../assets/login_bg.jpg';
import { PERSONAS } from '../../mock-db/seed';
import { signIn } from '../../services/auth';
import { errorMessage } from '../../components/StateView';
import { useSession } from '../session/SessionProvider';

export function SignInPage() {
  const navigate = useNavigate();
  const session = useSession();

  // Form states matching screenshot
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);

  // Singpass Modal & Auth State
  const [showSingpassModal, setShowSingpassModal] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>(PERSONAS[0]?.id ?? 'g-tan');
  const [singpassBusy, setSingpassBusy] = useState(false);
  const [singpassError, setSingpassError] = useState('');

  // Handle Form Sign In (User ID & Password)
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedId = userId.trim().toLowerCase();
    const trimmedPw = password.trim();

    if (!trimmedId) {
      setFormError('Please enter your User ID.');
      return;
    }
    if (!trimmedPw) {
      setFormError('Please enter your password.');
      return;
    }

    // Role detection based on user ID:
    if (trimmedId === 'hq' || trimmedId.startsWith('hq_')) {
      session.setAdminId('hq');
      navigate('/admin/schools');
      return;
    }

    if (trimmedId.includes('school') || trimmedId.includes('raffles') || trimmedId.includes('victoria') || trimmedId.includes('peihwa')) {
      // Find matching school admin persona or default to school_raffles
      const matched = session.adminPersonas.find(
        (p) => p.id.toLowerCase() === trimmedId || p.label.toLowerCase().includes(trimmedId)
      );
      session.setAdminId(matched?.id ?? 'school_raffles');
      navigate('/admin/schools');
      return;
    }

    // Default fallback admin login
    session.setAdminId(trimmedId);
    navigate('/admin/schools');
  };

  // Handle Singpass Parent Login
  const handleSingpassLogin = async () => {
    if (!selectedPersona) return;
    setSingpassBusy(true);
    setSingpassError('');
    try {
      const res = await signIn(selectedPersona);
      session.setGuardian({ id: res.guardianId, name: res.displayName });
      setShowSingpassModal(false);
      navigate('/eservice/children');
    } catch (e) {
      setSingpassError(errorMessage(e));
    } finally {
      setSingpassBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 flex">
      {/* Background Graphic: Swirling 3D Blue Ribbon Visual */}
      <img
        src={loginBg}
        alt="Background Graphic"
        className="absolute inset-0 h-full w-full object-cover object-right pointer-events-none select-none z-0"
      />

      {/* Brand Logo in Upper Right matching screenshot */}
      <div className="absolute top-6 right-6 sm:top-8 sm:right-12 z-20 pointer-events-auto">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 font-sans select-none drop-shadow-xs">
          MaivenPoint
        </span>
      </div>

      {/* Left Column: Frosted Glass Sign In Panel */}
      <div className="relative z-10 w-full sm:max-w-lg lg:w-[42%] min-h-screen bg-gradient-to-r from-[#d9e6fc]/95 via-[#dfecfc]/90 to-[#e2effc]/60 backdrop-blur-xl border-r border-white/50 px-6 py-10 sm:px-12 sm:py-16 flex flex-col justify-between shadow-2xl">
        {/* Top: Back Link */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-8 cursor-pointer"
          >
            <span>←</span>
            <span>Back to Home</span>
          </Link>

          {/* Title: Sign in */}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-8">
            Sign in
          </h1>

          {/* Action 1: Singpass Button (Thay "sign in with Microsoft" thành "Singpass") */}
          <button
            type="button"
            onClick={() => setShowSingpassModal(true)}
            aria-label="Singpass"
            className="w-full flex items-center justify-center gap-3 rounded-md border border-slate-300 bg-white py-2.5 px-4 text-sm font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all cursor-pointer"
          >
            {/* Singpass Red Emblem */}
            <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#E11933] text-white text-[10px] font-black tracking-tighter">
              sp
            </span>
            <span>Singpass</span>
          </button>

          {/* Divider: or */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#e0edfc] px-3 text-slate-500 font-medium">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            {formError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {formError}
              </div>
            )}

            {/* User ID Field */}
            <div>
              <label htmlFor="userId" className="block text-xs font-semibold text-slate-800 mb-1.5">
                User ID
              </label>
              <input
                id="userId"
                name="userId"
                type="text"
                placeholder="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-800">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotNotice(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox: Stay signed in for the next 14 days */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="staySignedIn"
                type="checkbox"
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="staySignedIn" className="text-xs text-slate-700 cursor-pointer select-none">
                Stay signed in for the next 14 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-6 w-full rounded-md bg-[#5C6BC0] hover:bg-[#4F5BB6] active:scale-[0.99] text-white py-2.5 px-4 text-sm font-semibold shadow-xs transition-all cursor-pointer"
            >
              Sign in
            </button>
          </form>

          {/* Forgot password notice dialog */}
          {forgotNotice && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start justify-between">
              <div>
                <p className="font-semibold">Demo Prototype Notice</p>
                <p className="mt-0.5 text-blue-700">
                  All demo accounts use password: <code className="font-mono font-bold">demo1234</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotNotice(false)}
                className="text-blue-500 hover:text-blue-800 ml-2 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Bottom Demo Quick-fill Helper */}
        <div className="mt-8 pt-4 border-t border-slate-300/70">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Demo quick accounts
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setUserId('school_raffles');
                setPassword('demo1234');
              }}
              className="rounded-md border border-slate-300 bg-white/90 px-2.5 py-1 text-slate-700 hover:bg-white text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
            >
              🏫 School Admin (Raffles)
            </button>
            <button
              type="button"
              onClick={() => {
                setUserId('hq');
                setPassword('demo1234');
              }}
              className="rounded-md border border-slate-300 bg-white/90 px-2.5 py-1 text-slate-700 hover:bg-white text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
            >
              🏛️ Ministry HQ (hq)
            </button>
          </div>
        </div>
      </div>

      {/* Singpass Citizen Login Modal */}
      {showSingpassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E11933] text-white font-black text-xs">
                  sp
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Singpass Verification</h3>
                  <p className="text-xs text-slate-500">Parent / Guardian Authentication</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSingpassModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {singpassError && (
              <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {singpassError}
              </div>
            )}

            {/* Select Parent Citizen Persona */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select citizen identity for Singpass session:
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {PERSONAS.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedPersona === p.id
                        ? 'border-red-500 bg-red-50/50 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="persona"
                        value={p.id}
                        checked={selectedPersona === p.id}
                        onChange={() => setSelectedPersona(p.id)}
                        className="text-red-600 focus:ring-red-500 h-4 w-4"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">{p.displayName}</div>
                        <div className="text-[11px] text-slate-500">{p.nric}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                      NRIC Verified
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSingpassModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSingpassLogin}
                disabled={singpassBusy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11933] hover:bg-[#C9132A] px-5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {singpassBusy ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Log in with Singpass</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
