import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forgetCacheForTests, getDb } from './mock-db/store';
import { assignSchoolUser, listSchoolUsers } from './services/admin';
import { signIn } from './services/auth';
import { currentGatewayMode, updateSettings } from './services/demo';
import { renderApp, resetTestState } from './test/renderApp';

beforeEach(() => resetTestState());
const hq = { kind: 'HQ' } as const;
const sunrise = { kind: 'SCHOOL', schoolId: 'sch-01' } as const;
const as = async (id: string, name: string) => {
  await signIn(id);
  return { id, name };
};

describe('seed and store hardening', () => {
  test('a stored database with a malformed settings object is replaced by the seed', () => {
    const broken = { ...getDb(), settings: { today: 5 } };
    window.localStorage.setItem('edufarm.mockdb.v1', JSON.stringify(broken));
    forgetCacheForTests();
    expect(getDb().settings.today).toBe('2026-10-13');
    expect(typeof getDb().settings.latency).toBe('string');
  });
});

describe('school users (assign)', () => {
  test('seed has one school user for Sunrise and one for Harbour, ids match the role switcher', async () => {
    const users = await listSchoolUsers(hq);
    expect(users.map((u) => u.id)).toEqual(['school-sch-01', 'school-sch-02']);
  });

  test('HQ assigns a school user; School users cannot', async () => {
    const u = await assignSchoolUser(hq, { name: 'Amir Hassan', schoolId: 'sch-03' });
    expect(u).toMatchObject({ name: 'Amir Hassan', schoolId: 'sch-03' });
    await expect(assignSchoolUser(sunrise, { name: 'Sneaky', schoolId: 'sch-01' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(assignSchoolUser(hq, { name: '  ', schoolId: 'sch-03' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(assignSchoolUser(hq, { name: 'Ghost', schoolId: 'sch-99' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('a School user only lists the users of their own school', async () => {
    await assignSchoolUser(hq, { name: 'Second Sunrise User', schoolId: 'sch-01' });
    const mine = await listSchoolUsers(sunrise);
    expect(mine.every((u) => u.schoolId === 'sch-01')).toBe(true);
    expect(mine).toHaveLength(2);
  });
});

describe('sandbox gateway setting is read through the service layer', () => {
  test('currentGatewayMode follows the demo setting', async () => {
    expect(currentGatewayMode()).toBe('ASK');
    await updateSettings({ gatewayMode: 'FAILED' });
    expect(currentGatewayMode()).toBe('FAILED');
  });
});

describe('schools page', () => {
  test('HQ edits a school name and code', async () => {
    const user = userEvent.setup();
    renderApp('/admin/schools');
    await user.click(await screen.findByRole('button', { name: /edit sunrise primary/i }));
    const name = screen.getByLabelText(/school name/i);
    expect(name).toHaveValue('Sunrise Primary');
    await user.clear(name);
    await user.type(name, 'Sunrise Primary School');
    await user.click(screen.getByRole('button', { name: /save school/i }));
    expect(await screen.findByText('Sunrise Primary School')).toBeInTheDocument();
    expect(getDb().schools.find((s) => s.id === 'sch-01')!.name).toBe('Sunrise Primary School');
    expect(screen.getByRole('button', { name: /add school/i })).toBeInTheDocument();
  });

  test('School users get no edit buttons', async () => {
    renderApp('/admin/schools', { adminId: 'school-sch-01' });
    await screen.findByText('Sunrise Primary');
    expect(screen.queryByRole('button', { name: /edit sunrise primary/i })).not.toBeInTheDocument();
  });

  test('a failed Deactivate shows the error instead of failing silently', async () => {
    const user = userEvent.setup();
    renderApp('/admin/schools');
    await screen.findByText('Lakeside Primary');
    await updateSettings({ failNext: true });
    await user.click(screen.getAllByRole('button', { name: /^deactivate/i })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
  });

  test('HQ assigns a school user, who then appears in the role switcher', async () => {
    const user = userEvent.setup();
    renderApp('/admin/schools');
    await user.type(await screen.findByLabelText(/user name/i), 'Amir Hassan');
    await user.selectOptions(screen.getByLabelText(/^school$/i), 'sch-03');
    await user.click(screen.getByRole('button', { name: /assign school user/i }));
    const table = await screen.findByRole('table', { name: /school users/i });
    expect(within(table).getByText('Amir Hassan')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /school user – amir hassan \(lakeside primary\)/i })).toBeInTheDocument();
  });

  test('School users see their school users but no assign form', async () => {
    renderApp('/admin/schools', { adminId: 'school-sch-01' });
    const table = await screen.findByRole('table', { name: /school users/i });
    expect(within(table).getByText('Nadia Karim')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign school user/i })).not.toBeInTheDocument();
  });
});

describe('fee configuration edit flows', () => {
  test('HQ edits a component amount', async () => {
    const user = userEvent.setup();
    renderApp('/admin/fees');
    await user.click(await screen.findByRole('button', { name: /edit component materials/i }));
    const amount = screen.getByLabelText(/amount \(s\$\)/i);
    expect(amount).toHaveValue('10.00');
    await user.clear(amount);
    await user.type(amount, '12');
    await user.click(screen.getByRole('button', { name: /save component/i }));
    await waitFor(() => expect(getDb().feeComponents.find((c) => c.id === 'fc-mat')!.amountCents).toBe(1200));
    expect(await screen.findByRole('button', { name: /add component/i })).toBeInTheDocument();
  });

  test('HQ deactivates and reactivates a component', async () => {
    const user = userEvent.setup();
    renderApp('/admin/fees');
    await user.click(await screen.findByRole('button', { name: /deactivate component materials/i }));
    await waitFor(() => expect(getDb().feeComponents.find((c) => c.id === 'fc-mat')!.status).toBe('INACTIVE'));
    await user.click(await screen.findByRole('button', { name: /activate component materials/i }));
    await waitFor(() => expect(getDb().feeComponents.find((c) => c.id === 'fc-mat')!.status).toBe('ACTIVE'));
  });

  test('HQ renames a fee type and its components stay selected', async () => {
    const user = userEvent.setup();
    renderApp('/admin/fees');
    await user.click(await screen.findByRole('button', { name: /edit fee type school fee/i }));
    expect(screen.getByLabelText('Term fee')).toBeChecked();
    expect(screen.getByLabelText('GST 9%')).toBeChecked();
    const name = screen.getByLabelText(/fee type name/i);
    await user.clear(name);
    await user.type(name, 'School fee 2026');
    await user.click(screen.getByRole('button', { name: /save fee type/i }));
    await waitFor(() => expect(getDb().feeTypes.find((t) => t.id === 'ft-school')!.name).toBe('School fee 2026'));
    expect(getDb().feeTypeComponents.filter((l) => l.feeTypeId === 'ft-school')).toHaveLength(3);
  });

  test('School users see no edit buttons', async () => {
    renderApp('/admin/fees', { adminId: 'school-sch-01' });
    await screen.findByText('Components (reusable across fee types)');
    expect(screen.queryByRole('button', { name: /edit (component|fee type)/i })).not.toBeInTheDocument();
  });
});

describe('fee batch can target individual students', () => {
  test('HQ picks one student, previews and publishes one charge', async () => {
    const user = userEvent.setup();
    renderApp('/admin/batches');
    await screen.findByRole('option', { name: 'School fee' });
    await user.selectOptions(screen.getByLabelText(/apply to/i), 'STUDENTS');
    await user.click(await screen.findByLabelText(/chloe tan/i));
    await user.click(screen.getByRole('button', { name: /preview charges/i }));
    const table = await screen.findByRole('table', { name: /charge preview/i });
    expect(within(table).getByText('Chloe Tan')).toBeInTheDocument();
    expect(within(table).queryByText('Aiden Tan')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /publish batch/i }));
    expect(await screen.findByText(/1 charge created/i)).toBeInTheDocument();
    expect(getDb().charges.filter((c) => c.personId === 'st-02' && c.feeTypeId === 'ft-school')).toHaveLength(1);
  });

  test('only students of the selected school are offered', async () => {
    const user = userEvent.setup();
    renderApp('/admin/batches', { adminId: 'school-sch-01' });
    await screen.findByRole('option', { name: 'School fee' });
    await user.selectOptions(screen.getByLabelText(/apply to/i), 'STUDENTS');
    expect(await screen.findByLabelText(/aiden tan/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/marcus lim/i)).not.toBeInTheDocument();
  });
});

describe('e-Service portal', () => {
  test('out-of-scope functions are shown greyed out and labelled', async () => {
    renderApp('/eservice/children', { guardian: await as('g-tan', 'Tan Mei Ling') });
    await screen.findByRole('heading', { name: /my children/i });
    for (const label of [/top-up \(sprint 2\)/i, /fas application \(sprint 3\)/i]) {
      expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true');
    }
  });

  test('profile shows the linked children as read-only context', async () => {
    renderApp('/eservice/profile', { guardian: await as('g-tan', 'Tan Mei Ling') });
    expect(await screen.findByText(/aiden tan, chloe tan/i)).toBeInTheDocument();
  });

  test('saving without changes says so; history uses field labels', async () => {
    const user = userEvent.setup();
    renderApp('/eservice/profile', { guardian: await as('g-tan', 'Tan Mei Ling') });
    await user.click(await screen.findByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    const mobile = screen.getByLabelText(/mobile number/i);
    await user.clear(mobile);
    await user.type(mobile, '91112222');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/your details have been updated/i)).toBeInTheDocument();
    const history = await screen.findByRole('table', { name: /change history/i });
    await waitFor(() => expect(within(history).getByText('Mobile number')).toBeInTheDocument());
    expect(within(history).queryByText('mobile')).not.toBeInTheDocument();
  });

  test('opening the help assistant closes the demo controls and vice versa', async () => {
    const user = userEvent.setup();
    renderApp('/eservice/children', { guardian: await as('g-tan', 'Tan Mei Ling') });
    await user.click(await screen.findByRole('button', { name: /^demo controls$/i }));
    expect(screen.getByRole('region', { name: /demo controls/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^help assistant$/i }));
    expect(screen.getByRole('dialog', { name: /help assistant/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /demo controls/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^demo controls$/i }));
    expect(screen.getByRole('region', { name: /demo controls/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /help assistant/i })).not.toBeInTheDocument();
  });
});
