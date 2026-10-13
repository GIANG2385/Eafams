import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { updateSettings } from '../../services/demo';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('visiting a protected route while signed out redirects to login', async () => {
  renderApp('/eservice/children');
  expect(await screen.findByRole('heading', { name: /sign in with singpass/i })).toBeInTheDocument();
});

test('first login shows the welcome step and provisions the guardian', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/login');
  await user.click(await screen.findByRole('radio', { name: /tan mei ling/i }));
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByText(/account created and linked/i)).toBeInTheDocument();
  expect(getDb().guardians.map((g) => g.id)).toEqual(['g-tan']);
});

test('SingPass validation failure keeps the user on the login screen with a message', async () => {
  const user = userEvent.setup();
  await updateSettings({ singpass: 'FAIL' });
  renderApp('/eservice/login');
  await user.click(await screen.findByRole('radio', { name: /tan mei ling/i }));
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify/i);
  expect(screen.getByRole('heading', { name: /sign in with singpass/i })).toBeInTheDocument();
  expect(getDb().guardians).toHaveLength(0);
});

test('the sign-in button is disabled until an identity is chosen', async () => {
  renderApp('/eservice/login');
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeDisabled();
});
