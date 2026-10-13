import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

const BUTTON = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs hover:shadow-sm focus-visible:ring-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs active:bg-slate-100 focus-visible:ring-slate-400 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs hover:shadow-sm focus-visible:ring-rose-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none',
} as const;

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed cursor-pointer ${BUTTON[variant]} ${className}`}
    />
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition-shadow duration-200 ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold tracking-tight text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200/70',
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200/70',
  amber: 'bg-amber-50 text-amber-800 border-amber-200/70',
  red: 'bg-rose-50 text-rose-800 border-rose-200/70',
  blue: 'bg-blue-50 text-blue-800 border-blue-200/70',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

export function Field({
  id,
  label,
  error,
  className = '',
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...input}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:bg-slate-50 disabled:text-slate-400"
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
