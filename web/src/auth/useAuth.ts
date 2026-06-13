// React hook for subscribing to OIDC auth state.
//
// Cross-tab safe: subscribeToAuthChanges listens for both same-tab custom
// events and cross-tab `storage` events.

import { useEffect, useState } from 'react';
import type { AuthProvider, AuthState, AuthUser } from './session';
import {
  readAuthState,
  signIn,
  signOut,
  subscribeToAuthChanges,
} from './session';

export interface UseAuth {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Optional args keep the zero-arg `signIn()` call sites working while letting
  // the provider picker route to a specific method.
  signIn: (
    provider?: AuthProvider,
    creds?: { email: string; password: string; mode?: 'signin' | 'signup' },
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>(() => readAuthState());

  useEffect(() => {
    const unsub = subscribeToAuthChanges(setState);
    return unsub;
  }, []);

  return {
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated: !!state.user,
    isLoading: state.isLoading,
    signIn,
    signOut,
  };
}
