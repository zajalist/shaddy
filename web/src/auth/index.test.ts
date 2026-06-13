import { describe, expect, it, vi } from 'vitest';

// The barrel pulls in supabase.ts, which throws without config; stub it.
vi.mock('./supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));

import * as auth from './index';

describe('@/auth public surface', () => {
  it('exports the stable named symbols', () => {
    for (const name of [
      'AUTH_CONFIG',
      'useAuth',
      'signIn',
      'signOut',
      'getAccessToken',
      'getUser',
      'AuthCallback',
      'SignInButton',
    ] as const) {
      expect(auth[name], `missing export: ${name}`).toBeDefined();
    }
  });
});
