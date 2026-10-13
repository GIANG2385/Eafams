import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { balanceOf } from '../../domain/ea';
import { getDb } from '../../mock-db/store';
import { signIn } from '../../services/auth';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());
const as = async (id: string, name: string) => {
  await signIn(id);
  return { id, name };
};
const chargeId = (personId: string, nth = 0) => getDb().charges.filter((c) => c.personId === personId)[nth].id;

test('full EA payment: select, choose EA, review, confirm, receipt', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/children/st-01/charges', { guardian: await as('g-tan', 'Tan Mei Ling') });
  await user.click(await screen.findByRole('checkbox', { name: /select school fee/i }));
  await user.click(screen.getByRole('button', { name: /pay selected/i }));
  await user.click(await screen.findByRole('radio', { name: /education account/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  expect(screen.getByText(/amount:/i)).toHaveTextContent('S$119.90');
  await user.click(screen.getByRole('button', { name: /confirm and pay/i }));
  expect(await screen.findByRole('heading', { name: /payment successful/i })).toBeInTheDocument();
  expect(screen.getByText(/PAY-\d{6}/)).toBeInTheDocument();
  const db = getDb();
  expect(balanceOf(db, db.accounts.find((a) => a.personId === 'st-01')!.id)).toBe(38010);
});

test('double-clicking Confirm debits exactly once', async () => {
  const user = userEvent.setup();
  const id = chargeId('st-01');
  renderApp(`/eservice/children/st-01/checkout?charges=${id}`, { guardian: await as('g-tan', 'Tan Mei Ling') });
  await user.click(await screen.findByRole('radio', { name: /education account/i }));
  await user.click(screen.getByRole('button', { name: /review payment/i }));
  await user.dblClick(screen.getByRole('button', { name: /confirm and pay/i }));
  await screen.findByRole('heading', { name: /payment successful/i });
  expect(getDb().ledger.filter((l) => l.type === 'FEE_DEBIT')).toHaveLength(1);
});

test('insufficient balance disables the EA option and explains why; online stays available', async () => {
  const id = chargeId('st-03');
  renderApp(`/eservice/children/st-03/checkout?charges=${id}`, { guardian: await as('g-lim', 'Lim Pei Shan') });
  const ea = await screen.findByRole('radio', { name: /education account/i });
  expect(ea).toBeDisabled();
  expect(screen.getByText(/balance is not enough\. you can pay online instead/i)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: /online payment/i })).toBeEnabled();
});

test('student without an EA can only pay online', async () => {
  const id = chargeId('st-04');
  renderApp(`/eservice/children/st-04/checkout?charges=${id}`, { guardian: await as('g-nair', 'Rajesh Nair') });
  expect(await screen.findByRole('radio', { name: /education account/i })).toBeDisabled();
  expect(screen.getByText(/no education account/i)).toBeInTheDocument();
});

test('charge ids from another child in the URL are refused and nothing is charged', async () => {
  const foreign = chargeId('st-05');
  renderApp(`/eservice/children/st-01/checkout?charges=${foreign}`, { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByRole('alert')).toHaveTextContent(/can no longer be paid/i);
  expect(getDb().ledger.filter((l) => l.type === 'FEE_DEBIT')).toHaveLength(0);
});

test('checkout of an unlinked child is a 403', async () => {
  const id = chargeId('st-05');
  renderApp(`/eservice/children/st-05/checkout?charges=${id}`, { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
});

test('another parent’s receipt URL is a 403 and leaks nothing', async () => {
  const { payByEa } = await import('../../services/parent');
  const p = await payByEa('g-tan', { personId: 'st-01', chargeIds: [chargeId('st-01')], idempotencyKey: 'x' });
  renderApp(`/eservice/receipt/${p.id}`, { guardian: await as('g-ong', 'Ong Kok Wai') });
  expect(await screen.findByRole('heading', { name: /access denied/i })).toBeInTheDocument();
  expect(screen.queryByText(/aiden/i)).not.toBeInTheDocument();
});
