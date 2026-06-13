// Auth engine — thin glue over the Supabase client.
//
// Replaces the old hand-rolled OIDC/PKCE engine (oidc.ts/pkce.ts, deleted).
// The public surface (readAuthState, subscribeToAuthChanges, signIn, signOut,
// getAccessToken, getUser, handleCallback, and the AuthUser/AuthState types)
// is identical to before, so useAuth / SignInButton / AuthCallback and every
// `@/auth` consumer compile unchanged.

import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { AUTH_CONFIG, RETURN_TO_KEY } from './config';
import { supabase } from './supabase';

// ─── Public types (same field names the OIDC engine produced) ──────────────

export interface AuthUser {
  sub: string; // ← supabaseUser.id (the canonical uuid)
  name?: string; // ← user_metadata.full_name | name
  preferred_username?: string; // ← user_metadata.user_name (GitHub) | derived
  email?: string; // ← supabaseUser.email
  picture?: string; // ← user_metadata.avatar_url | picture
  [claim: string]: unknown;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

export type AuthProvider = 'google' | 'github' | 'password';

// ─── Supabase User → AuthUser mapping (the compatibility seam) ─────────────

function mapUser(u: SupabaseUser): AuthUser {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  return {
    sub: u.id,
    name: (m.full_name as string) ?? (m.name as string) ?? undefined,
    preferred_username:
      (m.user_name as string) ?? (m.preferred_username as string) ?? undefined,
    email: u.email ?? undefined,
    picture: (m.avatar_url as string) ?? (m.picture as string) ?? undefined,
  };
}

function toState(session: Session | null, isLoading = false): AuthState {
  return {
    user: session?.user ? mapUser(session.user) : null,
    accessToken: session?.access_token ?? null,
    isLoading,
  };
}

// ─── Module-level cached state, kept fresh by onAuthStateChange ────────────

// Seeded loading-true; the first onAuthStateChange tick (INITIAL_SESSION)
// flips it to false once the persisted session is restored.
let currentState: AuthState = { user: null, accessToken: null, isLoading: true };

type Listener = (state: AuthState) => void;
const listeners = new Set<Listener>();

// Register exactly once at module load. Supabase fires this on init
// (INITIAL_SESSION), on sign-in/out, on token refresh, and — because it
// watches its own storage key — across tabs automatically. That makes the old
// custom `shaddy-auth-change` event + manual `storage` listener unnecessary.
supabase.auth.onAuthStateChange((_event, session) => {
  currentState = toState(session, false);
  for (const cb of listeners) cb(currentState);
});

// ─── Public API ────────────────────────────────────────────────────────────

/** Synchronous best-effort read of the cached session. */
export function readAuthState(): AuthState {
  return currentState;
}

/** Subscribe to auth changes; returns an unsubscribe function. */
export function subscribeToAuthChanges(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** A fresh Supabase JWT for the backend (auto-refreshed by the SDK). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Synchronous accessor for the current user. */
export function getUser(): AuthUser | null {
  return currentState.user;
}

/** Provider-routed sign-in. Zero-arg call defaults to Google (one-click). */
export async function signIn(
  provider: AuthProvider = 'google',
  creds?: { email: string; password: string; mode?: 'signin' | 'signup' },
): Promise<void> {
  if (typeof location !== 'undefined') {
    sessionStorage.setItem(RETURN_TO_KEY, location.pathname + location.search);
  }

  if (provider === 'google' || provider === 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: AUTH_CONFIG.redirectUri },
    });
    if (error) throw error; // browser then redirects to the provider
    return;
  }

  // email + password
  if (!creds) throw new Error('Email and password are required.');
  const { email, password, mode = 'signin' } = creds;
  const { error } =
    mode === 'signup'
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: AUTH_CONFIG.redirectUri },
        })
      : await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await ensureProfile(); // password sign-in resolves in place
}

/** Sign out everywhere; the auth-change event re-renders the UI. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Finish an OAuth round-trip at /auth/callback and decide where to go. */
export async function handleCallback(): Promise<{ returnTo: string }> {
  // OAuth errors come back as ?error / ?error_description.
  const q = new URLSearchParams(location.search);
  if (q.get('error')) {
    throw new Error(q.get('error_description') ?? q.get('error') ?? 'Sign-in error');
  }
  // detectSessionInUrl auto-exchanges the code; getSession resolves once done.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('No session after callback.');
  await ensureProfile();
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/design';
  sessionStorage.removeItem(RETURN_TO_KEY);
  return { returnTo };
}

// ─── Profile auto-creation (the one cross-module call) ─────────────────────

function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

/**
 * POST the backend's idempotent profile-ensure endpoint with a fresh JWT.
 * The backend upserts on user_id and is a no-op after the first call. Network
 * errors are swallowed (logged) — sign-in must never block on this; the
 * gallery publish path re-ensures the profile on first publish.
 */
export async function ensureProfile(): Promise<void> {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return; // backend not configured yet — skip silently
  try {
    const token = await getAccessToken();
    if (!token) return;
    const user = currentState.user ?? getUser();
    const displayName =
      user?.name ?? user?.preferred_username ?? user?.email?.split('@')[0] ?? undefined;
    const suggestedHandle =
      user?.preferred_username ?? (displayName ? slug(displayName) : undefined);
    await fetch(`${base.replace(/\/$/, '')}/v1/profile/ensure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        suggested_handle: suggestedHandle,
        display_name: displayName,
        avatar_url: user?.picture,
      }),
    });
  } catch (err) {
    console.warn('[auth] ensureProfile failed (non-fatal):', err);
  }
}
