// Feedback bubble + modal. Dropped into the top nav so anyone can send a note
// from anywhere in the app. No backend dependency: submitting composes a
// mailto: to the contact address (works the same in dev and prod). The modal
// also states plainly that Shaddy is brand new and actively maintained.

import { useEffect, useRef, useState } from 'react';
import { SHADE, TYPE } from './tokens';
import { CONTACT_EMAIL } from './pages/legal/LegalLayout';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Lock background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const subject = encodeURIComponent('Shaddy feedback');
    const body = encodeURIComponent(
      `${message.trim()}\n\n— from ${email.trim() || 'an anonymous user'}\n` +
        `page: ${typeof location !== 'undefined' ? location.href : ''}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const anim = prefersReducedMotion() ? 'none' : 'fbPop 0.22s cubic-bezier(0.16,1,0.3,1) both';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Send feedback"
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(8,9,11,0.62)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        animation: prefersReducedMotion() ? 'none' : 'fbFade 0.18s ease-out both',
      }}
    >
      <style>{`
        @keyframes fbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fbPop { from { opacity: 0; transform: translateY(10px) scale(0.98) } to { opacity: 1; transform: none } }
      `}</style>
      <form
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: 'min(440px, 100%)',
          background: SHADE.topbarSurface,
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 12,
          padding: '22px 22px 20px',
          color: SHADE.topbarText,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: anim,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, font: `600 16px ${TYPE.body}`, letterSpacing: '-0.01em' }}>
            Send feedback
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              color: SHADE.topbarText, cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <p style={{ margin: '8px 0 16px', font: `400 12.5px ${TYPE.body}`, lineHeight: 1.55, color: SHADE.topbarDim }}>
          Shaddy is <strong style={{ color: SHADE.cream, fontWeight: 600 }}>brand new (v1.0)</strong> and
          actively maintained — found a bug or have an idea? Tell us and it’ll shape what ships next.
        </p>

        {sent ? (
          <div style={{ font: `400 13px ${TYPE.body}`, lineHeight: 1.6, color: SHADE.topbarText, padding: '10px 0 4px' }}>
            Thanks! Your email client should be opening. If it didn’t, email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: SHADE.gold }}>{CONTACT_EMAIL}</a>.
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button type="button" onClick={onClose} style={primaryBtn}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              ref={taRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What’s working, what’s broken, what you wish it did…"
              rows={4}
              style={fieldStyle}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional, so we can reply)"
              style={{ ...fieldStyle, marginTop: 10 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
              <button type="submit" disabled={!message.trim()} style={{ ...primaryBtn, opacity: message.trim() ? 1 : 0.5 }}>
                Send
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(0,0,0,0.28)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
  color: SHADE.topbarText, font: `400 13px ${TYPE.body}`,
  padding: '10px 12px', resize: 'vertical', outline: 'none',
};

const primaryBtn: React.CSSProperties = {
  background: `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
  border: `1px solid ${SHADE.goldDeep}`, borderRadius: 7,
  color: '#1a1208', font: `600 13px ${TYPE.body}`,
  padding: '8px 16px', cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 7,
  color: SHADE.topbarText, font: `500 13px ${TYPE.body}`,
  padding: '8px 14px', cursor: 'pointer',
};

/** The nav bubble. Opens the feedback modal. */
export const FeedbackButton = ({ compact = false }: { compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Send feedback"
        data-tip={compact ? undefined : 'Send feedback'}
        className="icon-tip tip-right"
        onClick={() => setOpen(true)}
        style={{
          width: compact ? 44 : 34, height: compact ? 44 : 34,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6,
          color: SHADE.topbarText, cursor: 'pointer',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9.6 9.6 0 0 1-4-.9L3 20l1.4-4.5A8.38 8.38 0 0 1 3.5 11 8.5 8.5 0 0 1 12 2.5a8.5 8.5 0 0 1 9 9z" />
        </svg>
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
};
