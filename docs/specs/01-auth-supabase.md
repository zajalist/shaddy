# Auth — Supabase (Google, GitHub, Email + password)

> Swap the `web/src/auth` module's self-hosted Authentik/OIDC internals for `@supabase/supabase-js` while keeping its public API byte-for-byte stable. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

The `@/auth` module today drives a hand-rolled OIDC authorization-code-with-PKCE
flow against a self-hosted Authentik instance on `srv-dev-01` (Tailscale-only,
unreachable from Vercel). This spec replaces the *internals* — `oidc.ts` and
`pkce.ts` — with `@supabase/supabase-js`, adds three real sign-in methods
(Google, GitHub, Email + password), and makes `user.id` (a Supabase uuid) the
canonical user key for the whole system. The module's public surface
(`useAuth`, `SignInButton`, `AuthCallback`, `AUTH_CONFIG`, `signIn`, `signOut`,
`getAccessToken`, `getUser`, and the `AuthUser`/`AuthState`/`UseAuth` types
exported from `web/src/auth/index.ts`) stays stable so `TopBar`
(`web/src/design/components.tsx:438`) and `Landing`
(`web/src/design/Landing.tsx:258`, `:352`) keep compiling unchanged. On first
sign-in we auto-create a `profiles` row (handle / display_name / avatar) in the
backend so the gallery has an author identity to attach to.

## Goals

- Install and wire `@supabase/supabase-js`; expose a single shared client.
- Three working sign-in methods: Google OAuth, GitHub OAuth, Email + password.
- Keep `web/src/auth/index.ts`'s exported names and type shapes identical.
- Map the Supabase `User` onto the existing `AuthUser` shape so `SignInButton`'s
  `displayName()` / `picture` logic (`SignInButton.tsx:20-36`, `:80`) is untouched.
- Session persistence + silent token refresh + cross-tab sync via Supabase's own
  `onAuthStateChange`, replacing the custom `storage`-event plumbing.
- `getAccessToken()` returns a *fresh* Supabase JWT for the FastAPI backend
  (verified there per 02-backend-srv-dev-01.md).
- Auto-create a profile row on first sign-in.
- Retire the `VITE_OAUTH_*` env vars; introduce `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY`.

## Non-goals

- Building the `profiles` table / API (owned by 02-backend-srv-dev-01.md and
  03-gallery-frontend.md). This spec only *calls* the "ensure profile" endpoint and
  specifies its contract.
- Author profile pages at `/u/:handle`, likes, remix lineage (03-gallery-frontend.md).
- Server-side JWT verification (02-backend-srv-dev-01.md).
- Redesigning `SignInButton` visually beyond adding the provider picker.
- Email confirmation templates / password-reset UI polish (basic flow only;
  see Risks).

## Current state

All paths under `web/`. Verified by reading the files.

- `web/src/auth/config.ts` — `AuthConfig` interface (`:35-40`) and `AUTH_CONFIG`
  (`:49-54`) read `VITE_OAUTH_ISSUER` / `VITE_OAUTH_CLIENT_ID` /
  `VITE_OAUTH_REDIRECT_URI` / `VITE_OAUTH_SCOPES`, defaulting to
  `http://srv-dev-01`. Also defines `AUTH_STORAGE_KEY = 'shaddy.auth.v1'`
  (`:59`), `PKCE_STORAGE_PREFIX` (`:63`), `RETURN_TO_KEY` (`:64`).
- `web/src/auth/oidc.ts` — the whole OIDC engine. Defines and exports
  `AuthUser` (`:47-54`), `AuthState` (`:65-69`), `signIn` (`:174`),
  `handleCallback` (`:209`), `getAccessToken` (`:292`, refreshes within 60s of
  expiry), `getUser` (`:355`), `signOut` (`:363`), `readAuthState` (`:127`),
  `subscribeToAuthChanges` (`:137`, listens on a custom `shaddy-auth-change`
  event + the `storage` event). Tokens persist in `localStorage` under
  `AUTH_STORAGE_KEY`; ID-token payload is base64url-decoded without signature
  verification (`decodeJwtPayload`, `:158`).
