import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE, blockById } from './tokens';
import { Icon, ShadeLogo } from './icons';
import { SignInButton } from '@/auth';
import { Starfield } from './Starfield';
import { ShadeCanvas } from './ShadeCanvas';
import { RDHero } from './RDHero';
import { Block } from './Block';
import type { BlockVariant } from './Block';
import { RoamingMascot } from './RoamingMascot';
import { TemplatesShared } from './TemplatesShared';
import type { Template } from './TemplatesShared';
import { FractalEntity } from './FractalEntity';
import { useIsMobile } from './useIsMobile';

// Marketing landing — single-color throughout (no per-section bg shifts), the
// product motto from the repo README, hayba-style fixed left TOC + scroll-
// directional nav fade.

const PAGE_BG = '#0b0c0e';
const KEYFRAMES_ID = 'shade-landing-keyframes';
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';

const useLandingChrome = () => {
  useEffect(() => {
    if (!document.getElementById('shade-design-fonts')) {
      const link = document.createElement('link');
      link.id = 'shade-design-fonts';
      link.rel = 'stylesheet';
      link.href = FONTS_HREF;
      document.head.appendChild(link);
    }
    if (!document.getElementById(KEYFRAMES_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAMES_ID;
      style.textContent = `
        @keyframes shadeEmber {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          8%, 14%  { opacity: 0.42; transform: scale(1); }
          22%      { opacity: 0; transform: scale(1.3); }
        }
        @keyframes shadeSpeck {
          0%   { transform: translate(0, 0);          opacity: 0; }
          10%  { opacity: 0.7; }
          50%  { transform: translate(20px, -50vh);   opacity: 0.7; }
          90%  { opacity: 0.4; }
          100% { transform: translate(-10px, -100vh); opacity: 0; }
        }
        @keyframes shadeFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shaddyDriftA {
          0%   { transform: translate(0, 0)        rotate(0deg);  }
          25%  { transform: translate(14px, -18px) rotate(2.5deg); }
          50%  { transform: translate(22px,  4px)  rotate(-1.5deg); }
          75%  { transform: translate(6px, -10px)  rotate(1.5deg); }
          100% { transform: translate(0, 0)        rotate(0deg);  }
        }
        @keyframes shaddyDriftB {
          0%   { transform: translate(0, 0)         rotate(0deg);  }
          33%  { transform: translate(-18px, -12px) rotate(-2deg); }
          66%  { transform: translate(8px, 14px)    rotate(2deg);  }
          100% { transform: translate(0, 0)         rotate(0deg);  }
        }
        @keyframes shaddyBubbleIn {
          from { opacity: 0; transform: scale(0.86) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        /* Octocat hover — tilt + bob + a tiny blink. Pure CSS, no JS. */
        .oct-btn { transition: background 0.2s, border-color 0.2s; }
        .oct-svg {
          transform-origin: 50% 60%;
          transition: transform 0.35s cubic-bezier(0.2,1.4,0.4,1);
        }
        .oct-btn:hover .oct-svg {
          animation: octBob 0.9s ease-in-out infinite;
        }
        @keyframes octBob {
          0%   { transform: translateY(0)    rotate(-8deg) scale(1.04); }
          25%  { transform: translateY(-1.5px) rotate(6deg)  scale(1.06); }
          50%  { transform: translateY(0)    rotate(-4deg) scale(1.05); }
          75%  { transform: translateY(-1px)  rotate(8deg)  scale(1.06); }
          100% { transform: translateY(0)    rotate(-8deg) scale(1.04); }
        }
        .oct-eye { transform-origin: center; transform-box: fill-box; }
        .oct-btn:hover .oct-eye-l { animation: octBlinkL 1.8s ease-in-out infinite; }
        .oct-btn:hover .oct-eye-r { animation: octBlinkR 1.8s ease-in-out infinite; }
        @keyframes octBlinkL {
          0%, 42%, 50%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.1); }
        }
        @keyframes octBlinkR {
          0%, 46%, 54%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.1); }
        }
        /* Composer icon — a tiny "snap" wiggle on hover */
        .comp-btn .comp-svg {
          transform-origin: 50% 60%;
          transition: transform 0.3s cubic-bezier(0.2,1.4,0.4,1);
        }
        .comp-btn:hover .comp-svg {
          animation: compSnap 0.7s ease-in-out infinite;
        }
        @keyframes compSnap {
          0%, 100% { transform: rotate(0deg)  scale(1); }
          25%      { transform: rotate(-4deg) scale(1.06); }
          50%      { transform: rotate(0deg)  scale(1.08); }
          75%      { transform: rotate(4deg)  scale(1.06); }
        }
        /* Tooltips for the nav icon buttons */
        .icon-tip { position: relative; }
        .icon-tip[data-tip]::after {
          content: attr(data-tip);
          position: absolute; top: calc(100% + 8px); left: 50%;
          transform: translateX(-50%) translateY(-4px);
          background: rgba(11,12,14,0.94);
          color: #FEE7C7;
          font: 600 10px "Geist Mono", ui-monospace, monospace;
          letter-spacing: 0.14em; text-transform: uppercase;
          padding: 5px 9px; border-radius: 3px;
          border: 1px solid rgba(252,180,39,0.35);
          white-space: nowrap;
          opacity: 0; pointer-events: none;
          transition: opacity 0.18s, transform 0.18s;
          z-index: 10;
        }
        .icon-tip[data-tip]:hover::after {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        /* Auth pills — subtle hover lift */
        .auth-pill { transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s; }
        .auth-pill:hover { transform: translateY(-1px); }
      `;
      document.head.appendChild(style);
    }
    const prev = document.body.style.background;
    const prevOverflowX = document.body.style.overflowX;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.background = PAGE_BG;
    // Kill any horizontal overflow on narrow viewports — every wide section
    // already shrinks on mobile, but stray box-shadows / nav widths can still
    // create a tiny horizontal scrollbar that wrecks the mobile feel.
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.background = prev;
      document.body.style.overflowX = prevOverflowX;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
    };
  }, []);
};

