import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthGate from './AuthGate';
import PreferencesProvider from '../preferences/PreferencesProvider';

const renderGate = () =>
  render(
    <PreferencesProvider>
      <AuthGate>
        <p>Secret area</p>
      </AuthGate>
    </PreferencesProvider>,
  );

beforeEach(() => localStorage.setItem('chronotunes_language', 'en'));

describe('AuthGate', () => {
  it('renders children directly when auth is disabled', () => {
    vi.stubEnv('VITE_DISABLE_AUTH', 'true');
    renderGate();
    expect(screen.getByText('Secret area')).toBeInTheDocument();
  });

  it('shows an error for a wrong password and unlocks with the right one', async () => {
    vi.stubEnv('VITE_DISABLE_AUTH', 'false');
    vi.stubEnv('VITE_APP_PASSWORD', 'letmein');
    const user = userEvent.setup();
    renderGate();

    const input = screen.getByLabelText('Password');
    expect(input).not.toHaveFocus(); // no autofocus (a11y)
    await user.type(input, 'nope{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await user.type(input, 'letmein{Enter}');
    expect(screen.getByText('Secret area')).toBeInTheDocument();
    expect(sessionStorage.getItem('chronotunes_auth')).toBe('authenticated');
  });

  it('remembers the unlock for the browser session', () => {
    vi.stubEnv('VITE_DISABLE_AUTH', 'false');
    sessionStorage.setItem('chronotunes_auth', 'authenticated');
    renderGate();
    expect(screen.getByText('Secret area')).toBeInTheDocument();
  });
});
