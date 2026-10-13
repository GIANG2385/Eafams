import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from '../../services/auth';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

async function as(personaId: string, name: string) {
  await signIn(personaId);
  return { id: personaId, name };
}

test('children list shows only linked children', async () => {
  renderApp('/eservice/children', { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByRole('link', { name: /aiden tan/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /chloe tan/i })).toBeInTheDocument();
  expect(screen.queryByText(/wei jie ong/i)).not.toBeInTheDocument();
});

test('a parent with no linked child sees an empty state', async () => {
  renderApp('/eservice/children', { guardian: await as('g-none', 'Test Parent (no linked child)') });
  expect(await screen.findByText(/no children are linked/i)).toBeInTheDocument();
});

test('typing the URL of another parent’s child shows a 403 page and no data', async () => {
  renderApp('/eservice/children/st-05', { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  expect(screen.queryByText(/wei jie/i)).not.toBeInTheDocument();
});

test('dashboard shows balance, status and the first page of transactions', async () => {
  renderApp('/eservice/children/st-01', { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByText('S$500.00')).toBeInTheDocument();
  expect(screen.getByText(/active/i)).toBeInTheDocument();
  const rows = await screen.findAllByRole('row');
  expect(rows).toHaveLength(21); // header + 20
  expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument();
});

test('next page shows the remaining 5 rows', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/children/st-01', { guardian: await as('g-tan', 'Tan Mei Ling') });
  await user.click(await screen.findByRole('button', { name: /next/i }));
  expect(await screen.findByText(/page 2 of 2/i)).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(6);
});

test('PR student shows "No Education Account" with the reason and no transactions table', async () => {
  renderApp('/eservice/children/st-04', { guardian: await as('g-nair', 'Rajesh Nair') });
  expect(await screen.findByText('No Education Account')).toBeInTheDocument();
  expect(screen.getByText(/not a singapore citizen/i)).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('a closed account is shown as read-only', async () => {
  const { runEaClosure } = await import('../../domain/ea');
  const { getDb, setDb } = await import('../../mock-db/store');
  setDb(runEaClosure(getDb(), getDb().settings.today, 'OK').db);
  renderApp('/eservice/children/st-06', { guardian: await as('g-ong', 'Ong Kok Wai') });
  expect(await screen.findByText(/this account is closed/i)).toBeInTheDocument();
  expect(within(await screen.findByRole('table')).getByText(/CPF transfer/i)).toBeInTheDocument();
});

test('a failing service shows an error with Retry and recovers', async () => {
  const { updateSettings } = await import('../../services/demo');
  const user = userEvent.setup();
  const guardian = await as('g-tan', 'Tan Mei Ling'); // sign in first: signIn would consume failNext
  await updateSettings({ failNext: true });
  renderApp('/eservice/children', { guardian });
  expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
  await user.click(screen.getByRole('button', { name: /retry/i }));
  expect(await screen.findByRole('link', { name: /aiden tan/i })).toBeInTheDocument();
});
