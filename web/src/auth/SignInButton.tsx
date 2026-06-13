// Tiny sign-in/sign-out control. Drops into the Landing hero, the design
// TopBar, or anywhere else a Login button should live.
//
// Signed out → "Sign in" button.
// Signed in  → avatar + display name, click opens a dropdown with
//              "Sign out".

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAuth } from './useAuth';

export interface SignInButtonProps {
  /**
   * Optional className applied to the root button so consumers can match
   * their own button system. Inline styles are deliberately minimal — the
   * consumer typically wraps this in their own visual treatment.
   */
  className?: string;
}

function displayName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return '';
  return (
    (user.name as string | undefined) ??
    (user.preferred_username as string | undefined) ??
    (user.email as string | undefined) ??
    user.sub
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function SignInButton({ className }: SignInButtonProps): React.ReactElement {
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!isAuthenticated || !user) {
    return (
      <SignedOutPicker
        rootRef={rootRef}
        className={className}
        open={open}
        setOpen={setOpen}
        signIn={signIn}
      />
    );
  }

  const name = displayName(user);
  const picture = user.picture as string | undefined;

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem 0.25rem 0.25rem',
          border: '1px solid #d8cfbf',
          borderRadius: 999,
          background: '#fff',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        {picture ? (
          <img
            src={picture}
            alt=""
            width={28}
            height={28}
            style={{ borderRadius: '50%', display: 'block' }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#2a2620',
              color: '#faf6ef',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {initials(name)}
          </span>
        )}
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 160,
            background: '#fff',
            border: '1px solid #d8cfbf',
            borderRadius: 8,
            boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
            padding: '0.25rem',
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut().catch((err) => {
                console.error('[auth] signOut() failed:', err);
              });
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Signed-out provider picker ────────────────────────────────────────────
// A small flat popover: Google, GitHub, and an email+password mini-form. No
// glow / shadow flourishes beyond the dropdown's subtle elevation. Reuses the
// parent's `open`/`rootRef` so the existing click-outside effect dismisses it.

type SignInFn = ReturnType<typeof useAuth>['signIn'];

function SignedOutPicker({
  rootRef,
  className,
  open,
  setOpen,
  signIn,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  className?: string;
  open: boolean;
  setOpen: (fn: (v: boolean) => boolean) => void;
  signIn: SignInFn;
}): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const oauth = (provider: 'google' | 'github') => {
    setError(null);
    void signIn(provider).catch((err) => {
      console.error('[auth] signIn() failed:', err);
      setError((err as Error).message ?? 'Sign-in could not start.');
    });
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }
    setError(null);
    setBusy(true);
    void signIn('password', { email, password, mode })
      .then(() => setOpen(() => false))
      .catch((err) => setError((err as Error).message ?? 'Sign-in failed.'))
      .finally(() => setBusy(false));
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          padding: '0.5rem 1rem',
          border: '1px solid #2a2620',
          borderRadius: 6,
          background: 'transparent',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        Sign in
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 248,
            background: '#fff',
            border: '1px solid #d8cfbf',
            borderRadius: 8,
            padding: '0.6rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button type="button" onClick={() => oauth('google')} style={providerBtn}>
            Continue with Google
          </button>
          <button type="button" onClick={() => oauth('github')} style={providerBtn}>
            Continue with GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
            <span style={{ flex: 1, height: 1, background: '#e5dccc' }} />
            <span style={{ fontSize: '0.7rem', color: '#9a8f7c' }}>or</span>
            <span style={{ flex: 1, height: 1, background: '#e5dccc' }} />
          </div>

          <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={fieldStyle}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={fieldStyle}
            />
            <button type="submit" disabled={busy} style={{ ...providerBtn, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            }}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#6b6256',
              textAlign: 'center',
              padding: 0,
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>

          {error ? (
            <div style={{ fontSize: '0.72rem', color: '#a02020', lineHeight: 1.4 }}>{error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const providerBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #d8cfbf',
  borderRadius: 6,
  background: '#faf6ef',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  textAlign: 'center',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.6rem',
  border: '1px solid #d8cfbf',
  borderRadius: 6,
  background: '#fff',
  fontSize: '0.8rem',
  boxSizing: 'border-box',
};
