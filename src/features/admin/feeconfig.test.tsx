import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('lists fee types with their components, including the shared GST', async () => {
  renderApp('/admin/fees');
  const row = (await screen.findByText('School fee')).closest('li')!;
  expect(within(row).getByText(/Term fee/)).toBeInTheDocument();
  expect(within(row).getByText(/GST 9%/)).toBeInTheDocument();
  expect(within(row).getByText(/S\$119\.90/)).toBeInTheDocument();
});

test('HQ creates a component, then a fee type that reuses GST', async () => {
  const user = userEvent.setup();
  renderApp('/admin/fees');
  await user.type(await screen.findByLabelText(/component code/i), 'LAB');
  await user.type(screen.getByLabelText(/component name/i), 'Lab fee');
  await user.type(screen.getByLabelText(/amount \(S\$\)/i), '25');
  await user.click(screen.getByRole('button', { name: /add component/i }));
  expect(await screen.findByRole('checkbox', { name: /lab fee/i })).toBeInTheDocument();

  await user.type(screen.getByLabelText(/fee type code/i), 'LABFEE');
  await user.type(screen.getByLabelText(/fee type name/i), 'Laboratory');
  await user.click(screen.getByRole('checkbox', { name: /lab fee/i }));
  await user.click(screen.getByRole('checkbox', { name: /gst 9%/i }));
  await user.click(screen.getByRole('button', { name: /add fee type/i }));
  expect(await screen.findByText('Laboratory')).toBeInTheDocument();
  expect(getDb().feeTypes.some((t) => t.code === 'LABFEE')).toBe(true);
});

test('School user can only read', async () => {
  renderApp('/admin/fees', { adminId: 'school-sch-01' });
  expect(await screen.findByText('School fee')).toBeInTheDocument();
  expect(screen.getByText(/maintained by HQ/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /add component/i })).not.toBeInTheDocument();
});

test('a validation error from the service is shown', async () => {
  const user = userEvent.setup();
  renderApp('/admin/fees');
  await user.click(await screen.findByRole('button', { name: /add component/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/code and name are required/i);
});