- `web/src/auth/pkce.ts` — Web-Crypto PKCE helpers: `generateCodeVerifier`,
  `generateCodeChallenge`, `generateState`. No external deps.
- `web/src/auth/useAuth.ts` — `UseAuth` interface (`:15-22`); `useAuth()`
  (`:24`) seeds state from `readAuthState()` and subscribes via
  `subscribeToAuthChanges`. Returns `{ user, accessToken, isAuthenticated,
  isLoading, signIn, signOut }`.
- `web/src/auth/SignInButton.tsx` — reads `useAuth()` (`:39`); `displayName()`
  prefers `user.name ?? user.preferred_username ?? user.email ?? user.sub`
  (`:20-28`); renders `user.picture` as the avatar (`:80`). Calls `signIn()` on
  the signed-out button (`:59`) and `signOut()` from the dropdown (`:155`).
- `web/src/auth/AuthCallback.tsx` — mounted at `/auth/callback`; `useEffect`
  calls `handleCallback()` then `navigate(returnTo, { replace: true })`
  (`:22-39`); shows a pending / error block.
- `web/src/auth/index.ts` — the public barrel. Exports (must stay stable):
  `AUTH_CONFIG`, type `AuthConfig`; `useAuth`, type `UseAuth`; `signIn`,
  `signOut`, `getAccessToken`, `getUser`; types `AuthUser`, `AuthState`;
  `AuthCallback`; `SignInButton`, type `SignInButtonProps`.
- `web/.env.local` — currently only `VITE_OAUTH_*` (Authentik on `srv-dev-01`).
- `web/src/integration/main.tsx:83` — `<Route path="/auth/callback"
  element={<AuthCallback />} />`. The only `@/auth` import here is
  `AuthCallback` (`:22`).
- Consumers of `@/auth` (verified via grep): `web/src/integration/main.tsx`
  (`AuthCallback`), `web/src/design/components.tsx:10,438` (`SignInButton` in
  `TopBar`), `web/src/design/Landing.tsx:5,258,352` (`SignInButton` in the nav,
  desktop + mobile). No other file imports `getAccessToken` or `getUser` yet —
  the backend client (02) will be the first real consumer of `getAccessToken`.
- `web/package.json` — no `@supabase/*` dependency yet. React 19, Vite 6,
  Vitest 2.1.5, react-router-dom 7.
- `CONTRACTS.md:267` — dependency arrow: `design/ ──► … auth/`. `auth/` is a
  leaf consumed by `design/`. ESLint enforces "public `index.ts` only" but the
  `auth/` files block is not separately listed; the existing `design/` rule
  (`web/eslint.config.js:100-109`) already forbids deep-importing `auth`
  internals. No new boundary is required; CONTRACTS does not need editing for
  this spec (the public surface is unchanged).
- No tests exist under `web/src/auth/` (glob `**/*.test.*` → none).

## Design

### 3.1 Dependency + client singleton

Add `@supabase/supabase-js@^2` to `web/package.json` dependencies.

New file **`web/src/auth/supabase.ts`** — the single client instance. Nothing
outside `auth/` may import it (it is not re-exported from `index.ts`); the rest
of the app uses `useAuth` / `getAccessToken` / `getUser` exactly as today.

```ts
// web/src/auth/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_CONFIG } from './config';

export const supabase: SupabaseClient = createClient(
  AUTH_CONFIG.supabaseUrl,
  AUTH_CONFIG.supabaseAnonKey,
  {
    auth: {
      persistSession: true,        // localStorage, survives reload
      autoRefreshToken: true,      // silent refresh before expiry
      detectSessionInUrl: true,    // parse #access_token=… on /auth/callback
      flowType: 'pkce',            // PKCE for OAuth — Supabase manages it
      storageKey: 'shaddy.auth.v2',// bump from v1; invalidates old Authentik blobs
    },
  },
);
```

