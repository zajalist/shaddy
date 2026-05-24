// OIDC authorization-code-with-PKCE flow.
//
// Provider-agnostic: we read every endpoint from the discovery document at
// `<issuer>/.well-known/openid-configuration` so the same code works with
// Keycloak, Authentik, Authelia, Dex, etc.
//
// Tokens live in `localStorage` under AUTH_STORAGE_KEY. We DO NOT
// cryptographically verify ID-token signatures in the browser — that's the
// provider/relying-party server's job. We only decode the JWT payload for
// display (name, email, picture). For hackathon scope this is the right
// tradeoff; for production you'd add JWKS verification.

import {
  AUTH_CONFIG,
  AUTH_STORAGE_KEY,
  PKCE_STORAGE_PREFIX,
  RETURN_TO_KEY,
} from './config';
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from './pkce';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface AuthUser {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
  [claim: string]: unknown;
}

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  // Absolute epoch-ms when the access token expires.
  expiresAt: number;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Discovery doc cache (per-session)
// ---------------------------------------------------------------------------

let discoveryPromise: Promise<DiscoveryDocument> | null = null;

async function loadDiscovery(): Promise<DiscoveryDocument> {
  if (discoveryPromise) return discoveryPromise;
  const url = `${AUTH_CONFIG.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
  discoveryPromise = (async () => {
    let res: Response;
    try {
      res = await fetch(url, { credentials: 'omit' });
    } catch (err) {
      const msg = `OIDC discovery fetch failed for ${url} — is the auth server reachable? (${(err as Error).message})`;
      console.error('[auth]', msg);
      throw new Error(msg);
    }
    if (!res.ok) {
      const msg = `OIDC discovery returned ${res.status} ${res.statusText} for ${url}. Check that VITE_OAUTH_ISSUER points at the right base URL.`;
      console.error('[auth]', msg);
      throw new Error(msg);
    }
    return (await res.json()) as DiscoveryDocument;
  })();
  return discoveryPromise;
}

// ---------------------------------------------------------------------------
// Storage + state subscription
// ---------------------------------------------------------------------------

const AUTH_CHANGE_EVENT = 'shaddy-auth-change';

function readStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokens;
  } catch (err) {
    console.error('[auth] Failed to parse stored tokens; clearing.', err);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredTokens(tokens: StoredTokens | null): void {
  if (tokens) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  // Notify same-tab subscribers (the `storage` event only fires cross-tab).
  window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
}

export function readAuthState(): AuthState {
  const t = readStoredTokens();
  if (!t) return { user: null, accessToken: null, isLoading: false };
  return {
    user: t.user,
    accessToken: t.expiresAt > Date.now() ? t.accessToken : null,
    isLoading: false,
  };
}

export function subscribeToAuthChanges(
  cb: (state: AuthState) => void,
): () => void {
  const handler = () => cb(readAuthState());
  // Same tab.
  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  // Cross-tab (storage events only fire in OTHER tabs).
  const storageHandler = (e: StorageEvent) => {
    if (e.key === AUTH_STORAGE_KEY) handler();
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ---------------------------------------------------------------------------
// JWT payload decode (no signature verification)
// ---------------------------------------------------------------------------

function decodeJwtPayload(jwt: string): AuthUser {
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT (expected 3 segments).');
  }
  // base64url → base64 → string.
  const b64 = (parts[1] as string).replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as AuthUser;
}

// ---------------------------------------------------------------------------
// signIn → authorize redirect
// ---------------------------------------------------------------------------

export async function signIn(): Promise<void> {
  const discovery = await loadDiscovery();
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Stash verifier keyed by state so callback can find it (and only it).
  sessionStorage.setItem(PKCE_STORAGE_PREFIX + state, verifier);

  // Remember where the user came from, so callback can route them back.
  sessionStorage.setItem(
    RETURN_TO_KEY,
    window.location.pathname + window.location.search,
  );

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', AUTH_CONFIG.clientId);
  url.searchParams.set('redirect_uri', AUTH_CONFIG.redirectUri);
  url.searchParams.set('scope', AUTH_CONFIG.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  window.location.href = url.toString();
}

// ---------------------------------------------------------------------------
// handleCallback → token exchange
// ---------------------------------------------------------------------------

export interface CallbackResult {
  returnTo: string;
}

export async function handleCallback(): Promise<CallbackResult> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  if (error) {
    const desc = params.get('error_description') ?? '';
    throw new Error(`OIDC provider returned error: ${error}${desc ? ` — ${desc}` : ''}`);
  }
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    throw new Error('Callback URL missing required ?code or ?state.');
  }

  const verifierKey = PKCE_STORAGE_PREFIX + state;
  const verifier = sessionStorage.getItem(verifierKey);
  if (!verifier) {
    throw new Error(
      'PKCE verifier not found in sessionStorage. The browser may have lost ' +
        'session state between the authorize redirect and the callback.',
    );
  }
  sessionStorage.removeItem(verifierKey);

  const discovery = await loadDiscovery();

  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('redirect_uri', AUTH_CONFIG.redirectUri);
  body.set('client_id', AUTH_CONFIG.clientId);
  body.set('code_verifier', verifier);

  let res: Response;
  try {
    res = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      credentials: 'omit',
    });
  } catch (err) {
    throw new Error(
      `Token exchange network error — likely CORS. The provider must allow ` +
        `the SPA origin (${window.location.origin}) on its token endpoint. ` +
        `(${(err as Error).message})`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Token exchange failed: ${res.status} ${res.statusText} — ${text}`);
  }
  const tokens = (await res.json()) as TokenResponse;
  persistTokens(tokens);

  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/design';
  sessionStorage.removeItem(RETURN_TO_KEY);
  return { returnTo };
}

