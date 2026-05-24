// Public entry point for the `@/auth` module.
//
// Consumers (Landing, design TopBar, AuthCallback route) should import
// from `@/auth` — not from deep file paths.

export { AUTH_CONFIG } from './config';
export type { AuthConfig } from './config';

export { useAuth } from './useAuth';
export type { UseAuth } from './useAuth';

export { signIn, signOut, getAccessToken, getUser } from './oidc';
export type { AuthUser, AuthState } from './oidc';

export { AuthCallback } from './AuthCallback';
export { SignInButton } from './SignInButton';
export type { SignInButtonProps } from './SignInButton';
