import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { updateSettings } from '../../services/demo';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('preview lists valid and rejected rows with reasons, then import reports counts', async () => {
  const user = userEvent.setup();
  renderApp('/admin/import');
  await user.click(await screen.findByRole('button', { name: /preview source/i }));
  const table = await screen.findByRole('table', { name: /source preview/i });
  expect(within(table).getByText(/missing date of birth/i)).toBeInTheDocument();
  expect(within(table).getByText(/invalid citizenship/i)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /import 6 valid records/i }));
  const summary = await screen.findByRole('status', { name: /import result/i });
  expect(summary).toHaveTextContent(/5 created/i);
  expect(summary).toHaveTextContent(/1 updated/i);
  expect(summary).toHaveTextContent(/2 rejected/i);
  expect(getDb().students.length).toBe(9 + 5);
});

test('a denied source shows an error and offers nothing to import', async () => {
  const user = userEvent.setup();
  await updateSettings({ source: 'DENIED' });
  renderApp('/admin/import');
  await user.click(await screen.findByRole('button', { name: /preview source/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/denied access/i);
  expect(screen.queryByRole('button', { name: /import \d+ valid/i })).not.toBeInTheDocument();
});

test('School users see why they cannot import', async () => {
  renderApp('/admin/import', { adminId: 'school-sch-01' });
  expect(await screen.findByText(/only HQ can import/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /preview source/i })).not.toBeInTheDocument();
});
