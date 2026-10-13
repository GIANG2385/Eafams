import { render, screen } from '@testing-library/react';
import { App } from './App';

test('shows the prototype banner', () => {
  render(<App />);
  expect(screen.getByText(/PROTOTYPE – mock data, not integrated/)).toBeInTheDocument();
});
