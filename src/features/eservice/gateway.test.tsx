import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { signIn } from '../../services/auth';
import { updateSettings } from '../../services/demo';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());
const as = async (id: string, name: string) => {
  await signIn(id);
  return { id, name };
};
const nairCharge = () => getDb().charges.find((c) => c.personId === 'st-04')!.id;
const status = () => getDb().charges.find((c) => c.personId === 'st-04')!.status;

async function toGateway(user: ReturnType<typeof userEvent.setup>) {
  renderApp(`/eservice/children/st-04/checkout?charges=${nairCharge()}`, { guardian: await as('g-nair', 'Rajesh Nair') });
  await user.click(await screen.findByRole('radio', { name: /online payment/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  expect(await screen.findByRole('note')).toHaveTextContent(/sandbox/i);
}

test('success pays the charge and shows the receipt', async () => {
  const user = userEvent.setup();
  await toGateway(user);
  await user.click(screen.getByRole('button', { name: /simulate success/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  expect(status()).toBe('PAID');
});

test('failure leaves the fee outstanding, and Retry leads to a fresh attempt that can succeed', async () => {
  const user = userEvent.setup();
  await toGateway(user);
  await user.click(screen.getByRole('button', { name: /simulate failure/i }));
  expect(await screen.findByRole('heading', { name: /payment failed/i })).toBeInTheDocument();
  expect(status()).toBe('OUTSTANDING');
  await user.click(screen.getByRole('link', { name: /retry/i }));
  await user.click(await screen.findByRole('radio', { name: /online payment/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  await user.click(await screen.findByRole('button', { name: /simulate success/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  expect(getDb().payments.filter((p) => p.personId === 'st-04' && p.status === 'SUCCEEDED')).toHaveLength(1);
});

test('cancel leaves the fee outstanding', async () => {
  const user = userEvent.setup();
  await toGateway(user);
  await user.click(screen.getByRole('button', { name: /cancel payment/i }));
  expect(await screen.findByRole('heading', { name: /payment cancelled/i })).toBeInTheDocument();
  expect(status()).toBe('OUTSTANDING');
});

test('timeout keeps the charge locked; Check status then settles it', async () => {
  const user = userEvent.setup();
  await toGateway(user);
  await user.click(screen.getByRole('button', { name: /simulate timeout/i }));
  expect(await screen.findByRole('heading', { name: /payment pending/i })).toBeInTheDocument();
  expect(status()).toBe('PENDING_PAYMENT');
  await user.click(screen.getByRole('button', { name: /check status/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  expect(status()).toBe('PAID');
});

test('still pending after Check status keeps showing the pending page with a hint', async () => {
  const user = userEvent.setup();
  await updateSettings({ timeoutResolution: 'STILL_PENDING' });
  await toGateway(user);
  await user.click(screen.getByRole('button', { name: /simulate timeout/i }));
  await user.click(await screen.findByRole('button', { name: /check status/i }));
  expect(await screen.findByText(/still waiting/i)).toBeInTheDocument();
  expect(status()).toBe('PENDING_PAYMENT');
});

test('a forced demo result replaces the four buttons with a single Pay now', async () => {
  const user = userEvent.setup();
  await updateSettings({ gatewayMode: 'FAILED' });
  await toGateway(user);
  expect(screen.queryByRole('button', { name: /simulate success/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /pay now/i }));
  expect(await screen.findByRole('heading', { name: /payment failed/i })).toBeInTheDocument();
});

test('another parent opening the gateway URL gets a 403', async () => {
  const { startOnline } = await import('../../services/parent');
  const p = await startOnline('g-nair', { personId: 'st-04', chargeIds: [nairCharge()], idempotencyKey: 'gw-x' });
  renderApp(`/eservice/gateway/${p.id}`, { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
});
