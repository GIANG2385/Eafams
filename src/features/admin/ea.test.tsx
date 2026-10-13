import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { updateSettings } from '../../services/demo';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('overview shows verdicts and the simulated schedule note', async () => {
  renderApp('/admin/ea');
  const table = await screen.findByRole('table', { name: /education accounts/i });
  const row = within(table).getByText('Hui Ning Koh').closest('tr')!;
  expect(within(row).getByText(/eligible/i)).toBeInTheDocument();
  expect(within(table).getByText('Chloe Tan').closest('tr')).toHaveTextContent(/under 7/i);
  expect(within(table).getByText('Priya Nair').closest('tr')).toHaveTextContent(/not a singapore citizen/i);
  expect(screen.getByText(/00:00/)).toBeInTheDocument();
});

test('running the age-7 job creates the account and a rerun creates nothing', async () => {
  const user = userEvent.setup();
  renderApp('/admin/ea');
  await user.click(await screen.findByRole('button', { name: /run age-7 job/i }));
  const result = await screen.findByRole('region', { name: /job result/i });
  expect(within(result).getByText(/hui ning koh/i).closest('li')).toHaveTextContent(/created/i);
  expect(getDb().accounts.some((a) => a.personId === 'st-08')).toBe(true);
  await user.click(screen.getByRole('button', { name: /run age-7 job/i }));
  expect(await screen.findByText(/0 created/i)).toBeInTheDocument();
});

test('an as-of date in the future makes Chloe eligible', async () => {
  const user = userEvent.setup();
  renderApp('/admin/ea');
  const asOf = await screen.findByLabelText(/as of/i);
  await user.clear(asOf);
  await user.type(asOf, '2027-01-15');
  await user.click(screen.getByRole('button', { name: /run age-7 job/i }));
  const result = await screen.findByRole('region', { name: /job result/i });
  expect(within(result).getByText(/chloe tan/i).closest('li')).toHaveTextContent(/created/i);
});

test('closure job: one closed to CPF, one blocked by a pending transaction', async () => {
  const user = userEvent.setup();
  renderApp('/admin/ea');
  await user.click(await screen.findByRole('button', { name: /run closure job/i }));
  const result = await screen.findByRole('region', { name: /job result/i });
  expect(within(result).getByText(/mei xin ong/i).closest('li')).toHaveTextContent(/closed.*S\$120\.00.*CPF/i);
  expect(within(result).getByText(/jia wen koh/i).closest('li')).toHaveTextContent(/pending transaction/i);
});

test('CPF failure is reported and the account stays active', async () => {
  const user = userEvent.setup();
  await updateSettings({ cpf: 'FAIL' });
  renderApp('/admin/ea');
  await user.click(await screen.findByRole('button', { name: /run closure job/i }));
  const result = await screen.findByRole('region', { name: /job result/i });
  expect(within(result).getByText(/mei xin ong/i).closest('li')).toHaveTextContent(/transfer failed/i);
  expect(getDb().accounts.find((a) => a.personId === 'st-06')!.status).toBe('ACTIVE');
});

test('School users get a read-only view with no job buttons', async () => {
  renderApp('/admin/ea', { adminId: 'school-sch-01' });
  expect(await screen.findByText(/jobs are run by HQ/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /run age-7 job/i })).not.toBeInTheDocument();
});