// ─── Scroll-direction hook (hide on scroll-down, .scrolled after hero) ───
const useNavScroll = () => {
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

// ─── Topbar — sticky, fades on scroll direction ──────────────────────────
const LandingNav = () => {
  const { hidden, scrolled } = useNavScroll();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 80,
        height: 60, padding: isMobile ? '0 16px' : '0 28px',
        display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 22,
        background: scrolled || menuOpen ? 'rgba(11,12,14,0.78)' : 'transparent',
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
          <NavLink href="#compose">Compose</NavLink>
          <NavLink href="#code">Code</NavLink>
          <NavLink href="#faq">FAQ</NavLink>
        </nav>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10, position: 'relative', zIndex: 1 }}>
        {!isMobile && (
          <a
            href="https://github.com"
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
        {!isMobile && <SignInButton />}
        <a
          href="/design"
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
              href="https://github.com"
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
            <SignInButton />
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

// ─── Section separator — chunky filled diamond between sections ─────────
// Replaces the older gold-circle-on-cream rule that read poorly: stronger
// inkLine rules + a small filled diamond motif with a halo so the eye locks
// on it without the separator getting loud.
const SectionSeparator = () => (
  <div
    aria-hidden
    style={{
      maxWidth: 880, margin: '0 auto',
      padding: '0 2rem',
      display: 'flex', alignItems: 'center', gap: 18,
      opacity: 0.85,
    }}
  >
    <span
      style={{
        flex: 1, height: 1,
        background:
          `linear-gradient(90deg, rgba(252,180,39,0) 0%, ${SHADE.gold} 22%, ${SHADE.goldDeep} 78%, rgba(150,107,23,0) 100%)`,
      }}
    />
    {/* chunky filled-diamond motif with a soft halo so it pops on either bg */}
    <span
      style={{
        position: 'relative',
        width: 18, height: 18,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span
        style={{
          position: 'absolute', inset: -6,
          background: `radial-gradient(circle, ${SHADE.gold}30 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <span
        style={{
          position: 'relative',
          width: 10, height: 10,
          background: SHADE.gold,
          border: `1px solid ${SHADE.goldDeep}`,
          transform: 'rotate(45deg)',
          boxShadow: `0 1px 0 ${SHADE.cream}40 inset, 0 2px 4px rgba(0,0,0,0.45)`,
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute', left: -16, top: '50%',
          width: 3, height: 3, borderRadius: '50%',
          background: SHADE.goldDeep, transform: 'translateY(-50%)',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute', right: -16, top: '50%',
          width: 3, height: 3, borderRadius: '50%',
          background: SHADE.goldDeep, transform: 'translateY(-50%)',
        }}
      />
    </span>
    <span
      style={{
        flex: 1, height: 1,
        background:
          `linear-gradient(90deg, rgba(150,107,23,0) 0%, ${SHADE.goldDeep} 22%, ${SHADE.gold} 78%, rgba(252,180,39,0) 100%)`,
      }}
    />
  </div>
);

// ─── Fixed left page TOC (hayba style) ──────────────────────────────────
type TocItem = { id: string; label: string };
const TOC: TocItem[] = [
  { id: 'top',     label: 'Shaddy' },
  { id: 'how',     label: 'How it works' },
  { id: 'templates', label: 'Templates' },
  { id: 'compose', label: 'Compose' },
  { id: 'code',    label: 'Code' },
  { id: 'stats',   label: 'Built for the web' },
  { id: 'faq',     label: 'FAQ' },
];

const PageTOC = () => {
  const [active, setActive] = useState('top');
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile(1024); // hide below desktop — TOC needs wide gutter space
  useEffect(() => {
    const onScroll = () => {
      const heroH = (document.getElementById('top')?.offsetHeight ?? 600);
      setVisible(window.scrollY > heroH * 0.45);
      const probe = window.scrollY + window.innerHeight * 0.4;
      let cur = TOC[0]!.id;
      for (const t of TOC) {
        const el = document.getElementById(t.id);
        if (el && el.offsetTop <= probe) cur = t.id;
      }
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  if (isMobile) return null;
  return (
    <aside
      aria-label="Page sections"
      style={{
        position: 'fixed',
        left: 36, top: '50%', transform: 'translateY(-50%)',
        zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 14,
        font: `500 12px ${TYPE.body}`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {TOC.map((t) => {
        const isActive = t.id === active;
        const isBrand = t.id === 'top';
        return (
          <a
            key={t.id}
            href={`#${t.id}`}
            style={{
              position: 'relative',
              color: isActive ? SHADE.cream : 'rgba(232,226,212,0.45)',
              textDecoration: 'none',
              padding: `2px 0 2px ${isActive ? 22 : 14}px`,
              transition: 'color 0.2s, padding-left 0.2s',
              lineHeight: 1.3,
              fontWeight: isBrand ? 600 : 500,
              fontSize: isBrand ? 13 : 12,
              marginBottom: isBrand ? 6 : 0,
            }}
          >
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 0, top: '50%',
                width: isActive ? 14 : 6, height: 1,
                background: isActive ? SHADE.gold : 'currentColor',
                transform: 'translateY(-50%)',
                opacity: isActive ? 1 : 0.5,
                transition: 'width 0.25s cubic-bezier(0.16,1,0.3,1), background 0.25s, opacity 0.25s',
              }}
            />
            {t.label}
          </a>
        );
      })}
    </aside>
  );
};

