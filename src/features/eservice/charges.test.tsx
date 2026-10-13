import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from '../../services/auth';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());
const as = async (id: string, name: string) => {
  await signIn(id);
  return { id, name };
};

test('shows components including GST, a zero subsidy line, the total and the EA balance', async () => {
  renderApp('/eservice/children/st-01/charges', { guardian: await as('g-tan', 'Tan Mei Ling') });
  expect(await screen.findByText('School fee')).toBeInTheDocument();
  for (const label of ['Term fee', 'Materials', 'GST 9%', 'Subsidy']) expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText('S$119.90')).toBeInTheDocument();
  expect(screen.getByText(/Education Account balance/i).parentElement).toHaveTextContent('S$500.00');
});

test('selecting a charge enables Pay selected with the running total', async () => {
  const user = userEvent.setup();
  renderApp('/eservice/children/st-05/charges', { guardian: await as('g-ong', 'Ong Kok Wai') });
  const pay = await screen.findByRole('button', { name: /pay selected/i });
  expect(pay).toBeDisabled();
  const boxes = screen.getAllByRole('checkbox');
  await user.click(boxes[0]);
  await user.click(boxes[1]);
  expect(screen.getByRole('button', { name: /pay selected \(S\$79\.57\)/i })).toBeEnabled();
});

test('empty state when nothing is owed', async () => {
  renderApp('/eservice/children/st-06/charges', { guardian: await as('g-ong', 'Ong Kok Wai') });
  expect(await screen.findByText(/no outstanding fees/i)).toBeInTheDocument();
});

test('a pending online payment is shown as locked, not selectable', async () => {
  renderApp('/eservice/children/st-09/charges', { guardian: await as('g-koh', 'Koh Siew Hui') });
  expect(await screen.findByText(/payment pending/i)).toBeInTheDocument();
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
});

test('student without EA shows "No Education Account" next to the charges', async () => {
  renderApp('/eservice/children/st-04/charges', { guardian: await as('g-nair', 'Rajesh Nair') });
  const bal = await screen.findByText(/Education Account balance/i);
  expect(within(bal.parentElement!).getByText(/no education account/i)).toBeInTheDocument();
});
