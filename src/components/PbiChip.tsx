export function PbiChip({ code, check }: { code: string; check: string }) {
  return (
    <span aria-label="PBI reference" className="sr-only">
      {code} · {check}
    </span>
  );
}