`flowType: 'pkce'` means Supabase generates and stores its own code verifier — we
delete our `pkce.ts` entirely. `detectSessionInUrl: true` means
`AuthCallback` no longer hand-parses `?code`; calling
`supabase.auth.getSession()` (or letting the client auto-detect) finishes the
exchange.

### 3.2 config.ts — new env vars

Replace the `VITE_OAUTH_*` reads. `AuthConfig` keeps `redirectUri` (still the
`/auth/callback` URL Supabase redirects back to) and adds `supabaseUrl` /
`supabaseAnonKey`. Drop `issuer`, `clientId`, `scopes`. Remove
`PKCE_STORAGE_PREFIX`; keep `RETURN_TO_KEY` (still used to bounce the user back).
`AUTH_STORAGE_KEY` is now superseded by the client's `storageKey` — remove it
and its references.

```ts
export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  redirectUri: string;
}
const defaultRedirect =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:5181/auth/callback';
export const AUTH_CONFIG: AuthConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI ?? defaultRedirect,
};
export const RETURN_TO_KEY = 'shaddy.auth.returnTo';
```

If `supabaseUrl`/`supabaseAnonKey` are empty at module load, `supabase.ts`
throws a clear error ("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY") rather
than failing deep inside the SDK.

### 3.3 `AuthUser` mapping (the compatibility seam)

`AuthUser` keeps the *exact same field names* the OIDC code produced, so
`SignInButton.displayName()` and the `picture` read keep working with zero
changes. We map the Supabase `User` onto it:

```ts
export interface AuthUser {
  sub: string;                 // ← supabaseUser.id (the canonical uuid)
  name?: string;               // ← user_metadata.full_name | name
  preferred_username?: string; // ← user_metadata.user_name (GitHub) | derived
  email?: string;              // ← supabaseUser.email
  picture?: string;            // ← user_metadata.avatar_url | picture
  [claim: string]: unknown;
}

function mapUser(u: SupabaseUser): AuthUser {
  const m = u.user_metadata ?? {};
  return {
    sub: u.id,
    name: m.full_name ?? m.name ?? undefined,
    preferred_username: m.user_name ?? m.preferred_username ?? undefined,
    email: u.email ?? undefined,
    picture: m.avatar_url ?? m.picture ?? undefined,
  };
}
```

