// Route component mounted at `/auth/callback`.
//
// Reads ?code + ?state from the URL, exchanges them for a token bundle,
// then navigates the user back to wherever they were before sign-in (saved
// in sessionStorage by signIn()).
//
// Renders a minimal status block — the redirect is usually near-instant,
// but a slow token endpoint or a CORS failure should surface clearly.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback } from './oidc';

type Status =
  | { kind: 'pending' }
  | { kind: 'error'; message: string };

export function AuthCallback(): React.ReactElement {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: 'pending' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { returnTo } = await handleCallback();
        if (cancelled) return;
        navigate(returnTo, { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error('[auth] Callback failed:', err);
        setStatus({ kind: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#faf6ef',
        color: '#2a2620',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        {status.kind === 'pending' ? (
          <>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Finishing sign-in…
            </h1>
            <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
              Exchanging authorization code for tokens.
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: '1.25rem',
                marginBottom: '0.75rem',
                color: '#a02020',
              }}
            >
              Sign-in failed
            </h1>
            <pre
              style={{
                background: '#fff',
                border: '1px solid #e5dccc',
                borderRadius: 8,
                padding: '0.75rem',
                fontSize: '0.75rem',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {status.message}
            </pre>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                border: '1px solid #2a2620',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Back to home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
