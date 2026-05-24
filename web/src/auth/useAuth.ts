// React hook for subscribing to OIDC auth state.
//
// Cross-tab safe: subscribeToAuthChanges listens for both same-tab custom
// events and cross-tab `storage` events.

import { useEffect, useState } from 'react';
import type { AuthState, AuthUser } from './oidc';
import {
  readAuthState,
  signIn,
  signOut,
  subscribeToAuthChanges,
} from './oidc';

export interface UseAuth {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
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
