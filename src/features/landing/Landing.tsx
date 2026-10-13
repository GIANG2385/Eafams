import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';

export function Landing() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Edufarm – Education Account &amp; fee payment</h1>
      <p className="text-slate-700">Clickable prototype for the Sprint 1 demo. Pick a portal.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="For parents">
          <Link className="text-indigo-700 underline" to="/eservice/login">
            e-Service Portal (parents)
          </Link>
        </Card>
        <Card title="For HQ and schools">
          <Link className="text-indigo-700 underline" to="/admin">
            Admin Portal (HQ and schools)
          </Link>
        </Card>
      </div>
    </main>
  );
}