Provider metadata keys vary: Google → `full_name`, `avatar_url`, `email`;
GitHub → `user_name`, `name`, `avatar_url`; email/password → only `email` (no
name/avatar, so `displayName()` falls through to `email`, which is the existing
intended fallback). `sub` carries the uuid so any code already reading
`user.sub` (e.g. `displayName()`'s final fallback) silently picks up the canonical
key.

### 3.4 oidc.ts → session.ts (rewrite, same exports)

Rename the engine file to **`web/src/auth/session.ts`** (clearer name; `oidc.ts`
is deleted). It re-exports the same symbols the barrel needs. Internally it is
thin glue over the Supabase client.

- `readAuthState(): AuthState` — synchronous best-effort read of the cached
  session. `@supabase/supabase-js` v2 exposes the current session synchronously
  only after init; to keep `useAuth`'s synchronous initial render we hold a
  module-level `currentState` updated by the `onAuthStateChange` subscription
  (registered once at module load) and seeded from the client's persisted
  session. `accessToken` is `session.access_token` when present.
- `subscribeToAuthChanges(cb)` — wraps `supabase.auth.onAuthStateChange((event,
  session) => { currentState = toState(session); cb(currentState); })` and
  returns its `unsubscribe`. Supabase fires this across tabs automatically
  (it watches its own storage key), so the custom `shaddy-auth-change` event and
  the manual `storage` listener are both deleted.
- `signIn(provider?)` — see 3.5. Keeps a zero-arg call signature compatible with
  the old `signIn(): Promise<void>` so `SignInButton`'s `void signIn()` at
  `SignInButton.tsx:59` still type-checks; the provider arg is optional.
- `signOut()` — `await supabase.auth.signOut()`. No end-session redirect needed;
  the auth-change event re-renders the UI as signed-out. Keeps
  `Promise<void>`.
- `getAccessToken(): Promise<string | null>` — `const { data } = await
  supabase.auth.getSession(); return data.session?.access_token ?? null`. The
  client auto-refreshes (`autoRefreshToken: true`), so this returns a valid JWT;
  the old manual 60s-skew refresh logic is deleted.
- `getUser(): AuthUser | null` — synchronous accessor returning
  `currentState.user`.
- `handleCallback(): Promise<{ returnTo: string }>` — see 3.6.

`AuthState` keeps its shape `{ user, accessToken, isLoading }`. `isLoading` is
`true` only during the very first session-restore tick, then `false`.

### 3.5 signIn — provider routing

```ts
export type AuthProvider = 'google' | 'github' | 'password';

export async function signIn(
  provider: AuthProvider = 'google',
  creds?: { email: string; password: string; mode?: 'signin' | 'signup' },
): Promise<void> {
  sessionStorage.setItem(RETURN_TO_KEY, location.pathname + location.search);
  if (provider === 'google' || provider === 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: AUTH_CONFIG.redirectUri },
    });
    if (error) throw error;            // browser then redirects to the provider
    return;
  }
  // email + password
  const { email, password, mode = 'signin' } = creds!;
  const fn = mode === 'signup'
    ? supabase.auth.signUp({ email, password,
        options: { emailRedirectTo: AUTH_CONFIG.redirectUri } })
    : supabase.auth.signInWithPassword({ email, password });
  const { error } = await fn;
  if (error) throw error;
  await ensureProfile();               // password sign-in resolves in place
}
```

`SignInButton`'s existing signed-out button calls `signIn()` with no args → the
default `'google'` keeps the one-click path alive. The provider picker (3.7)
calls `signIn('github')` / `signIn('password', { … })`.

### 3.6 handleCallback (`/auth/callback`)

With `detectSessionInUrl: true` the SDK exchanges the code as soon as the client
sees the callback URL. `handleCallback` waits for the session, then ensures the
profile and returns where to go:

```ts
export async function handleCallback(): Promise<{ returnTo: string }> {
  // OAuth errors arrive as ?error / ?error_description.
  const q = new URLSearchParams(location.search);
  if (q.get('error')) {
    throw new Error(q.get('error_description') ?? q.get('error')!);
  }
  // SDK auto-detected the code; getSession resolves once exchange completes.
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('No session after callback.');
  await ensureProfile();
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/design';
  sessionStorage.removeItem(RETURN_TO_KEY);
  return { returnTo };
}
```

`AuthCallback.tsx` is unchanged: it still calls `handleCallback()` then
`navigate(returnTo, { replace: true })`. We may strip the `#access_token=…`
fragment from the URL before navigating (cosmetic) — `navigate(returnTo,
{ replace: true })` already drops it.

### 3.7 SignInButton — provider picker

Signed-in rendering is **untouched** (avatar / name / dropdown). Only the
signed-out branch changes: instead of one button that fires Google, it opens a
small popover with three choices, reusing the same flat styling already in the
file (no new design tokens, respecting the "no glow / flat" rule):

- "Continue with Google" → `signIn('google')`
- "Continue with GitHub" → `signIn('github')`
- An email + password mini-form (email, password, a "Sign in / Create account"
  toggle) → `signIn('password', { email, password, mode })`. On error, show the
  Supabase error message inline (e.g. "Invalid login credentials").

`SignInButtonProps` keeps `{ className? }` — no signature change. The popover is
internal state. Errors from OAuth `signIn` still surface via the existing
`.catch` at `SignInButton.tsx:59`.

### 3.8 Profile auto-creation

`ensureProfile()` (in `session.ts`) is called after every successful sign-in
(OAuth callback + password). It POSTs to the backend's idempotent endpoint with
a fresh JWT; the backend upserts on `user_id` and is a no-op after the first
call. Contract (implemented in 02-backend-srv-dev-01.md):

```
POST  https://api.<domain>/v1/profile/ensure
Authorization: Bearer <supabase access_token>
Body: { suggested_handle?, display_name?, avatar_url? }
→ 200 { user_id, handle, display_name, avatar_url, created }
```

Client derives the suggestions from the mapped `AuthUser`:
`display_name = name ?? preferred_username ?? email.split('@')[0]`,
`suggested_handle = preferred_username ?? slug(display_name)`,
`avatar_url = picture`. The backend resolves handle collisions (append `-2`,
`-3`, …). `ensureProfile` swallows network errors (logs, never blocks sign-in) —
the gallery's publish path (03) re-ensures on first publish, so a transient
failure here is non-fatal.

This is the one cross-module call. It does **not** add an `auth → integration`
or `auth → design` dependency; the fetch URL comes from
`import.meta.env.VITE_API_BASE_URL` (introduced in 02). `auth/` stays a leaf.

### 3.9 Supabase dashboard setup (one-time, document in README)

1. Create a Supabase project. Copy **Project URL** → `VITE_SUPABASE_URL` and the
   **anon/public** key → `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
2. **Authentication → Providers → Email**: enable. For a hackathon, turn
   "Confirm email" OFF so password sign-up logs in immediately (note the
   tradeoff in Risks). For production, leave it ON and handle the confirm link.
3. **Authentication → Providers → Google**: enable, paste the OAuth **Client ID**
   + **Client Secret** from Google Cloud Console (Credentials → OAuth client,
   type "Web application"). In Google Cloud, set the **Authorized redirect URI**
   to `https://<project-ref>.supabase.co/auth/v1/callback` (Supabase shows this
   exact string on the provider page).