// ─── Hero ────────────────────────────────────────────────────────────────
const Hero = () => (
  <section
    id="top"
    style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 'clamp(5rem, 9vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(4rem, 7vw, 6rem)',
      overflow: 'hidden',
    }}
  >
    {/* live reaction-diffusion field */}
    <div style={{ position: 'absolute', inset: 0, opacity: 0.78 }}>
      <RDHero />
    </div>
    {/* vignette so text reads */}
    <div
      style={{
        position: 'absolute', inset: 0,
        background:
          `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(11,12,14,0.0) 0%, rgba(11,12,14,0.4) 45%, rgba(11,12,14,0.92) 88%)`,
        pointerEvents: 'none',
      }}
    />
    {/* rising specks for life */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${8 + i * 9}%`, bottom: -20,
            width: 2, height: 2, borderRadius: '50%',
            background: 'rgba(252,180,39,0.55)',
            filter: 'blur(0.5px)',
            animation: `shadeSpeck ${26 + (i % 4) * 3}s linear ${-i * 2.4}s infinite`,
          }}
        />
      ))}
    </div>

    <div style={{ position: 'relative', zIndex: 1, animation: 'shadeFadeUp 1s ease-out 0.1s both' }}>
      <div
        style={{
          display: 'inline-block',
          font: `700 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: SHADE.gold, marginBottom: 28,
        }}
      >
        A shader instrument for the browser
      </div>
      <h1
        style={{
          margin: 0,
          font: `600 clamp(2.4rem, 5.4vw, 4.6rem) ${TYPE.display}`,
          color: SHADE.cream,
          letterSpacing: TYPE.trackTighter,
          lineHeight: 1.02,
          textShadow: '0 2px 24px rgba(0,0,0,0.55)',
          maxWidth: 900,
        }}
      >
        Will the real slim shader<br />
        please stand up?
      </h1>
      <p
        style={{
          margin: '24px auto 0',
          maxWidth: 600,
          font: `400 17px ${TYPE.body}`,
          color: 'rgba(232,226,212,0.72)',
          lineHeight: 1.55,
        }}
      >
        Shade is a learning environment for shader art. The canvas and the code are the same
        surface — drag the canvas to edit the GLSL, edit the GLSL to move the canvas. Twelve
        starter templates, twelve ways to play with the math live. One responsive app for phone
        and desktop.
      </p>
      <div style={{ marginTop: 36, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="/design"
          style={{
            background: SHADE.gold, color: '#1a1208',
            border: `1px solid ${SHADE.goldDeep}`,
            borderRadius: 3, padding: '12px 22px',
            font: `700 12px ${TYPE.body}`,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10,
          }}
        >
          Open the composer
          <span style={{ fontWeight: 400 }}>→</span>
        </a>
        <a
          href="#how"
          style={{
            background: 'transparent', color: SHADE.cream,
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 3, padding: '12px 22px',
            font: `500 12px ${TYPE.body}`,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          How it works
        </a>
      </div>
    </div>

    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 36,
        textAlign: 'center', zIndex: 2,
        animation: 'shadeFadeUp 1.2s ease-out 1.4s both',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          font: `700 10px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(232,226,212,0.45)', marginBottom: 10,
          paddingLeft: '0.22em',
        }}
      >
        Shade 0.4.2
      </div>
      <div
        style={{
          font: `500 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.45em', textTransform: 'uppercase',
          color: 'rgba(232,226,212,0.45)',
          paddingLeft: '0.45em',
        }}
      >
        Live · Browser · Open Source
      </div>
    </div>
  </section>
);

// ─── Feature row (text + visual) ────────────────────────────────────────
const FeatureRow = ({
  eyebrow, title, body, visual, reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
}) => {
  const isMobile = useIsMobile();
  return (
  <div
    style={{
      maxWidth: 1180, margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 1fr) minmax(280px, 1.2fr)',
      gap: isMobile ? 28 : 56,
      alignItems: 'center',
      padding: isMobile ? '0 1.25rem' : '0 2rem',
    }}
  >
    <div style={{ order: isMobile ? 1 : (reverse ? 2 : 1) }}>
      <div style={{ font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: SHADE.gold, marginBottom: 16 }}>
        {eyebrow}
      </div>
      <h2
        style={{
          margin: 0,
          font: `600 clamp(1.9rem, 3.4vw, 2.6rem) ${TYPE.display}`,
          color: SHADE.cream,
          letterSpacing: TYPE.trackTighter,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      <div style={{ marginTop: 20, color: 'rgba(232,226,212,0.62)', font: `400 15px ${TYPE.body}`, lineHeight: 1.65 }}>
        {body}
      </div>
    </div>
    <div style={{ order: isMobile ? 2 : (reverse ? 1 : 2), position: 'relative' }}>
      {visual}
    </div>
  </div>
  );
};

const SectionShell = ({
  id, eyebrow, title, subtitle, children,
}: { id?: string; eyebrow: string; title: ReactNode; subtitle?: string; children?: ReactNode }) => (
  <section id={id} style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(3.5rem, 7vw, 6rem)' }}>
    <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
      <div
        style={{
          font: `700 11px ${TYPE.bodyMono}`,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: SHADE.gold, marginBottom: 16,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          margin: 0,
          font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
          color: SHADE.cream, letterSpacing: TYPE.trackTighter,
          lineHeight: 1.12,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: '20px auto 0', maxWidth: 580,
            font: `400 15.5px ${TYPE.body}`,
            color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </section>
);

// Section visuals
const FeatureChain = () => {
  const items = [blockById('circle')!, blockById('ripple')!];
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 3, padding: '40px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: `
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.4))' }}>
        {items.map((b, i) => {
          const variant: BlockVariant = {
            left: i === 0 ? 'flat' : 'notch',
            right: i === items.length - 1 ? 'flat' : 'tab',
          };
          return (
            <Block
              key={i}
              id={`f-chain-${i}`}
              block={b}
              variant={variant}
              animated={b.id === 'ripple'}
            />
          );
        })}
      </div>
    </div>
  );
};

const FeatureSliders = () => (
  <div
    style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 3, padding: 28,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}
  >
    {[
      { label: 'Frequency', value: 0.482, animated: true,  v: '0.482' },
      { label: 'Amplitude', value: 0.165, animated: false, v: '0.165' },
      { label: 'Phase',     value: 0.0,   animated: false, v: '0.000 π' },
    ].map((row, i) => (
      <div key={i}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <span style={{ font: `700 10.5px ${TYPE.body}`, color: 'rgba(232,226,212,0.62)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {row.label}
            {row.animated && (
              <span style={{ marginLeft: 8, color: SHADE.gold, font: `500 9.5px ${TYPE.bodyMono}`, letterSpacing: '0.22em' }}>
                ANIM
              </span>
            )}
          </span>
          <span style={{ font: `500 12px ${TYPE.bodyMono}`, color: row.animated ? SHADE.gold : SHADE.cream }}>
            {row.v}
          </span>
        </div>
        <div style={{ position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 6, height: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 1 }} />
          {[0.25, 0.5, 0.75].map((p) => (
            <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${p * 100}% - 0.5px)`, width: 1, background: 'rgba(255,255,255,0.08)' }} />
          ))}
          <div
            style={{
              position: 'absolute', left: 0, top: 6, height: 6, width: `${row.value * 100}%`,
              background: row.animated
                ? `repeating-linear-gradient(45deg, ${SHADE.gold} 0 5px, ${SHADE.goldDeep} 5px 10px)`
                : 'rgba(232,226,212,0.55)',
              borderTopLeftRadius: 1, borderBottomLeftRadius: 1,
            }}
          />
          <div
            style={{
              position: 'absolute', left: `calc(${row.value * 100}% - 8px)`, top: 1,
              width: 16, height: 16,
              background: '#15171b', border: `1.5px solid ${row.animated ? SHADE.gold : 'rgba(232,226,212,0.5)'}`,
              borderRadius: 3,
            }}
          >
            <span style={{ position: 'absolute', left: 3, right: 3, top: 4, height: 1, background: 'rgba(232,226,212,0.5)' }} />
            <span style={{ position: 'absolute', left: 3, right: 3, top: 7, height: 1, background: 'rgba(232,226,212,0.5)' }} />
            <span style={{ position: 'absolute', left: 3, right: 3, top: 10, height: 1, background: 'rgba(232,226,212,0.5)' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const FeatureCanvas = () => (
  <div
    style={{
      borderRadius: 3, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      aspectRatio: '1 / 1', maxWidth: 460, marginInline: 'auto',
      background: '#000', position: 'relative',
    }}
  >
    <ShadeCanvas variant="ripple" />
  </div>
);

// ─── Composer showcase (inline mock of the editor) ───────────────────────
const ComposerShowcase = () => {
  const chain = [blockById('circle')!, blockById('ripple')!, blockById('palette')!];
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        maxWidth: 1180, margin: '4rem auto 0',
        marginInline: isMobile ? '1rem' : 'auto',
        background: SHADE.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: 44, padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          background: SHADE.topbar, color: SHADE.topbarText,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <Starfield opts={{ density: 0.18, leftBias: 1.6 }} />
        <ShadeLogo size={18} />
        <span style={{ font: `700 12px ${TYPE.display}`, letterSpacing: '0.16em', position: 'relative', zIndex: 1 }}>SHADDY</span>
        <span style={{ font: `500 11px ${TYPE.bodyMono}`, color: SHADE.topbarText, letterSpacing: '0.08em', position: 'relative', zIndex: 1 }}>120 BPM</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '200px 1fr 240px',
        minHeight: isMobile ? 'auto' : 380,
      }}>
        {!isMobile && (
        <div style={{ background: SHADE.bg, borderRight: `1px solid ${SHADE.border}`, padding: 14 }}>
          <CategoryHeader color={SHADE.catShape}   label="Shapes" />
          <CategoryHeader color={SHADE.catDistort} label="Distort" />
          <CategoryHeader color={SHADE.catColor}   label="Colors" />
          <CategoryHeader color={SHADE.catEffect}  label="Effects" />
        </div>
        )}
        <div
          style={{
            background: SHADE.bg, position: 'relative',
            padding: isMobile ? '20px 14px' : '30px 24px',
            backgroundImage: `
              linear-gradient(${SHADE.border} 1px, transparent 1px),
              linear-gradient(90deg, ${SHADE.border} 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
            {chain.map((b, i) => {
              const variant: BlockVariant = {
                left: i === 0 ? 'flat' : 'notch',
                right: i === chain.length - 1 ? 'flat' : 'tab',
              };
              return (
                <Block
                  key={i}
                  id={`comp-${i}`}
                  block={b}
                  variant={variant}
                  animated={b.id === 'ripple'}
                  selected={i === 1}
                />
              );
            })}
          </div>
        </div>
        <div style={{ background: SHADE.surface2, borderLeft: `1px solid ${SHADE.border}` }}>
          <div
            style={{
              margin: 14, borderRadius: 3, overflow: 'hidden',
              border: `1px solid ${SHADE.inkLine}`,
              aspectRatio: '1 / 1', background: '#000',
            }}
          >
            <ShadeCanvas variant="ripple" />
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <div style={{ font: `700 10px ${TYPE.body}`, color: SHADE.textDim, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
              Properties
            </div>
            <div style={{ font: `400 12px ${TYPE.body}`, color: SHADE.textDim, lineHeight: 1.5 }}>
              Ripple · 4 params · 1 animating
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoryHeader = ({ color, label }: { color: string; label: string }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 9,
      margin: '0 0 8px',
      padding: '6px 10px',
      background: `${color}12`, border: `1px solid ${color}38`,
      borderRadius: 3,
      font: `700 10.5px ${TYPE.body}`, color, letterSpacing: '0.12em', textTransform: 'uppercase',
    }}
  >
    <span style={{ width: 16, height: 16, borderRadius: 2, background: color }} />
    {label}
  </div>
);

// ─── Code panel ─────────────────────────────────────────────────────────
const CodePanel = () => (
  <div
    style={{
      maxWidth: 920, margin: '4rem auto 0',
      background: SHADE.surface4,
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 3,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.18)',
      }}
    >
      <Icon name="code" size={14} color={SHADE.gold} cream={SHADE.cream} />
      <span style={{ font: `700 11px ${TYPE.body}`, color: SHADE.cream, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        Generated GLSL
      </span>
      <span style={{ marginLeft: 'auto', font: `500 10.5px ${TYPE.bodyMono}`, color: 'rgba(254,231,199,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        128 lines · auto-compile
      </span>
    </div>
    <pre
      style={{
        margin: 0, padding: '18px 20px',
        font: `500 13px ${TYPE.bodyMono}`,
        color: SHADE.cream, lineHeight: 1.7,
        whiteSpace: 'pre', overflowX: 'auto',
      }}
    >
<span style={{ color: 'rgba(254,231,199,0.4)' }}>{'#version 100\n'}</span>
<span style={{ color: SHADE.catDistort }}>precision</span> <span style={{ color: SHADE.catDistort }}>highp</span> <span style={{ color: SHADE.catShape }}>float</span>;{'\n'}
<span style={{ color: SHADE.catDistort }}>uniform</span> <span style={{ color: SHADE.catShape }}>vec2</span>  uResolution;{'\n'}
<span style={{ color: SHADE.catDistort }}>uniform</span> <span style={{ color: SHADE.catShape }}>float</span> uTime;{'\n'}
{'\n'}
<span style={{ color: 'rgba(254,231,199,0.4)' }}>{'// Block 02 — RIPPLE (animating: frequency)\n'}</span>
<span style={{ color: SHADE.catShape }}>vec2</span> <span style={{ color: SHADE.catColor }}>ripple</span>(<span style={{ color: SHADE.catShape }}>vec2</span> p) {'{'}{'\n'}
{'  '}<span style={{ color: SHADE.catShape }}>float</span> f = <span style={{ color: SHADE.gold }}>0.482</span> + <span style={{ color: SHADE.gold }}>0.30</span>*<span style={{ color: SHADE.catColor }}>sin</span>(uTime);{'\n'}
{'  '}<span style={{ color: SHADE.catShape }}>float</span> a = <span style={{ color: SHADE.cream }}>0.165</span>;{'\n'}
{'  '}<span style={{ color: SHADE.catDistort }}>return</span> p + a*<span style={{ color: SHADE.catColor }}>sin</span>(<span style={{ color: SHADE.catColor }}>length</span>(p)*f - uTime*<span style={{ color: SHADE.gold }}>1.7</span>) * <span style={{ color: SHADE.catColor }}>normalize</span>(p);{'\n'}
{'}'}
    </pre>
  </div>
);

// ─── Templates preview grid (12 starter templates teaser) ───────────────
const TEMPLATES: Template[] = [
  { name: 'Plasma',   hint: 'sin · cos · sum',  variant: 'plasma' },
  { name: 'Ripples',  hint: 'sin · length',     variant: 'ripples' },
  { name: 'Voronoi',  hint: 'distance · cell',  variant: 'voronoi' },
  { name: 'Caustics', hint: 'ray · refract',    variant: 'caustics' },
  { name: 'Stripes',  hint: 'mod · gradient',   variant: 'stripes' },
  { name: 'Kaleido',  hint: 'atan · mirror',    variant: 'kaleido' },
  { name: 'Warp',     hint: 'noise · displace', variant: 'warp' },
  { name: 'Glow',     hint: 'pow · radial',     variant: 'glow' },
  { name: 'Bloom',    hint: 'threshold · blur', variant: 'bloom' },
  { name: 'Feedback', hint: 'sample · decay',   variant: 'feedback' },
  { name: 'Reaction', hint: 'turing · anti-d',  variant: 'reaction' },
  { name: 'Tunnel',   hint: 'march · rotate',   variant: 'tunnel' },
];

const TemplatesGrid = () => <TemplatesShared templates={TEMPLATES} />;

// ─── Stats strip ────────────────────────────────────────────────────────
const StatsStrip = () => (
  <div
    style={{
      maxWidth: 1100, margin: '4rem auto 0', padding: '0 2rem',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 24,
    }}
  >
    {[
      { big: '12',     label: 'Starter templates' },
      { big: '0 kb',   label: 'Runtime install size' },
      { big: '60 fps', label: 'On any phone made after 2020' },
      { big: 'MIT',    label: 'License · forever free' },
    ].map((s) => (
      <div
        key={s.label}
        style={{
          borderTop: '1px solid rgba(255,255,255,0.10)',
          padding: '24px 0 0',
        }}
      >
        <div
          style={{
            font: `600 clamp(2.2rem, 4vw, 3.4rem) ${TYPE.display}`,
            letterSpacing: TYPE.trackTighter,
            color: SHADE.cream, lineHeight: 1,
          }}
        >
          {s.big}
        </div>
        <div
          style={{
            marginTop: 12,
            font: `500 11.5px ${TYPE.bodyMono}`,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(232,226,212,0.55)',
          }}
        >
          {s.label}
        </div>
      </div>
    ))}
  </div>
);

// ─── FAQ ────────────────────────────────────────────────────────────────
const FAQ = () => {
  const items = [
    { q: 'Is the output real GLSL?', a: 'Yes. It is GLSL 1.0 fragment shader source. Paste it into Shadertoy, Bonzomatic, or your own WebGL pipeline — it just runs.' },
    { q: 'Do I need to know shader math?', a: 'No. Snap blocks to make something you like, then read the code if you want to learn how it works. The blocks teach the math by reading both surfaces side-by-side.' },
    { q: 'Does it run on mobile?', a: 'Yes. The composer is fully responsive: palette and properties become bottom sheets, the canvas stays the hero.' },
    { q: 'Can I import existing shaders?', a: 'The AI import path runs paste-in GLSL through Claude to extract recognizable blocks. It won’t roundtrip arbitrary shaders perfectly — but you get a starting chain.' },
    { q: 'Is the code open source?', a: 'Yes. MIT-licensed on GitHub. The renderer, block library, and the AI-import bridge are all in one repo.' },
  ];
  return (
    <div style={{ maxWidth: 720, margin: '3rem auto 0', display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <details
          key={i}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '20px 0',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              font: `600 17px ${TYPE.display}`,
              color: SHADE.cream,
              letterSpacing: TYPE.trackTight,
              listStyle: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              outline: 'none',
            }}
          >
            {item.q}
            <span style={{ font: `500 14px ${TYPE.bodyMono}`, color: SHADE.gold }}>+</span>
          </summary>
          <p
            style={{
              margin: '14px 0 0',
              font: `400 14.5px ${TYPE.body}`,
              color: 'rgba(232,226,212,0.65)', lineHeight: 1.65,
            }}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
};

// ─── Footer (hayba-style, starfield bg, 4 columns + brand row) ──────────
const Footer = () => (
  <footer
    style={{
      position: 'relative', overflow: 'hidden',
      padding: '5rem 2rem 2.5rem',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      color: 'rgba(232,226,212,0.55)',
    }}
  >
    <Starfield opts={{ density: 0.18, maxR: 0.6, maxBase: 0.28, sparkMinMs: 6000, sparkMaxMs: 14000 }} />
    <div
      style={{
        maxWidth: 1180, margin: '0 auto', position: 'relative',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 32,
      }}
    >
      <FooterCol title="Product">
        <FooterLink>Composer</FooterLink>
        <FooterLink>Gallery</FooterLink>
        <FooterLink>Blocks</FooterLink>
      </FooterCol>
      <FooterCol title="Learn">
        <FooterLink>Docs</FooterLink>
        <FooterLink>Tutorials</FooterLink>
        <FooterLink>Shader basics</FooterLink>
      </FooterCol>
      <FooterCol title="Open source">
        <FooterLink>GitHub</FooterLink>
        <FooterLink>Issues</FooterLink>
        <FooterLink>License</FooterLink>
      </FooterCol>
      <FooterCol title="About">
        <FooterLink>Team</FooterLink>
        <FooterLink>Brand</FooterLink>
        <FooterLink>Contact</FooterLink>
      </FooterCol>
    </div>
    <div
      style={{
        maxWidth: 1180, margin: '3rem auto 0', position: 'relative',
        paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}
    >
      <ShadeLogo size={20} />
      <span style={{ font: `700 12px ${TYPE.display}`, letterSpacing: '0.16em', textTransform: 'uppercase', color: SHADE.topbarText }}>
        Shaddy
      </span>
      <span style={{ font: `400 12px ${TYPE.body}`, color: 'rgba(232,226,212,0.45)' }}>
        © 2026 · MIT licensed · A learning environment for shader art.
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 14 }}>
        <FooterLink>Privacy</FooterLink>
        <FooterLink>Terms</FooterLink>
      </span>
    </div>
  </footer>
);

const FooterCol = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <h4 style={{ margin: 0, font: `700 10.5px ${TYPE.body}`, color: SHADE.topbarText, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
      {title}
    </h4>
    {children}
  </div>
);

const FooterLink = ({ children }: { children: ReactNode }) => (
  <a
    href="#"
    style={{
      color: 'rgba(232,226,212,0.55)',
      textDecoration: 'none',
      font: `400 13px ${TYPE.body}`,
      letterSpacing: '0.01em',
    }}
  >
    {children}
  </a>
);

// ─── Landing root ───────────────────────────────────────────────────────
export const Landing = () => {
  useLandingChrome();
  const mainRef = useRef<HTMLDivElement>(null);

  const wrap: CSSProperties = {
    background: PAGE_BG, minHeight: '100vh',
    color: SHADE.cream,
    font: `400 14px ${TYPE.body}`,
    position: 'relative', // anchor for the document-space RoamingMascot
  };
  return (
    <div ref={mainRef} style={wrap}>
      <LandingNav />
      <PageTOC />
      <Hero />
      <RoamingMascot />
      <SectionShell
        id="how"
        eyebrow="How it works"
        title={<>Three moves.<br />That&apos;s the whole thing.</>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 100, marginTop: 80 }}>
          <FeatureRow
            eyebrow="01 · Compose"
            title={<>Snap blocks<br />into a chain.</>}
            body={
              <>
                Drag a shape, then snap on distortions, colors, and effects. Connectors auto-resolve —
                you can&apos;t make an invalid chain. The block face shows the one parameter you&apos;ll
                touch most. Double-click to expand the rest.
              </>
            }
            visual={<FeatureChain />}
          />
          <FeatureRow
            eyebrow="02 · Tune"
            title={<>Move a slider.<br />Hear the canvas change.</>}
            body={
              <>
                Every parameter is a slider with an Animate toggle. Animated params loop in real time
                synced to the global tempo, so the canvas breathes even when nothing is selected.
              </>
            }
            visual={<FeatureSliders />}
            reverse
          />
          <FeatureRow
            eyebrow="03 · Export"
            title={<>Real WebGL.<br />Plain GLSL out.</>}
            body={
              <>
                Open the code drawer to see the generated GLSL or paste your own to extract blocks
                back. It&apos;s GLSL 1.0 fragment source — paste it into Shadertoy or your own pipeline
                and it just runs.
              </>
            }
            visual={<FeatureCanvas />}
          />
        </div>
      </SectionShell>

      <SectionSeparator />

      <section id="templates" style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) clamp(3.5rem, 7vw, 6rem)', position: 'relative' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ font: `700 11px ${TYPE.bodyMono}`, letterSpacing: '0.22em', textTransform: 'uppercase', color: SHADE.gold, marginBottom: 16 }}>
            12 starter templates
          </div>
          <h2
            style={{
              margin: 0,
              font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
              color: SHADE.cream, letterSpacing: TYPE.trackTighter, lineHeight: 1.12,
            }}
          >
            Twelve doors.<br />Each one a different math.
          </h2>
          <p
            style={{
              margin: '20px auto 0', maxWidth: 580,
              font: `400 15.5px ${TYPE.body}`,
              color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
            }}
          >
            Pick a template, peek at the GLSL, drag a slider, watch the math wake up.
            Every template is annotated so you learn the trick as you go.
          </p>
        </div>
        <TemplatesGrid />
      </section>

      <SectionSeparator />

      <SectionShell
        id="compose"
        eyebrow="The composer"
        title={<>Like Ableton<br />for fragment shaders.</>}
        subtitle="Live preview top-right, chunky puzzle blocks center, properties panel on the right. Double-click any block to expand all its parameters."
      >
        <ComposerShowcase />
      </SectionShell>

      <SectionSeparator />

      <SectionShell
        id="code"
        eyebrow="GLSL underneath"
        title={<>The code and<br />the canvas are<br />the same surface.</>}
        subtitle="Drag the canvas to edit the GLSL. Edit the GLSL to move the canvas. No black boxes between you and the shader."
      >
        <CodePanel />
      </SectionShell>

      <SectionSeparator />

      <section id="stats" style={{ padding: 'clamp(4rem, 8vw, 7rem) clamp(1.25rem, 4vw, 2rem) 6rem', position: 'relative' }}>
        <div
          style={{
            maxWidth: 1180, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 48,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                font: `700 11px ${TYPE.bodyMono}`,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                color: SHADE.gold, marginBottom: 16,
              }}
            >
              Built for the web
            </div>
            <h2
              style={{
                margin: 0,
                font: `600 clamp(1.9rem, 3.6vw, 2.9rem) ${TYPE.display}`,
                color: SHADE.cream, letterSpacing: TYPE.trackTighter,
                lineHeight: 1.1,
              }}
            >
              Tiny. Fast.<br />Open from the start.
            </h2>
            <p
              style={{
                margin: '20px 0 0', maxWidth: 480,
                font: `400 15.5px ${TYPE.body}`,
                color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
              }}
            >
              No backend, no install, no account. Everything runs in the browser tab you
              already have open. A live ray-marched fractal pulses on the right — that's
              real GLSL too, breathing on your GPU at 60 fps.
            </p>
            <div style={{ marginTop: 36 }}>
              <StatsStrip />
            </div>
          </div>
          {/* Transparent fractal — no card, no border. Sits on the page bg directly.
              Using padding-bottom:100% instead of aspect-ratio:1/1 because some
              browsers don't commit aspect-ratio-derived heights until a layout
              event, which made the fractal only appear after a window resize. */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 520,
              paddingBottom: 'min(100%, 520px)',
              height: 0,
              justifySelf: 'end',
            }}
          >
            <FractalEntity />
            <div
              style={{
                position: 'absolute', left: 4, top: 0,
                font: `700 9.5px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.55)',
                letterSpacing: '0.22em', textTransform: 'uppercase',
                mixBlendMode: 'difference',
                pointerEvents: 'none',
              }}
            >
              // raymarched_fractal · pulse
            </div>
            <div
              style={{
                position: 'absolute', right: 4, bottom: 0,
                font: `500 10px ${TYPE.bodyMono}`,
                color: 'rgba(254,231,199,0.45)',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                pointerEvents: 'none',
              }}
            >
              live · GLSL · 60 fps
            </div>
          </div>
        </div>
      </section>

      <SectionSeparator />

      <SectionShell
        id="faq"
        eyebrow="FAQ"
        title="Specific worries."
      >
        <FAQ />
      </SectionShell>

      <section style={{ padding: '6rem 2rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <h2
            style={{
              margin: 0,
              font: `600 clamp(2rem, 4vw, 3rem) ${TYPE.display}`,
              color: SHADE.cream,
              letterSpacing: TYPE.trackTighter,
              lineHeight: 1.1,
            }}
          >
            Drop a block.<br />Move a slider. Done.
          </h2>
          <div style={{ marginTop: 28 }}>
            <a
              href="/design"
              style={{
                background: SHADE.gold, color: '#1a1208',
                border: `1px solid ${SHADE.goldDeep}`,
                borderRadius: 3, padding: '14px 26px',
                font: `700 12px ${TYPE.body}`,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
            >
              Open the composer
              <span style={{ fontWeight: 400 }}>→</span>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
