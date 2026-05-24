// Three-column shell for /docs. Left nav + centre content + right TOC.
// Owns the page-level scroll container; the Sidebar and OnThisPage each
// stick inside this layout. The active page is picked by the URL hash
// (see Docs.tsx for the resolver).
//
// On mobile (<768px) the sidebar collapses behind a hamburger button, the
// right rail hides entirely, and content takes the full viewport width.

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { DOC, TYPE } from './theme';
import { useIsMobile } from '../../useIsMobile';

export type LayoutProps = {
  sidebar: ReactNode;
  content: ReactNode;
  rightRail: ReactNode;
};

export const Layout = ({ sidebar, content, rightRail }: LayoutProps) => {
  const isMobile = useIsMobile();
  const [navOpen, setNavOpen] = useState(false);

  // Close the nav drawer whenever the route hash changes (the user picked a
  // page). Without this the user would have to manually close the drawer
  // after every navigation.
  useEffect(() => {
    if (!isMobile) return;
    const onHash = () => setNavOpen(false);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isMobile]);

  const root: CSSProperties = {
    minHeight: '100vh',
    background: DOC.bg,
    color: DOC.textBody,
    fontFamily: TYPE.body,
    display: 'flex',
    alignItems: 'flex-start',
    flexDirection: isMobile ? 'column' : 'row',
  };
  const centre: CSSProperties = {
    flex: '1 1 auto',
    minWidth: 0,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  };

  if (isMobile) {
    return (
      <div style={root}>
        <MobileTopBar onMenu={() => setNavOpen(true)} />
        <main style={centre}>{content}</main>
        {navOpen && (
          <>
            <div
              onClick={() => setNavOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 90,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(2px)',
              }}
            />
            <div
              style={{
                position: 'fixed', top: 0, bottom: 0, left: 0,
                width: 'min(86vw, 320px)', zIndex: 91,
                boxShadow: '6px 0 24px rgba(0,0,0,0.45)',
              }}
            >
              {sidebar}
            </div>
          </>
        )}
        {/* OnThisPage hidden on mobile — three sticky columns don't fit. */}
        {/* The page body owns its own anchor links inside H2/H3. */}
      </div>
    );
  }

  return (
    <div style={root}>
      {sidebar}
      <main style={centre}>{content}</main>
      {rightRail}
    </div>
  );
};

// Sticky top bar for the mobile docs shell — Shaddy brand + hamburger that
// opens the sidebar drawer. Matches the visual weight of the desktop
// sidebar header so the route still reads as /docs at a glance.
const MobileTopBar = ({ onMenu }: { onMenu: () => void }) => (
  <header
    style={{
      position: 'sticky', top: 0, zIndex: 50,
      width: '100%',
      height: 56,
      flex: '0 0 auto',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 14px',
      background: DOC.surface,
      borderBottom: `1px solid ${DOC.border}`,
    }}
  >
    <button
      type="button"
      onClick={onMenu}
      aria-label="Open docs nav"
      style={{
        width: 44, height: 44, padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: `1px solid ${DOC.border}`,
        borderRadius: 6,
        color: DOC.textPrimary,
        cursor: 'pointer',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
      </svg>
    </button>
    <div style={{
      font: `700 16px ${TYPE.display}`,
      color: DOC.textPrimary,
      letterSpacing: TYPE.trackTight,
      display: 'flex', alignItems: 'baseline', gap: 6,
    }}>
      <span>Shaddy</span>
      <span style={{ color: DOC.accent }}>·</span>
      <span style={{ color: DOC.textSecondary, fontWeight: 500, fontSize: 13 }}>docs</span>
    </div>
  </header>
);
