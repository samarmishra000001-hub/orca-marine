import { render, screen } from '@testing-library/react';
import App from './App';
import { expect, test } from 'vitest';

test('renders App and shows loading IntroScene', async () => {
  render(<App />);
  const element = screen.getByText(/ORCA/i);
  expect(element).toBeInTheDocument();
});
