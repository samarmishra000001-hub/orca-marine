import { render, screen, act } from '@testing-library/react';
import App from './App';
import { expect, test } from 'vitest';

test('renders App and shows loading IntroScene', async () => {
  render(<App />);
  // IntroScene should be loading or visible
  const loadingElement = screen.getByText(/Loading.../i);
  expect(loadingElement).toBeInTheDocument();
});
