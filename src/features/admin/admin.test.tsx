import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from '../../mock-db/store';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('role switcher changes what the user can do on Schools', async () => {
  const user = userEvent.setup();
  renderApp('/admin/schools', { adminId: 'hq' });
  expect(await screen.findByRole('button', { name: /add school/i })).toBeInTheDocument();
  expect((await screen.findAllByRole('row')).length).toBeGreaterThan(3);
  await user.selectOptions(screen.getByLabelText(/acting as/i), 'school-sch-01');
  expect(await screen.findByText(/maintained by HQ/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /add school/i })).not.toBeInTheDocument();
  expect(screen.getByText('Sunrise Primary')).toBeInTheDocument();
  expect(screen.queryByText('Harbour Secondary')).not.toBeInTheDocument();
});

test('HQ adds a school', async () => {
  const user = userEvent.setup();
  renderApp('/admin/schools');
  await user.type(await screen.findByLabelText(/school code/i), 'SCH-09');
  await user.type(screen.getByLabelText(/school name/i), 'Meadow Primary');
  await user.click(screen.getByRole('button', { name: /add school/i }));
  expect(await screen.findByText('Meadow Primary')).toBeInTheDocument();
  expect(getDb().schools).toHaveLength(4);
});

test('School user adds a level to their own school; the school picker is fixed', async () => {
  const user = userEvent.setup();
  renderApp('/admin/structure', { adminId: 'school-sch-01' });
  await user.type(await screen.findByLabelText(/level name/i), 'Primary 6');
  await user.click(screen.getByRole('button', { name: /add level/i }));
  expect(await screen.findByText('Primary 6', { selector: 'strong' })).toBeInTheDocument();
  expect(getDb().levels.find((l) => l.name === 'Primary 6')!.schoolId).toBe('sch-01');
  expect(screen.queryByRole('heading', { name: /harbour secondary/i })).not.toBeInTheDocument();
});

test('students page is scoped to the school and shows EA status separately from enrolment', async () => {
  renderApp('/admin/students', { adminId: 'school-sch-01' });
  const table = await screen.findByRole('table');
  expect(within(table).getByText('Aiden Tan')).toBeInTheDocument();
  expect(within(table).queryByText('Marcus Lim')).not.toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: /education account/i })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: /enrolment/i })).toBeInTheDocument();
});

test('HQ registers a student; an invalid DOB shows the error', async () => {
  const user = userEvent.setup();
  renderApp('/admin/students');
  await user.type(await screen.findByLabelText(/^name$/i), 'Ivy Lee');
  await user.type(screen.getByLabelText(/date of birth/i), '2018-13-40');
  await user.click(screen.getByRole('button', { name: /save student/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/valid date of birth/i);
  await user.clear(screen.getByLabelText(/date of birth/i));
  await user.type(screen.getByLabelText(/date of birth/i), '2018-04-04');
  await user.selectOptions(screen.getByLabelText(/citizenship/i), 'SC');
  await user.click(screen.getByRole('button', { name: /save student/i }));
  expect(await screen.findByText('Ivy Lee')).toBeInTheDocument();
});

test('deactivating a class keeps it listed as inactive', async () => {
  const user = userEvent.setup();
  renderApp('/admin/structure');
  const row = (await screen.findAllByText('2A'))[0].closest('li')!;
  await user.click(within(row).getByRole('button', { name: /deactivate/i }));
  expect(await within(row).findByText(/inactive/i)).toBeInTheDocument();
});

test('out-of-scope menu items are visible but disabled with their sprint', async () => {
  renderApp('/admin');
  expect(await screen.findByText(/Top-up \(Sprint 2\)/)).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText(/FAS schemes.*Sprint 3/)).toHaveAttribute('aria-disabled', 'true');
});
