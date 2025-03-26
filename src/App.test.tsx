import { render, screen } from '@testing-library/react';
import App from './App';

test('renders video display', () => {
  render(<App />);
  const displayElement = screen.getByText(/Display/i);
  expect(displayElement).toBeInTheDocument();
});
