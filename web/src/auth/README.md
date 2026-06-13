# `@/auth` — Supabase Auth

Cloud Supabase Auth (Google, GitHub, Email+password). The module's public
surface (`useAuth`, `SignInButton`, `AuthCallback`, `AUTH_CONFIG`, `signIn`,
`signOut`, `getAccessToken`, `getUser`, `AuthUser`/`AuthState`/`AuthProvider`)
is what the rest of the app consumes — never import `supabase.ts` directly.

## Project

- Supabase project **shaddy** — ref `zabpnnnratrktcafnffk`, region `us-east-1`.
- URL: `https://zabpnnnratrktcafnffk.supabase.co`
- Env (`web/.env.local`, and Vercel prod/preview/dev):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY` (public anon key — safe in the bundle)
  - `VITE_API_BASE_URL` (backend, for `ensureProfile`)

## One-time dashboard setup (Supabase console)

Email+password works out of the box. The rest needs the console:

1. **Authentication → Providers → Email** — enabled by default. For the
   hackathon, turn **"Confirm email" OFF** so `signUp` logs in immediately.
   (Production: leave ON; the emailed confirm link routes through
   `/auth/callback`, which `handleCallback` tolerates.)
2. **Authentication → Providers → Google** — enable, paste the OAuth Client ID +
   Secret from Google Cloud Console (Credentials → OAuth client, "Web
   application"). Authorized redirect URI in Google:
   `https://zabpnnnratrktcafnffk.supabase.co/auth/v1/callback`.
3. **Authentication → Providers → GitHub** — enable, paste Client ID + Secret
   from a GitHub OAuth App (Settings → Developer settings → OAuth Apps).
   Authorization callback URL: the same `.../auth/v1/callback`.
4. **Authentication → URL Configuration**:
   - **Site URL**: the Vercel production origin.
   - **Redirect URLs** (allow-list): `http://localhost:5181/auth/callback`, the
     Vercel production `/auth/callback`, and the preview wildcard
     `https://*-<team>.vercel.app/auth/callback`.
5. Mirror `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` into Vercel
   (Production + Preview + Development).

Until steps 2–4 are done, Google/GitHub buttons will bounce to Supabase and
fail the allow-list check; email+password is fully functional now.
