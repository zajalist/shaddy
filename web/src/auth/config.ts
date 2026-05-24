// OIDC client config for Shaddy.
//
// The auth backend lives on the user's home server (`srv-dev-01` on their
// Tailscale tailnet, reachable via MagicDNS). Five values to fill in once
// you confirm what's running on srv-dev-01:
//
// 1. `issuer` — the OIDC issuer URL. For most self-hosted providers this is
//    the base URL of the provider, for example:
//      - Keycloak:  `http://srv-dev-01/auth/realms/shaddy`
//      - Authentik: `http://srv-dev-01` (when published at root)
//                   or `http://srv-dev-01/application/o/shaddy/` (per-app)
//      - Authelia:  `http://srv-dev-01`
//      - Dex:       `http://srv-dev-01/dex`
//    The client discovers every endpoint via
//    GET `<issuer>/.well-known/openid-configuration`.
//
// 2. `clientId` — register a new client in your provider's admin UI named
//    "shaddy" with redirect URI `http://localhost:5181/auth/callback` for
//    local dev (and add the production URL once you ship). PUBLIC client,
//    NO secret. Type: SPA / public / authorization-code-with-PKCE.
//
// 3. `redirectUri` — already set below; matches the route AuthCallback
//    handles. Add the exact same string to the provider's "Valid redirect
//    URIs" list.
//
// 4. `scopes` — `openid profile email` is the minimum for sign-in + user
//    info. Add `offline_access` if you want refresh tokens (most providers
//    need this scope to issue a `refresh_token`).
//
// 5. (optional) `VITE_OAUTH_ISSUER`, `VITE_OAUTH_CLIENT_ID`,
//    `VITE_OAUTH_REDIRECT_URI`, `VITE_OAUTH_SCOPES` environment variables
//    override these defaults at build time. Use them when shipping to
//    production (e.g. Vercel env vars).

export interface AuthConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

// `window` is unavailable during SSR / Node-side tooling; guard so the
// module is safe to import in any context.
const defaultRedirect =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:5181/auth/callback';

export const AUTH_CONFIG: AuthConfig = {
  issuer: import.meta.env.VITE_OAUTH_ISSUER ?? 'http://srv-dev-01',
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID ?? 'shaddy',
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI ?? defaultRedirect,
  scopes: (import.meta.env.VITE_OAUTH_SCOPES ?? 'openid profile email').split(' '),
};

// localStorage key for the persisted token bundle. Bumping the `v1` suffix
// is how we invalidate every existing session in one shot if the shape
// changes incompatibly.
export const AUTH_STORAGE_KEY = 'shaddy.auth.v1';

// sessionStorage keys used during the in-flight authorize → callback round
// trip. Cleared once `handleCallback()` succeeds (or fails).
export const PKCE_STORAGE_PREFIX = 'shaddy.auth.pkce.';
export const RETURN_TO_KEY = 'shaddy.auth.returnTo';
