import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from '../../services/auth';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

async function open(user: ReturnType<typeof userEvent.setup>) {
  await signIn('g-tan');
  renderApp('/eservice/children', { guardian: { id: 'g-tan', name: 'Tan Mei Ling' } });
  await user.click(await screen.findByRole('button', { name: /help assistant/i }));
  return screen.getByRole('dialog', { name: /help assistant/i });
}

test('asks a follow-up, then answers, in one conversation', async () => {
  const user = userEvent.setup();
  const dialog = await open(user);
  await user.type(within(dialog).getByLabelText(/your question/i), 'How do I pay my fees?');
  await user.click(within(dialog).getByRole('button', { name: /send/i }));
  expect(await within(dialog).findByText(/Education Account or online\?/i)).toBeInTheDocument();
  await user.type(within(dialog).getByLabelText(/your question/i), 'online');
  await user.click(within(dialog).getByRole('button', { name: /send/i }));
  expect(await within(dialog).findByText(/choose Online payment/i)).toBeInTheDocument();
});

test('refuses personal data and offers a link', async () => {
  const user = userEvent.setup();
  const dialog = await open(user);
  await user.type(within(dialog).getByLabelText(/your question/i), 'What is my balance?');
  await user.click(within(dialog).getByRole('button', { name: /send/i }));
  expect(await within(dialog).findByText(/can.t look up personal information/i)).toBeInTheDocument();
  expect(within(dialog).getByRole('link', { name: /open my children/i })).toHaveAttribute('href', '/eservice/children');
});

test('Send is disabled for empty input and the badge says the assistant is scripted', async () => {
  const user = userEvent.setup();
  const dialog = await open(user);
  expect(within(dialog).getByRole('button', { name: /send/i })).toBeDisabled();
  expect(within(dialog).getByText(/AI assistant \(scripted\)/i)).toBeInTheDocument();
});
