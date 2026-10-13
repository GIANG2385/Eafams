import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the application', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /e-Service Portal/i })).toBeInTheDocument();
});
