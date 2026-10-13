import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, resetTestState } from '../../test/renderApp';

beforeEach(() => resetTestState());

test('Landing page renders hero section with requested copy and actions', () => {
  renderApp('/');

  // 1. Tiêu đề
  expect(
    screen.getByRole('heading', { name: /Education accounts and school fees, in one place\./i }),
  ).toBeInTheDocument();

  // 2. Phụ đề
  expect(
    screen.getByText(
      /Parents see balances and pay school fees\. Schools and HQ manage students, accounts and fee batches\. A clickable prototype of Sprint 1\./i,
    ),
  ).toBeInTheDocument();

  // 3. Nút chính: Sign in
  const signInBtn = screen.getByRole('link', { name: /^sign in$/i });
  expect(signInBtn).toHaveAttribute('href', '/signin');

  // 4. See how it works đã được gỡ bỏ
  expect(screen.queryByRole('button', { name: /see how it works/i })).not.toBeInTheDocument();

  // 5. Dòng nhỏ dưới nút
  expect(
    screen.getAllByText(/Prototype with fictional data\. No real accounts or payments\./i).length,
  ).toBeGreaterThan(0);
});

test('Sign In page matches MaivenPoint layout with Singpass button, User ID, and Password', async () => {
  const user = userEvent.setup();
  renderApp('/signin');

  // 1. Heading "Sign in"
  expect(screen.getByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();

  // 2. Brand MaivenPoint
  expect(screen.getByText(/MaivenPoint/i)).toBeInTheDocument();

  // 3. Singpass button (replaces Sign in with Microsoft)
  const singpassBtn = screen.getByRole('button', { name: /singpass/i });
  expect(singpassBtn).toBeInTheDocument();

  // 4. User ID & Password inputs
  expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();

  // 5. Checkbox "Stay signed in for the next 14 days"
  expect(screen.getByLabelText(/stay signed in for the next 14 days/i)).toBeInTheDocument();

  // 6. Primary submit "Sign in" button
  expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();

  // 7. Clicking Singpass opens persona verification modal
  await user.click(singpassBtn);
  expect(screen.getByText(/singpass verification/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in with singpass/i })).toBeInTheDocument();
});
