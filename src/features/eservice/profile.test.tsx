import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { signIn } from '../../services/auth';
import { updateSettings } from '../../services/demo';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());
const guardian = async () => {
  await signIn('g-tan');
  return { id: 'g-tan', name: 'Tan Mei Ling' };
};

test('shows masked NRIC and name as read-only, contact fields as inputs', async () => {
  renderApp('/eservice/profile', { guardian: await guardian() });
  expect(await screen.findByText('S****567A')).toBeInTheDocument();
  expect(screen.getByText('Tan Mei Ling', { selector: 'dd' })).toBeInTheDocument();
  expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/mobile/i)).toHaveValue('81234567');
});

test('invalid mobile shows an inline error and saves nothing', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/profile', { guardian: await guardian() });
  const mobile = await screen.findByLabelText(/mobile/i);
  await user.clear(mobile);
  await user.type(mobile, '71234567');
  await user.click(screen.getByRole('button', { name: /save changes/i }));
  expect(await screen.findByText(/8 digits starting with 8 or 9/i)).toBeInTheDocument();
  expect(getDb().guardians[0].mobile).toBe('81234567');
});

test('a valid change is saved, confirmed and written to the change history', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/profile', { guardian: await guardian() });
  const mobile = await screen.findByLabelText(/mobile/i);
  await user.clear(mobile);
  await user.type(mobile, '91234599');
  await user.click(screen.getByRole('button', { name: /save changes/i }));
  expect(await screen.findByText(/your details have been updated/i)).toBeInTheDocument();
  expect(getDb().guardians[0].mobile).toBe('91234599');
  const history = await screen.findByRole('table', { name: /change history/i });
  expect(history).toHaveTextContent('81234567');
  expect(history).toHaveTextContent('91234599');
});

test('a service failure shows a failure notice and keeps the old value', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/profile', { guardian: await guardian() });
  const mobile = await screen.findByLabelText(/mobile/i);
  await user.clear(mobile);
  await user.type(mobile, '91234599');
  await updateSettings({ failNext: true });
  await user.click(screen.getByRole('button', { name: /save changes/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not update/i);
  expect(getDb().guardians[0].mobile).toBe('81234567');
});
