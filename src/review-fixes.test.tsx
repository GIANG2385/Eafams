import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDb } from './mock-db/store';
import { signIn } from './services/auth';
import { grantDemoFunds, updateSettings } from './services/demo';
import { saveStudent } from './services/admin';
import { runClosureJob } from './services/jobs';
import { listCharges } from './services/parent';
import { renderApp, resetTestState } from './test/renderApp';

beforeEach(() => resetTestState());
const hq = { kind: 'HQ' } as const;
const as = async (id: string, name: string) => {
  await signIn(id);
  return { id, name };
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chargeId = (personId: string) => getDb().charges.find((c) => c.personId === personId)!.id;

describe('pending online payment can be reconciled from the fees page', () => {
  test('listCharges reports which payment holds each pending charge', async () => {
    const r = await listCharges('g-koh', 'st-09');
    expect(Object.keys(r.pendingPayments)).toEqual(r.pending.map((c) => c.id));
  });

  test('link from the pending charge leads to Check status and then Paid', async () => {
    const user = userEvent.setup();
    renderApp('/eservice/children/st-09/charges', { guardian: await as('g-koh', 'Koh Siew Hui') });
    await user.click(await screen.findByRole('link', { name: /check payment status/i }));
    expect(await screen.findByRole('heading', { name: /payment pending/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /check status/i }));
    expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
    expect(getDb().charges.find((c) => c.personId === 'st-09')!.status).toBe('PAID');
  });
});

describe('admin save buttons ignore a double click', () => {
  test('Save student creates exactly one student', async () => {
    const user = userEvent.setup();
    await updateSettings({ latency: 'normal' });
    renderApp('/admin/students');
    await user.type(await screen.findByLabelText(/^name$/i), 'Twin Kid');
    await user.type(screen.getByLabelText(/date of birth/i), '2018-04-04');
    await user.selectOptions(screen.getByLabelText(/citizenship/i), 'SC');
    await user.dblClick(screen.getByRole('button', { name: /save student/i }));
    await waitFor(() => expect(getDb().students.some((s) => s.name === 'Twin Kid')).toBe(true), { timeout: 2000 });
    await sleep(500);
    expect(getDb().students.filter((s) => s.name === 'Twin Kid')).toHaveLength(1);
  });

  test('Add level creates exactly one level', async () => {
    const user = userEvent.setup();
    await updateSettings({ latency: 'normal' });
    renderApp('/admin/structure');
    await user.type(await screen.findByLabelText(/level name/i), 'Primary 7');
    await user.dblClick(screen.getByRole('button', { name: /add level/i }));
    await waitFor(() => expect(getDb().levels.some((l) => l.name === 'Primary 7')).toBe(true), { timeout: 2000 });
    await sleep(500);
    expect(getDb().levels.filter((l) => l.name === 'Primary 7')).toHaveLength(1);
  });
});

describe('students can be edited: class assignment and enrolment status', () => {
  test('HQ assigns a class to an imported (unassigned) student', async () => {
    const user = userEvent.setup();
    const s = await saveStudent(hq, { name: 'Loose Kid', dob: '2018-04-04', citizenship: 'SC', address: '', classId: null, enrolmentStatus: 'ENROLLED' });
    renderApp('/admin/students');
    await user.click(await screen.findByRole('button', { name: /edit loose kid/i }));
    await user.selectOptions(screen.getByLabelText(/^class$/i), 'cl-02');
    await user.selectOptions(screen.getByLabelText(/enrolment status/i), 'TRANSFERRED');
    await user.click(screen.getByRole('button', { name: /save student/i }));
    await waitFor(() =>
      expect(getDb().students.find((x) => x.personId === s.personId)).toMatchObject({ classId: 'cl-02', enrolmentStatus: 'TRANSFERRED' }),
    );
    expect(getDb().students.filter((x) => x.name === 'Loose Kid')).toHaveLength(1);
  });

  test('changing enrolment in the UI leaves the Education Account untouched', async () => {
    const user = userEvent.setup();
    const before = getDb().accounts.find((a) => a.personId === 'st-01');
    renderApp('/admin/students');
    await user.click(await screen.findByRole('button', { name: /edit aiden tan/i }));
    await user.selectOptions(screen.getByLabelText(/enrolment status/i), 'LEFT');
    await user.click(screen.getByRole('button', { name: /save student/i }));
    await waitFor(() => expect(getDb().students.find((x) => x.personId === 'st-01')!.enrolmentStatus).toBe('LEFT'));
    expect(getDb().accounts.find((a) => a.personId === 'st-01')).toEqual(before);
  });
});

describe('every screen carries its PBI reference chip', () => {
  const parent: [string, string][] = [
    ['/eservice/login', 'PB-06'], ['/eservice/children', 'PB-07'], ['/eservice/children/st-01', 'PB-08'],
    ['/eservice/children/st-01/charges', 'PB-09'], ['/eservice/profile', 'PB-15'],
  ];
  test.each(parent)('%s shows %s', async (route, code) => {
    renderApp(route, { guardian: route.endsWith('login') ? undefined : await as('g-tan', 'Tan Mei Ling') });
    expect(await screen.findByLabelText(/pbi reference/i)).toHaveTextContent(code);
  });

  test('checkout shows PB-10', async () => {
    renderApp(`/eservice/children/st-01/checkout?charges=${chargeId('st-01')}`, { guardian: await as('g-tan', 'Tan Mei Ling') });
    expect(await screen.findByLabelText(/pbi reference/i)).toHaveTextContent('PB-10');
  });

  const admin: [string, string][] = [
    ['/admin/schools', 'PB-02'], ['/admin/structure', 'PB-02'], ['/admin/students', 'PB-02'], ['/admin/import', 'PB-04'],
    ['/admin/ea', 'PB-05'], ['/admin/fees', 'PB-12'], ['/admin/batches', 'PB-13'],
  ];
  test.each(admin)('%s shows %s', async (route, code) => {
    renderApp(route);
    expect(await screen.findByLabelText(/pbi reference/i)).toHaveTextContent(code);
  });
});

test('the public repo contains no real agency wording in source', () => {
  const files = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const offenders = Object.entries(files)
    .filter(([path]) => !path.endsWith('review-fixes.test.tsx'))
    .filter(([, text]) => /\bMOE\b/.test(text))
    .map(([path]) => path);
  expect(offenders).toEqual([]);
});

test('Reset data keeps a signed-in parent usable (guardian is re-provisioned)', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/profile', { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByText('S****567A')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /demo controls/i }));
  await user.click(screen.getByRole('button', { name: /reset data/i }));
  await waitFor(() => expect(getDb().guardians.map((g) => g.id)).toEqual(['g-tan']));
  expect(await screen.findByText('S****567A')).toBeInTheDocument();
});

test('demo funds are refused for a closed account (R-EA-8)', async () => {
  await runClosureJob(hq);
  await expect(grantDemoFunds('st-06', 1000)).rejects.toMatchObject({ code: 'VALIDATION' });
});
