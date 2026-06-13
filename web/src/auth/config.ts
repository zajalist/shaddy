// Supabase auth config for Shaddy.
//
// Auth is cloud Supabase (Google, GitHub, Email+password). Two values come
// from the Supabase project (Project Settings → API):
//
// 1. `supabaseUrl`   — `VITE_SUPABASE_URL`   (the Project URL).
// 2. `supabaseAnonKey` — `VITE_SUPABASE_ANON_KEY` (the public anon/publishable
//    key; safe in the client bundle — real protection is RLS + the backend
//    JWT check in spec 02).
//
// `redirectUri` is the `/auth/callback` URL Supabase redirects back to after an
// OAuth round-trip; it defaults to the current origin and can be overridden
// with `VITE_OAUTH_REDIRECT_URI` (rarely needed). The exact string must be on
// the project's Authentication → URL Configuration redirect allow-list.

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectUri: string;
}

// `window` is unavailable during SSR / Node-side tooling; guard so the
// module is safe to import in any context.
const defaultRedirect =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:5181/auth/callback';

export const AUTH_CONFIG: AuthConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI ?? defaultRedirect,
};

// sessionStorage key used to bounce the user back to where they were when they
// started sign-in. Cleared once `handleCallback()` consumes it.
export const RETURN_TO_KEY = 'shaddy.auth.returnTo';
