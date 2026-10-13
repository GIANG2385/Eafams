import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { balanceOf } from './domain/ea';
import type { Actor } from './domain/permissions';
import { getDb } from './mock-db/store';
import { signIn } from './services/auth';
import { grantDemoFunds } from './services/demo';
import { publishFeeBatch } from './services/fees';
import { runClosureJob, runCreationJob } from './services/jobs';
import { renderApp, resetTestState } from './test/renderApp';

beforeEach(() => resetTestState());
const hq: Actor = { kind: 'HQ' };
const chargeOf = (personId: string) => getDb().charges.find((c) => c.personId === personId && c.status === 'OUTSTANDING')!.id;

test('parent journey from the landing page to a paid fee and a lower balance', async () => {
  const user = userEvent.setup();
  renderApp('/');
  await user.click(screen.getByRole('link', { name: /e-service portal/i }));
  await user.click(await screen.findByRole('radio', { name: /tan mei ling/i }));
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  await user.click(await screen.findByRole('button', { name: /continue/i }));
  await user.click(await screen.findByRole('link', { name: /aiden tan/i }));
  await user.click(await screen.findByRole('link', { name: /view outstanding fees/i }));
  await user.click(await screen.findByRole('checkbox', { name: /select school fee/i }));
  await user.click(screen.getByRole('button', { name: /pay selected/i }));
  await user.click(await screen.findByRole('radio', { name: /education account/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: /back to account/i }));
  expect(await screen.findByText('S$380.10')).toBeInTheDocument();
});

test('admin publishes a fee batch; the parent sees the new charge and pays it online', async () => {
  const user = userEvent.setup();
  await publishFeeBatch(hq, { schoolId: 'sch-03', feeTypeId: 'ft-music', target: { kind: 'LEVEL', ids: ['lv-06'] }, dueOn: '2026-12-15' });
  await signIn('g-koh');
  renderApp('/eservice/children/st-08/charges', { guardian: { id: 'g-koh', name: 'Koh Siew Hui' } });
  await user.click(await screen.findByRole('checkbox', { name: /select music class/i }));
  await user.click(screen.getByRole('button', { name: /pay selected/i }));
  await user.click(await screen.findByRole('radio', { name: /online payment/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  await user.click(await screen.findByRole('button', { name: /simulate success/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  expect(getDb().charges.find((c) => c.personId === 'st-08')!.status).toBe('PAID');
});

test('after the closure job the account is read-only and cannot pay a new fee', async () => {
  await runClosureJob(hq);
  await publishFeeBatch(hq, { schoolId: 'sch-02', feeTypeId: 'ft-trip', target: { kind: 'STUDENTS', ids: ['st-06'] }, dueOn: '2026-12-15' });
  await signIn('g-ong');
  renderApp(`/eservice/children/st-06/checkout?charges=${chargeOf('st-06')}`, { guardian: { id: 'g-ong', name: 'Ong Kok Wai' } });
  expect(await screen.findByRole('radio', { name: /education account/i })).toBeDisabled();
  expect(screen.getByText(/this account is closed/i)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /online payment/i })).toBeEnabled();
});

test('a newly created account starts at zero, is funded for the demo, then pays', async () => {
  const user = userEvent.setup();
  await runCreationJob(hq);
  await publishFeeBatch(hq, { schoolId: 'sch-03', feeTypeId: 'ft-music', target: { kind: 'STUDENTS', ids: ['st-08'] }, dueOn: '2026-12-15' });
  await grantDemoFunds('st-08', 5000);
  await signIn('g-koh');
  renderApp(`/eservice/children/st-08/checkout?charges=${chargeOf('st-08')}`, { guardian: { id: 'g-koh', name: 'Koh Siew Hui' } });
  await user.click(await screen.findByRole('radio', { name: /education account/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  const db = getDb();
  expect(balanceOf(db, db.accounts.find((a) => a.personId === 'st-08')!.id)).toBe(5000 - 3488);
});

test('enrolment status never changes the Education Account', async () => {
  const { saveStudent } = await import('./services/admin');
  const before = getDb().accounts.find((a) => a.personId === 'st-05');
  await saveStudent(hq, { personId: 'st-05', name: 'Wei Jie Ong', dob: '2017-02-02', citizenship: 'SC', address: '1 Seed Street', classId: 'cl-08', enrolmentStatus: 'TRANSFERRED' });
  expect(getDb().accounts.find((a) => a.personId === 'st-05')).toEqual(before);
});
