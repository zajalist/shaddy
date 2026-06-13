import { useState } from 'react';
import type { ReactNode } from 'react';
import { SHADE, TYPE } from '../tokens';
import { Icon, ShadeLogo } from '../icons';
import { SignInButton } from '@/auth';
import { Starfield } from '../Starfield';
import { useIsMobile } from '../useIsMobile';
import { useNavScroll } from './chrome';
import { REPO_URL, ROUTES } from './constants';

// ─── Topbar — sticky, fades on scroll direction ──────────────────────────
export const LandingNav = () => {
  const { hidden, scrolled } = useNavScroll();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav
      style={{
        position: 'fixed', left: 0, right: 0, top: 0,
        height: 60, zIndex: 100,
        display: 'flex', alignItems: 'center', padding: '0 20px',
        background: scrolled || menuOpen ? 'rgba(11,12,14,0.82)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: scrolled || menuOpen ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: scrolled || menuOpen ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        color: SHADE.topbarText,
        font: `500 12.5px ${TYPE.body}`,
        // The mobile menu drawer hangs below the topbar — it must not be
        // clipped by the topbar's overflow.
        overflow: menuOpen ? 'visible' : 'hidden',
        transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s, backdrop-filter 0.3s, border-color 0.3s',
      }}
    >
      <Starfield opts={{ density: 0.22, leftBias: 1.8 }} />
      <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, textDecoration: 'none', color: 'inherit' }}>
        <ShadeLogo size={22} />
        <span style={{ font: `700 14px ${TYPE.display}`, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Shaddy</span>
      </a>
      {/* Desktop centered nav — hidden on mobile in favour of a hamburger sheet */}
      {!isMobile && (
        <nav
          style={{
            position: 'absolute', left: '50%', top: 0, bottom: 0,
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 4, zIndex: 1,
          }}
        >
          <NavLink href="#how">How it works</NavLink>
          <NavLink href={ROUTES.gallery}>Gallery</NavLink>
          <NavLink href={ROUTES.docs}>Docs</NavLink>
          <NavLink href="#compose">Compose</NavLink>
          <NavLink href="#code">Code</NavLink>
          <NavLink href="#faq">FAQ</NavLink>
        </nav>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, position: 'relative', zIndex: 1 }}>
        {!isMobile && (
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            data-tip="GitHub"
            className="oct-btn icon-tip"
            style={{
              width: 34, height: 34,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: SHADE.topbarText, textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
            }}
          >
            <span className="oct-svg" style={{ display: 'inline-flex' }}>
              <Icon name="github-octocat" size={20} color={SHADE.cream} cream={SHADE.topbar} />
            </span>
          </a>
        )}
        {!isMobile && <SignInButton className="landing-signin" />}
        <a
          href={ROUTES.composer}
          aria-label="Open composer"
          data-tip={isMobile ? undefined : 'Open composer'}
          className="comp-btn icon-tip"
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
            <Icon name="composer-blocks" size={20} color={SHADE.gold} cream={SHADE.cream} />
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
          {[
            { href: '#how', label: 'How it works' },
            { href: ROUTES.gallery, label: 'Gallery' },
            { href: ROUTES.docs, label: 'Docs' },
            { href: '#compose', label: 'Compose' },
            { href: '#code', label: 'Code' },
            { href: '#faq', label: 'FAQ' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
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
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              style={{
                width: 44, height: 44,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: SHADE.topbarText, textDecoration: 'none',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
              }}
            >
              <Icon name="github-octocat" size={20} color={SHADE.cream} cream={SHADE.topbar} />
            </a>
            <SignInButton className="landing-signin" />
          </div>
        </div>
      )}
    </nav>
  );
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