function persistTokens(tokens: TokenResponse): void {
  if (!tokens.id_token) {
    throw new Error('Token response missing id_token — request `openid` scope.');
  }
  const user = decodeJwtPayload(tokens.id_token);
  const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
  writeStoredTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    expiresAt,
    user,
  });
}

// ---------------------------------------------------------------------------
// getAccessToken — auto-refresh within 60s of expiry
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  const stored = readStoredTokens();
  if (!stored) return null;

  const skewMs = 60_000;
  if (stored.expiresAt - skewMs > Date.now()) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    // Expired and no refresh token → caller should re-signIn.
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const discovery = await loadDiscovery();
        const body = new URLSearchParams();
        body.set('grant_type', 'refresh_token');
        body.set('refresh_token', stored.refreshToken!);
        body.set('client_id', AUTH_CONFIG.clientId);
        const res = await fetch(discovery.token_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: body.toString(),
          credentials: 'omit',
        });
        if (!res.ok) {
          console.error('[auth] Refresh failed:', res.status, await res.text().catch(() => ''));
          writeStoredTokens(null);
          return null;
        }
        const tokens = (await res.json()) as TokenResponse;
        // Some providers omit a new id_token on refresh; keep the old one
        // (and the old user claims) in that case.
        if (!tokens.id_token) {
          const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;
          writeStoredTokens({
            ...stored,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? stored.refreshToken,
            expiresAt,
          });
          return tokens.access_token;
        }
        persistTokens(tokens);
        return tokens.access_token;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// ---------------------------------------------------------------------------
// getUser — cheap synchronous accessor
// ---------------------------------------------------------------------------

export function getUser(): AuthUser | null {
  return readStoredTokens()?.user ?? null;
}

// ---------------------------------------------------------------------------
// signOut — clear local state + redirect to end_session if available
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  const stored = readStoredTokens();
  writeStoredTokens(null);

  // Best-effort: hit the provider's end-session endpoint if discovered.
  try {
    const discovery = await loadDiscovery();
    if (discovery.end_session_endpoint) {
      const url = new URL(discovery.end_session_endpoint);
      if (stored?.idToken) {
        url.searchParams.set('id_token_hint', stored.idToken);
      }
      url.searchParams.set(
        'post_logout_redirect_uri',
        window.location.origin + '/',
      );
      window.location.href = url.toString();
      return;
    }
  } catch (err) {
    // Discovery unreachable on sign-out is non-fatal — local state is gone.
    console.warn('[auth] Could not reach end_session_endpoint on sign-out:', err);
  }
  // No end-session endpoint → just stay where we are; the auth event has
  // already fired so the UI will re-render as signed-out.
}
