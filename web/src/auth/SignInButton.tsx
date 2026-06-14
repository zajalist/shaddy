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

  // Inject the dropdown's :placeholder / :hover / :focus styles once — inline
  // styles can't express pseudo-classes.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('shaddy-auth-style')) return;
    const el = document.createElement('style');
    el.id = 'shaddy-auth-style';
    el.textContent = `
      .shaddy-auth-pop input::placeholder { color: #8b8579; }
      .shaddy-auth-pop input:focus { outline: none; border-color: #fcb427; background: rgba(255,255,255,0.08); }
      .shaddy-auth-pop .prov:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.30); }
      .shaddy-auth-pop .gold:hover { filter: brightness(1.07); }
      .shaddy-auth-menu .item:hover { background: rgba(255,255,255,0.08); }
    `;
    document.head.appendChild(el);
  }, []);

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
          className="shaddy-auth-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 168,
            background: '#16181b',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
            padding: '0.3rem',
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="item"
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
              color: '#f1ece1',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.85rem',
              fontWeight: 500,
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
          className="shaddy-auth-pop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 256,
            background: '#16181b',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            padding: '0.7rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <button type="button" className="prov" onClick={() => oauth('google')} style={providerBtn}>
            Continue with Google
          </button>
          <button type="button" className="prov" onClick={() => oauth('github')} style={providerBtn}>
            Continue with GitHub
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            <span style={{ fontSize: '0.7rem', color: '#8b8579' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
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
            <button type="submit" className="gold" disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
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
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#e7b34b',
              textAlign: 'center',
              padding: '2px 0',
            }}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>

          {error ? (
            <div style={{ fontSize: '0.72rem', color: '#ff7a6b', lineHeight: 1.4 }}>{error}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const providerBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  color: '#f1ece1',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
  textAlign: 'center',
  transition: 'background 140ms ease, border-color 140ms ease',
};

const goldBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  border: '1px solid #b97f12',
  borderRadius: 8,
  background: '#fcb427',
  color: '#1a1208',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 700,
  textAlign: 'center',
  transition: 'filter 140ms ease',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.65rem',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.05)',
  color: '#f1ece1',
  fontSize: '0.82rem',
  boxSizing: 'border-box',
  transition: 'border-color 140ms ease, background 140ms ease',
};
