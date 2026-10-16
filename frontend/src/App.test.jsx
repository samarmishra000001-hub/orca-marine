import { render, screen } from '@testing-library/react';
import App from './App';
import { expect, test } from 'vitest';

test('renders App and shows ORCA Observatory opening', async () => {
  render(<App />);
  // Suspense fallback or opening scene displays ORCA branding
  const orcaHeading = screen.getByText(/ORCA/i);
  expect(orcaHeading).toBeInTheDocument();
});