4. **Authentication → Providers → GitHub**: enable, paste **Client ID** +
   **Client Secret** from a GitHub OAuth App
   (Settings → Developer settings → OAuth Apps). Set the GitHub app's
   **Authorization callback URL** to the same
   `https://<project-ref>.supabase.co/auth/v1/callback`.
5. **Authentication → URL Configuration**:
   - **Site URL**: the Vercel production origin (e.g. `https://shaddy.vercel.app`).
   - **Redirect URLs** (allow-list): add all three of our callback URLs —
     `http://localhost:5181/auth/callback`, the Vercel production
     `https://<domain>/auth/callback`, and the Vercel preview wildcard
     `https://*-<team>.vercel.app/auth/callback`. Supabase only redirects back to
     allow-listed URLs, so missing one breaks that environment silently.
6. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to Vercel (Production +
   Preview + Development) and to local `web/.env.local`.

### 3.10 Files deleted / changed

**Deleted:** `web/src/auth/oidc.ts`, `web/src/auth/pkce.ts`.

**Added:** `web/src/auth/supabase.ts`, `web/src/auth/session.ts` (the renamed
engine), `web/src/auth/session.test.ts`, `web/src/auth/SignInButton.test.tsx`.

**Changed:** `web/src/auth/config.ts` (env vars), `web/src/auth/index.ts`
(re-export from `./session` instead of `./oidc`; export the `AuthProvider`
type), `web/src/auth/useAuth.ts` (import from `./session`),
`web/src/auth/SignInButton.tsx` (provider picker), `web/.env.local`
(`VITE_SUPABASE_*`), `web/package.json` (add dep). `AuthCallback.tsx` changes
only its import path (`./oidc` → `./session`). `web/src/integration/main.tsx`
and the two `design/` consumers need **no** changes.

## Implementation tasks

Ordered vertical slices; each is independently testable.

