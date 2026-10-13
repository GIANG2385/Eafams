import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

const BUTTON = {
  primary: 'bg-indigo-700 text-white hover:bg-indigo-800 disabled:bg-slate-300',
  secondary: 'border border-slate-400 bg-white text-slate-900 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-rose-700 text-white hover:bg-rose-800 disabled:bg-slate-300',
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
      className={`rounded px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed ${BUTTON[variant]} ${className}`}
    />
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-800',
  green: 'bg-emerald-100 text-emerald-900',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-rose-100 text-rose-900',
  blue: 'bg-sky-100 text-sky-900',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
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
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...input}
        className="mt-1 w-full rounded border border-slate-400 px-2 py-1.5 text-sm"
      />
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
