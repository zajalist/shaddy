// The single Supabase client instance for the whole app.
//
// Nothing outside `auth/` imports this — it is NOT re-exported from
// `index.ts`. The rest of the app uses `useAuth` / `getAccessToken` /
// `getUser` exactly as before. Keeping the client private is what lets us
// swap the auth backend without touching consumers.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_CONFIG } from './config';

if (!AUTH_CONFIG.supabaseUrl || !AUTH_CONFIG.supabaseAnonKey) {
  // Fail loud and early with an actionable message rather than deep inside the
  // SDK on the first auth call.
  throw new Error(
    '[auth] Missing Supabase config. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in web/.env.local (and in Vercel for deploys).',
  );
}

export const supabase: SupabaseClient = createClient(
  AUTH_CONFIG.supabaseUrl,
  AUTH_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true, // localStorage, survives reload
      autoRefreshToken: true, // silent refresh before expiry
      detectSessionInUrl: true, // parse the callback URL on /auth/callback
      flowType: 'pkce', // PKCE for OAuth — Supabase manages the verifier
      storageKey: 'shaddy.auth.v2', // bump from v1: invalidates old Authentik blobs
    },
  },
);
