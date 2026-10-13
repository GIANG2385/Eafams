import { Badge } from './ui';

export function PrototypeBanner() {
  return (
    <div role="status" className="bg-amber-100 px-4 py-1 text-center text-sm text-amber-950">
      PROTOTYPE – mock data, not integrated
    </div>
  );
}

export function IntegrationBadges({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Integrations">
      {items.map((i) => (
        <li key={i}>
          <Badge tone="blue">{i}</Badge>
        </li>
      ))}
    </ul>
  );
}
