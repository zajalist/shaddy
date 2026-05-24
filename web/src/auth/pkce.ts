// PKCE (Proof Key for Code Exchange) helpers — RFC 7636.
//
// The browser cannot keep a client secret, so we prove possession of the
// auth code by hashing a random verifier. The provider stores the SHA-256
// hash (the "challenge") with the authorize request and re-derives it from
// the verifier sent with the token request.
//
// All primitives are Web Crypto — no dependencies.

/**
 * Base64url encode without padding (RFC 4648 §5). The OAuth spec requires
 * the URL-safe variant for PKCE values.
 */
function base64UrlEncode(bytes: Uint8Array): string {
  // Build a binary string then btoa it. Chunked to avoid call-stack blowups
  // on large buffers (verifier/challenge are tiny so this is overkill, but
  // it's the right shape).
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i] as number);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a high-entropy code verifier. RFC 7636 §4.1 requires
 * 43–128 characters from the unreserved set. We use 32 random bytes →
 * 43 base64url chars, then pad to a stable 64 chars by drawing 48 bytes.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes); // 64 chars
}

/**
 * SHA-256 hash of the verifier, base64url-encoded. Sent as
 * `code_challenge` with `code_challenge_method=S256`.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Opaque value tying an authorize redirect to its callback, defeating CSRF.
 * Also used as the sessionStorage key for the verifier so the callback can
 * recover it after the provider redirects back.
 */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
