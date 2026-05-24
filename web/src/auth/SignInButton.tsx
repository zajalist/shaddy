// Tiny sign-in/sign-out control. Drops into the Landing hero, the design
// TopBar, or anywhere else a Login button should live.
//
// Signed out → "Sign in" button.
// Signed in  → avatar + display name, click opens a dropdown with
//              "Sign out".

import { useEffect, useRef, useState } from 'react';
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
      <button
        type="button"
        className={className}
        onClick={() => {
          void signIn().catch((err) => {
            console.error('[auth] signIn() failed:', err);
            alert(`Sign-in could not start:\n${(err as Error).message}`);
          });
        }}
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