- [ ] **Slice 1 — dependency + client + config.** Add
  `@supabase/supabase-js@^2` to `web/package.json` and install. Write
  `web/src/auth/supabase.ts` (client singleton with the `auth` options from 3.1,
  throwing if env vars are missing). Rewrite `config.ts` per 3.2. Update
  `web/.env.local` to `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (+ keep the
  optional `VITE_OAUTH_REDIRECT_URI` override). Delete the `VITE_OAUTH_ISSUER` /
  `_CLIENT_ID` / `_SCOPES` lines. `npm run typecheck` passes (config has no
  remaining `oidc.ts` consumers yet — that lands in Slice 2).
- [ ] **Slice 2 — session engine.** Create `web/src/auth/session.ts` with
  `AuthUser`, `AuthState`, `mapUser`, the module-level `currentState`, the single
  `onAuthStateChange` registration, and `readAuthState`,
  `subscribeToAuthChanges`, `getAccessToken`, `getUser`, `signOut`. Delete
  `oidc.ts` and `pkce.ts`. Point `useAuth.ts`, `AuthCallback.tsx`, and
  `index.ts` at `./session`. `npm run typecheck` + `npm run lint` pass; the app
  builds.
- [ ] **Slice 3 — sign-in flows.** Implement `signIn(provider, creds?)` (3.5)
  and `handleCallback` (3.6) in `session.ts`. Export the `AuthProvider` type
  from `index.ts`. Verify the existing zero-arg `signIn()` path
  (`SignInButton.tsx:59`) still type-checks and routes to Google.
- [ ] **Slice 4 — SignInButton provider picker.** Add the signed-out popover
  with Google / GitHub / email-password (3.7), inline error display, flat
  styling (no glow). Signed-in branch untouched. `SignInButtonProps` unchanged.
- [ ] **Slice 5 — profile auto-creation.** Add `ensureProfile()` to
  `session.ts`, called from `handleCallback` and the password branch of
  `signIn`. Read `VITE_API_BASE_URL`. Derive handle/display_name/avatar from the
  mapped user. Swallow + log failures. (Backend endpoint lands in
  02-backend-srv-dev-01.md; gate this slice's live test on that.)
- [ ] **Slice 6 — dashboard + env wiring.** Perform the §3.9 setup on a real
  Supabase project; add env vars to Vercel (prod + preview + dev) and
  `.env.local`. Document the six steps in `web/README` (or `docs/`). Smoke-test
  all three sign-in methods on localhost and a Vercel preview.

## Testing

Vitest 2.1 + @testing-library/react + jsdom. New tests under `web/src/auth/`.

- **`session.test.ts` (unit).** Mock `./supabase` with `vi.mock` exporting a fake
  `supabase.auth` (`getSession`, `signInWithOAuth`, `signInWithPassword`,
  `signUp`, `signOut`, `onAuthStateChange`). Assert:
  - `mapUser` maps Google metadata (`full_name`/`avatar_url`/`email`) and GitHub
    metadata (`user_name`/`name`/`avatar_url`) onto the right `AuthUser` fields,
    and that `sub === user.id`.
  - `readAuthState()` returns `{ user: null, accessToken: null }` with no
    session, and the mapped user + access token when a session is present.
  - `getAccessToken()` resolves to `session.access_token` / `null`.
  - `signIn('github')` calls `signInWithOAuth({ provider: 'github', options:{
    redirectTo } })` and stores `RETURN_TO_KEY`.
  - `signIn('password', { email, password })` calls `signInWithPassword` and, on
    success, calls the `ensureProfile` fetch (assert via a mocked `fetch`).
  - `handleCallback()` throws on `?error=access_denied`, and on success returns
    `{ returnTo }` from `RETURN_TO_KEY` (default `/design`).
  - `subscribeToAuthChanges` forwards the fake `onAuthStateChange` callback and
    returns its `unsubscribe`.
- **`SignInButton.test.tsx` (component).** With `useAuth` mocked signed-out, the
  picker opens and clicking "Continue with GitHub" calls `signIn('github')`;
  submitting the email form calls `signIn('password', …)`; an injected error
  message renders inline. With `useAuth` mocked signed-in, the avatar +
  `displayName` render and the dropdown still calls `signOut` — proving the
  stable-API contract.
- **`index` export test (unit).** A tiny test importing every name from
  `@/auth` and asserting the exported symbols exist (`AUTH_CONFIG`, `useAuth`,
  `signIn`, `signOut`, `getAccessToken`, `getUser`, `AuthCallback`,
  `SignInButton`) — a regression guard on the public surface.
- **Manual integration (Slice 6).** Each provider on localhost:5181 and a Vercel
  preview: sign in → land on `returnTo` → `TopBar` shows the avatar → reload
  keeps the session → open a second tab and confirm it reflects sign-in/out
  (cross-tab) → sign out clears both.

## Risks & open questions

- **Email confirmation.** With "Confirm email" OFF, `signUp` logs the user in
  immediately (good demo UX) but anyone can register with any address. For
  production turn it ON; then `signUp` returns a user with no session until the
  emailed link is clicked, and `handleCallback` must tolerate "session pending".
  Decision for the hackathon: OFF; flag in README.
- **Provider metadata drift.** `user_metadata` keys differ per provider and can
  change. `mapUser` falls back through several keys and ultimately to `email` /
  `sub`, so the UI never shows blank, but the unit test pins the known shapes.
- **Synchronous initial state.** Supabase restores the session asynchronously,
  so the first `useAuth` render may briefly be signed-out before
  `onAuthStateChange` fires. `isLoading: true` on that first tick lets consumers
  avoid a flash if they choose; `SignInButton` already tolerates a signed-out
  first paint.
- **Anon key exposure.** `VITE_SUPABASE_ANON_KEY` ships in the client bundle —
  this is expected and safe (it is the public key); all real protection is RLS +
  the backend JWT check (02). Never put the service-role key in `web/`.
- **`getAccessToken` token lifetime.** Supabase JWTs default to 1h; the SDK
  refreshes silently. The backend must accept the current signing key — keep the
  project JWT secret / JWKS in sync (02).
- **Open question:** do we want a dedicated `/login` route, or is the popover
  enough? Current plan: popover only, no route. Revisit if the gallery needs a
  deep-link "please sign in" target.

## Dependencies

- **02-backend-srv-dev-01.md** — provides `POST /v1/profile/ensure`, the JWT
  verification, CORS for the Vercel + localhost origins, and the
  `VITE_API_BASE_URL` value. Slice 5 is gated on it.
- **03-gallery-frontend.md** — consumes `user.id` (= `AuthUser.sub`) as the author key and
  re-ensures the profile on first publish; depends on this module's stable API.
- **External setup:** a Supabase project; a Google Cloud OAuth client; a GitHub
  OAuth App; Vercel env vars (§3.9). Vercel deploy config already exists
  (commit `aca9420`).
- No `CONTRACTS.md` change required: the public surface and the `design/ ──►
  auth/` arrow are unchanged. (If a future slice exposed the raw `supabase`
  client from `index.ts`, that *would* need a CONTRACTS note — explicitly out of
  scope here.)

## Done when

- [ ] `@supabase/supabase-js` is a dependency; `oidc.ts` and `pkce.ts` are
  deleted; `supabase.ts` + `session.ts` exist.
- [ ] `web/src/auth/index.ts` exports the identical names + type shapes it does
  today (plus the new `AuthProvider` type); `npm run typecheck`, `npm run lint`,
  and `npm run test` all pass.
- [ ] `web/src/design/components.tsx`, `web/src/design/Landing.tsx`, and
  `web/src/integration/main.tsx` compile **unchanged** against the new internals.
- [ ] Google, GitHub, and Email+password each sign a user in on localhost and on
  a Vercel preview, landing on the `returnTo` page with the avatar in `TopBar`.
- [ ] Session survives reload; sign-in/out syncs across tabs via
  `onAuthStateChange`; `getAccessToken()` returns a fresh JWT the backend
  accepts.
- [ ] First sign-in creates exactly one `profiles` row (handle / display_name /
  avatar); repeat sign-ins are no-ops.
- [ ] `VITE_OAUTH_*` vars are gone from `web/.env.local`; `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are set in `.env.local` and in Vercel.
