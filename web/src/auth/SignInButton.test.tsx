import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();
vi.mock('./useAuth', () => ({ useAuth: () => useAuthMock() }));

import { SignInButton } from './SignInButton';

const signIn = vi.fn();
const signOut = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  signOut.mockResolvedValue(undefined);
});

describe('SignInButton — signed out', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      signIn,
      signOut,
    });
  });

  it('opens the picker and routes GitHub', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: /continue with github/i }));
    expect(signIn).toHaveBeenCalledWith('github');
  });

  it('submits the email/password form', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const pw = screen.getByPlaceholderText(/password/i);
    fireEvent.change(screen.getByPlaceholderText(/you@example/i), { target: { value: 'a@b.com' } });
    fireEvent.change(pw, { target: { value: 'pw' } });
    const form = pw.closest('form') as HTMLFormElement;
    fireEvent.click(within(form).getByRole('button', { name: /^sign in$/i }));
    expect(signIn).toHaveBeenCalledWith('password', { email: 'a@b.com', password: 'pw', mode: 'signin' });
  });

  it('renders an inline error when sign-in fails', async () => {
    signIn.mockRejectedValueOnce(new Error('Invalid login credentials'));
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => expect(screen.getByText(/invalid login credentials/i)).toBeTruthy());
  });

  it('toggles to create-account mode', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    fireEvent.click(screen.getByRole('button', { name: /new here\? create an account/i }));
    expect(screen.getByRole('button', { name: /create account/i })).toBeTruthy();
  });
});

describe('SignInButton — signed in', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({
      user: { sub: 'uuid-1', name: 'Ada Lovelace', email: 'a@b.com' },
      accessToken: 'tok',
      isAuthenticated: true,
      isLoading: false,
      signIn,
      signOut,
    });
  });

  it('shows the display name and signs out from the dropdown', () => {
    render(<SignInButton />);
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ada lovelace/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
