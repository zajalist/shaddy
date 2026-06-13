import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mock handles, hoisted so vi.mock can reference them.
const h = vi.hoisted(() => {
  return {
    authCb: null as null | ((event: string, session: unknown) => void),
    getSession: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        h.authCb = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: h.getSession,
      signInWithOAuth: h.signInWithOAuth,
      signInWithPassword: h.signInWithPassword,
      signUp: h.signUp,
      signOut: h.signOut,
    },
  },
}));

vi.mock('./config', () => ({
  AUTH_CONFIG: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon',
    redirectUri: 'http://localhost:5181/auth/callback',
  },
  RETURN_TO_KEY: 'shaddy.auth.returnTo',
}));

import {
  getAccessToken,
  handleCallback,
  readAuthState,
  signIn,
  subscribeToAuthChanges,
} from './session';

const googleSession = {
  access_token: 'tok-google',
  user: {
    id: 'uuid-1',
    email: 'a@example.com',
    user_metadata: { full_name: 'Ada L', avatar_url: 'http://img/a.png' },
  },
};

const githubSession = {
  access_token: 'tok-gh',
  user: {
    id: 'uuid-2',
    email: 'g@example.com',
    user_metadata: { user_name: 'octocat', name: 'The Octocat', avatar_url: 'http://img/o.png' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  h.signInWithOAuth.mockResolvedValue({ error: null });
  h.signInWithPassword.mockResolvedValue({ error: null });
  h.signUp.mockResolvedValue({ error: null });
  h.signOut.mockResolvedValue({ error: null });
  h.getSession.mockResolvedValue({ data: { session: null }, error: null });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

describe('mapUser (via auth-change → readAuthState)', () => {
  it('maps Google metadata onto AuthUser with sub = user.id', () => {
    h.authCb?.('SIGNED_IN', googleSession);
    const { user, accessToken } = readAuthState();
    expect(user).toMatchObject({
      sub: 'uuid-1',
      name: 'Ada L',
      email: 'a@example.com',
      picture: 'http://img/a.png',
    });
    expect(accessToken).toBe('tok-google');
  });

  it('maps GitHub metadata (user_name → preferred_username)', () => {
    h.authCb?.('SIGNED_IN', githubSession);
    const { user } = readAuthState();
    expect(user).toMatchObject({
      sub: 'uuid-2',
      name: 'The Octocat',
      preferred_username: 'octocat',
      picture: 'http://img/o.png',
    });
  });

  it('clears to null on sign-out', () => {
    h.authCb?.('SIGNED_IN', googleSession);
    h.authCb?.('SIGNED_OUT', null);
    expect(readAuthState()).toMatchObject({ user: null, accessToken: null });
  });
});

describe('getAccessToken', () => {
  it('returns the session token or null', async () => {
    h.getSession.mockResolvedValueOnce({ data: { session: googleSession }, error: null });
    expect(await getAccessToken()).toBe('tok-google');
    h.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    expect(await getAccessToken()).toBeNull();
  });
});

describe('signIn', () => {
  it('routes OAuth and stores returnTo', async () => {
    await signIn('github');
    expect(h.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: 'http://localhost:5181/auth/callback' },
    });
    expect(sessionStorage.getItem('shaddy.auth.returnTo')).not.toBeNull();
  });

  it('defaults to google with no args', async () => {
    await signIn();
    expect(h.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('password sign-in calls signInWithPassword then ensureProfile fetch', async () => {
    h.authCb?.('SIGNED_IN', googleSession); // seed a user for profile derivation
    h.getSession.mockResolvedValue({ data: { session: googleSession }, error: null });
    await signIn('password', { email: 'a@example.com', password: 'pw' });
    expect(h.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: 'pw' });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/profile/ensure'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('signup mode calls signUp', async () => {
    await signIn('password', { email: 'n@example.com', password: 'pw', mode: 'signup' });
    expect(h.signUp).toHaveBeenCalled();
  });

  it('throws when password creds are missing', async () => {
    await expect(signIn('password')).rejects.toThrow();
  });
});

describe('handleCallback', () => {
  it('returns returnTo from storage on success', async () => {
    sessionStorage.setItem('shaddy.auth.returnTo', '/gallery');
    h.getSession.mockResolvedValue({ data: { session: googleSession }, error: null });
    const { returnTo } = await handleCallback();
    expect(returnTo).toBe('/gallery');
    expect(sessionStorage.getItem('shaddy.auth.returnTo')).toBeNull();
  });

  it('defaults returnTo to /design', async () => {
    h.getSession.mockResolvedValue({ data: { session: googleSession }, error: null });
    const { returnTo } = await handleCallback();
    expect(returnTo).toBe('/design');
  });

  it('throws when there is no session', async () => {
    h.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(handleCallback()).rejects.toThrow(/no session/i);
  });
});

describe('subscribeToAuthChanges', () => {
  it('forwards state and unsubscribes', () => {
    const cb = vi.fn();
    const unsub = subscribeToAuthChanges(cb);
    h.authCb?.('SIGNED_IN', googleSession);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ sub: 'uuid-1' }) }));
    unsub();
    cb.mockClear();
    h.authCb?.('SIGNED_OUT', null);
    expect(cb).not.toHaveBeenCalled();
  });
});
