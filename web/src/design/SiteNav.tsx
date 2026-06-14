// Shared marketing top-nav + scroll-to-top control. Extracted from Landing so
// every long marketing/reference page (Landing, Library, …) shows the SAME
// navbar. On the landing page the section links are in-page anchors (#how);
// on other pages they point back to the landing section (/#how) and the logo
// returns home.

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SHADE, TYPE } from './tokens';
import { Starfield } from './Starfield';
import { SignInButton } from '@/auth';
import { useIsMobile } from './useIsMobile';

/** Fade + hide-on-scroll-down state, driven by window scroll. */
export const useNavScroll = () => {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY && y > 100);
      setScrolled(y > 80);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return { hidden, scrolled };
};

const NavLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    style={{
      position: 'relative',
      color: 'rgba(232,226,212,0.7)', textDecoration: 'none',
      font: `500 12.5px ${TYPE.body}`, padding: '20px 14px',
      letterSpacing: '0.01em',
    }}
  >
    {children}
  </a>
);

const SECTIONS = [
  { id: 'how', label: 'How it works' },
  { id: 'compose', label: 'Compose' },
  { id: 'code', label: 'Code' },
  { id: 'faq', label: 'FAQ' },
];

export const SiteNav = ({ inPage = false, solid = false }: { inPage?: boolean; solid?: boolean }) => {
  const { hidden, scrolled } = useNavScroll();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  // In-page anchors on the landing route; absolute (return-home) links elsewhere.
  const sect = (id: string) => (inPage ? `#${id}` : `/#${id}`);
  const home = inPage ? '#top' : '/';
  // `solid` forces the dark bar even at the top — needed on light-background
  // pages (e.g. the cream Library) where the transparent nav text wouldn't read.
  const showBg = solid || scrolled || menuOpen;
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        height: 60, padding: isMobile ? '0 16px' : '0 28px',
        display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 22,
        background: showBg ? 'rgba(11,12,14,0.78)' : 'transparent',
        backdropFilter: showBg ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: showBg ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: showBg ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        color: SHADE.topbarText,
        font: `500 12.5px ${TYPE.body}`,
        overflow: 'visible',
        transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
      }}
    >
      <span aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Starfield opts={{ density: 0.22, leftBias: 1.8 }} />
      </span>
      {isMobile && (
        <a href={home} aria-label="Shaddy home" style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1, textDecoration: 'none' }}>
          <img src="/mascot.svg" alt="Shaddy" style={{ height: 28, width: 'auto', display: 'block' }} />
        </a>
      )}
      {!isMobile && (
        <div
          style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 22, zIndex: 1,
          }}
        >
          <a href={home} aria-label="Shaddy home" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', marginRight: 4 }}>
            <img src="/mascot.svg" alt="Shaddy" style={{ height: 30, width: 'auto', display: 'block' }} />
          </a>
          {SECTIONS.map((s) => <NavLink key={s.id} href={sect(s.id)}>{s.label}</NavLink>)}
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, position: 'relative', zIndex: 1 }}>
        {!isMobile && <SignInButton />}
        <a
          href="/design"
          aria-label="Open composer"
          data-tip={isMobile ? undefined : 'Open composer'}
          className="comp-btn icon-tip tip-right"
          style={{
            width: isMobile ? 44 : 34, height: isMobile ? 44 : 34,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(180deg, ${SHADE.gold} 0%, ${SHADE.goldDeep} 100%)`,
            border: `1px solid ${SHADE.goldDeep}`, borderRadius: 6,
            textDecoration: 'none',
            boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 6px rgba(0,0,0,0.35)',
          }}
        >
          <span className="comp-svg" style={{ display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1208" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />
              <path d="M14 4h6v6" />
              <path d="M20 4l-9 9" />
            </svg>
          </span>
        </a>
        {isMobile && (
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((x) => !x)}
            style={{
              width: 44, height: 44, padding: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6,
              color: SHADE.topbarText,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? <path d="M6 6l12 12 M6 18L18 6" /> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        )}
      </div>
      {isMobile && menuOpen && (
        <div
          style={{
            position: 'fixed', left: 0, right: 0, top: 60,
            background: 'rgba(11,12,14,0.96)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px 18px',
            display: 'flex', flexDirection: 'column', gap: 4,
            zIndex: 1,
          }}
        >
          {SECTIONS.map((item) => (
            <a
              key={item.id}
              href={sect(item.id)}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center',
                minHeight: 48, padding: '0 8px',
                color: SHADE.cream, textDecoration: 'none',
                font: `500 16px ${TYPE.body}`,
                letterSpacing: '0.01em',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <SignInButton />
          </div>
        </div>
      )}
    </nav>
  );
};

// ─── Scroll-to-top — appears after a long scroll, returns to the top ───────
export const ScrollToTop = ({ showAfter = 600 }: { showAfter?: number }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', right: 22, bottom: 22, zIndex: 90,
        width: 44, height: 44, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(20,21,24,0.86)',
        color: SHADE.cream,
        border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
};
