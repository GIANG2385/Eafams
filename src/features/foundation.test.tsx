import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../mock-db/store';
import { renderApp, resetTestState } from '../test/renderApp';

beforeEach(() => resetTestState());

test('landing links to both portals', () => {
  renderApp('/');
  expect(screen.getByRole('link', { name: /e-Service Portal/i })).toHaveAttribute('href', '/eservice/login');
  expect(screen.getByRole('link', { name: /Admin Portal/i })).toHaveAttribute('href', '/admin');
});

test('unknown route shows a not-found page', () => {
  renderApp('/nope');
  expect(screen.getByText(/page not found/i)).toBeInTheDocument();
});

test('demo controls change settings and reset restores the seed', async () => {
  const user = userEvent.setup();
  renderApp('/');
  await user.click(screen.getByRole('button', { name: /demo controls/i }));
  const panel = screen.getByRole('region', { name: /demo controls/i });
  await user.selectOptions(within(panel).getByLabelText(/gateway result/i), 'FAILED');
  expect(getDb().settings.gatewayMode).toBe('FAILED');
  await user.selectOptions(within(panel).getByLabelText(/singpass/i), 'FAIL');
  expect(getDb().settings.singpass).toBe('FAIL');
  await user.click(within(panel).getByRole('button', { name: /reset data/i }));
  expect(getDb().settings.gatewayMode).toBe('ASK');
  expect(getDb().settings.singpass).toBe('OK');
});

test('demo controls can set today and grant demo funds', async () => {
  const user = userEvent.setup();
  renderApp('/');
  await user.click(screen.getByRole('button', { name: /demo controls/i }));
  const panel = screen.getByRole('region', { name: /demo controls/i });
  const today = within(panel).getByLabelText(/^today$/i);
  await user.clear(today);
  await user.type(today, '2027-01-15');
  await user.click(within(panel).getByRole('button', { name: /set today/i }));
  expect(getDb().settings.today).toBe('2027-01-15');
  await user.selectOptions(within(panel).getByLabelText(/grant demo funds to/i), 'st-03');
  await user.click(within(panel).getByRole('button', { name: /^grant s\$100/i }));
  expect(getDb().ledger.at(-1)).toMatchObject({ type: 'DEMO_FUNDS', amountCents: 10000 });
});
