export function PbiChip({ code, check }: { code: string; check: string }) {
  return (
    <p aria-label="PBI reference" className="inline-block rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
      {code} · {check}
    </p>
  );
}
