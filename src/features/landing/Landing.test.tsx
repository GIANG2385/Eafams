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

  // 4. Nút phụ: See how it works
  expect(screen.getByRole('button', { name: /see how it works/i })).toBeInTheDocument();

  // 5. Dòng nhỏ dưới nút
  expect(
    screen.getAllByText(/Prototype with fictional data\. No real accounts or payments\./i).length,
  ).toBeGreaterThan(0);
});

test('Sign In page allows role switching between Parent (SingPass), School Admin and HQ', async () => {
  const user = userEvent.setup();
  renderApp('/signin');

  expect(screen.getByRole('heading', { name: /sign in to eafams/i })).toBeInTheDocument();

  // Parent tab shows SingPass
  expect(screen.getByRole('heading', { name: /singpass login for parents/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in with singpass/i })).toBeInTheDocument();

  // Switch to School Admin
  await user.click(screen.getByRole('button', { name: /school admin/i }));
  expect(screen.getByRole('heading', { name: /school administrator sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/user id/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

  // Switch to Ministry HQ
  await user.click(screen.getByRole('button', { name: /ministry hq/i }));
  expect(screen.getByRole('heading', { name: /ministry of education hq sign in/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/hq user id/i)).toBeInTheDocument();
});
