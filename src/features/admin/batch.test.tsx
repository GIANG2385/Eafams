import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { signIn } from '../../services/auth';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

async function fill(user: ReturnType<typeof userEvent.setup>) {
  const picker = await screen.findByLabelText(/^school$/i);
  await screen.findByRole('option', { name: 'Lakeside Primary' });
  await user.selectOptions(picker, 'sch-03');
  await user.selectOptions(screen.getByLabelText(/fee type/i), 'ft-music');
  await user.selectOptions(screen.getByLabelText(/apply to/i), 'LEVEL');
  await user.click(await screen.findByRole('checkbox', { name: /primary 2/i }));
  await user.clear(screen.getByLabelText(/due date/i));
  await user.type(screen.getByLabelText(/due date/i), '2026-12-15');
}

test('preview first, then publish; shows "Student Fees Ready" and the parent can see the charge', async () => {
  const user = userEvent.setup();
  renderApp('/admin/batches');
  await fill(user);
  await user.click(screen.getByRole('button', { name: /preview charges/i }));
  const table = await screen.findByRole('table', { name: /charge preview/i });
  expect(within(table).getByText('Hui Ning Koh')).toBeInTheDocument();
  expect(getDb().batches).toHaveLength(8); // nothing created yet
  await user.click(screen.getByRole('button', { name: /publish batch/i }));
  expect(await screen.findByText(/student fees ready/i)).toHaveTextContent(/1 charge/i);
  expect(getDb().batches).toHaveLength(9);
  const { listCharges } = await import('../../services/parent');
  await signIn('g-koh');
  expect((await listCharges('g-koh', 'st-08')).outstanding).toHaveLength(1);
});

test('Revise goes back to the form without creating anything', async () => {
  const user = userEvent.setup();
  renderApp('/admin/batches');
  await fill(user);
  await user.click(screen.getByRole('button', { name: /preview charges/i }));
  await user.click(await screen.findByRole('button', { name: /revise/i }));
  expect(screen.getByLabelText(/due date/i)).toHaveValue('2026-12-15');
  expect(getDb().batches).toHaveLength(8);
});

test('School user has a fixed school and cannot see other schools', async () => {
  renderApp('/admin/batches', { adminId: 'school-sch-01' });
  expect(await screen.findByText('Sunrise Primary')).toBeInTheDocument();
  expect(screen.queryByLabelText(/^school$/i)).not.toBeInTheDocument();
});

test('publishing the same selection twice shows the conflict message', async () => {
  const user = userEvent.setup();
  renderApp('/admin/batches');
  await fill(user);
  await user.click(screen.getByRole('button', { name: /preview charges/i }));
  await user.click(await screen.findByRole('button', { name: /publish batch/i }));
  await screen.findByText(/student fees ready/i);
  await fill(user);
  await user.click(screen.getByRole('button', { name: /preview charges/i }));
  await user.click(await screen.findByRole('button', { name: /publish batch/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/already been published/i);
});

test('empty selection gives a validation message', async () => {
  const user = userEvent.setup();
  renderApp('/admin/batches');
  await user.click(await screen.findByRole('button', { name: /preview charges/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/choose at least one/i);
});
