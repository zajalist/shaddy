import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { SHADE, TYPE, blockById } from './tokens';
import { Icon, ShadeLogo } from './icons';
import { SiteNav, ScrollToTop } from './SiteNav';
import { Starfield } from './Starfield';
import { ShadeCanvas } from './ShadeCanvas';
import { HeroPortal } from './HeroPortal';
import { Block } from './Block';
import type { BlockVariant } from './Block';
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
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@300;400;500;600;700&display=swap';

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
        @keyframes shadeFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shadeBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes shadeLineIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shadeDotPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.3); }
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
        /* Edge buttons: right-anchor the tip so it isn't clipped off-screen
           (body has overflow-x: hidden). */
        .icon-tip.tip-right[data-tip]::after {
          left: auto; right: 0;
          transform: translateX(0) translateY(-4px);
        }
        .icon-tip.tip-right[data-tip]:hover::after {
          transform: translateX(0) translateY(0);
        }
        /* Auth pills — subtle hover lift */
        .auth-pill { transition: background 0.18s, color 0.18s, border-color 0.18s, transform 0.18s; }
        .auth-pill:hover { transform: translateY(-1px); }
        /* Page TOC — Gaea-style sentence-case links with a playful hover nudge */
        .toc-link { transition: color 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1); }
        .toc-link:hover { color: rgba(254,231,199,0.9) !important; transform: translateX(4px); }
        .toc-link:hover .toc-dot { transform: translateY(-50%) scale(1); opacity: 0.7; }
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

// ─── Section separator — chunky filled diamond between sections ─────────
// Replaces the older gold-circle-on-cream rule that read poorly: stronger
// inkLine rules + a small filled diamond motif with a halo so the eye locks
// on it without the separator getting loud.
// ─── Fixed left page TOC (hayba style) ──────────────────────────────────
type TocItem = { id: string; label: string };
const TOC: TocItem[] = [
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
        left: 40, top: '50%', transform: 'translateY(-50%)',
        zIndex: 60,
        display: 'flex', flexDirection: 'column', gap: 18,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* quiet vertical guide line the active bar rides along */}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 0, top: 2, bottom: 2, width: 1,
          background: 'linear-gradient(180deg, transparent, rgba(232,226,212,0.09) 14%, rgba(232,226,212,0.09) 86%, transparent)',
        }}
      />
      {TOC.map((t) => {
        const isActive = t.id === active;
        return (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="toc-link"
            style={{
              position: 'relative',
              color: isActive ? SHADE.cream : 'rgba(232,226,212,0.34)',
              textDecoration: 'none',
              padding: '2px 0 2px 18px',
              lineHeight: 1.25,
              // Sentence-case Bricolage (Gaea-style), not all-caps mono.
              font: `${isActive ? 600 : 400} 13.5px ${TYPE.body}`,
              letterSpacing: '0.005em',
            }}
          >
            {/* active: a soft gold vertical bar riding the guide line */}
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 0, top: '50%',
                width: 2, height: isActive ? 16 : 0,
                borderRadius: 2,
                background: SHADE.gold,
                boxShadow: isActive ? `0 0 10px ${SHADE.gold}aa` : 'none',
                transform: 'translateY(-50%)',
                transition: 'height 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.32s',
              }}
            />
            {/* inactive: a tiny dot that wakes up on hover (playful) */}
            <span
              className="toc-dot"
              aria-hidden
              style={{
                position: 'absolute', left: 4, top: '50%',
                width: 3, height: 3, borderRadius: '50%',
                background: SHADE.gold,
                transform: 'translateY(-50%) scale(0)',
                opacity: 0,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
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
      minHeight: '100svh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      textAlign: 'center',
      padding: '0 clamp(1.25rem, 4vw, 2rem) clamp(8vh, 12vh, 140px)',
      overflow: 'hidden',
    }}
  >
    {/* full-bleed portal — the Arcane shader fills the whole hero */}
    <div style={{ position: 'absolute', inset: 0 }}>
      <HeroPortal />
    </div>

    {/* legibility scrims — a soft edge vignette + a bottom gradient over the
        darker lower half where the text sits, so the copy reads cleanly while
        the portal stays the hero */}
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'radial-gradient(ellipse 78% 66% at 50% 33%, transparent 34%, rgba(11,12,14,0.28) 72%, rgba(11,12,14,0.62) 100%)',
      }}
    />
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'linear-gradient(to bottom, rgba(11,12,14,0.30) 0%, transparent 22%, transparent 42%, rgba(11,12,14,0.52) 74%, rgba(11,12,14,0.88) 100%)',
      }}
    />

    {/* content — bottom-weighted so it clears the portal ring above it */}
    <div
      style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 720, animation: 'shadeFadeUp 1s ease-out 0.2s both',
      }}
    >
      <h1
        style={{
          margin: 0,
          // Clean, light Hanken Grotesk (not the quirky Bricolage) — refined and
          // austere like Quadspinner, carried by scale and weight, not flourish.
          font: `300 clamp(3rem, 6.4vw, 5.4rem) "Hanken Grotesk", system-ui, sans-serif`,
          color: SHADE.cream,
          letterSpacing: '-0.015em',
          lineHeight: 1.0,
          textShadow: '0 2px 50px rgba(0,0,0,0.55)',
        }}
      >
        Cast a little shade.
      </h1>
      <p
        style={{
          margin: '24px auto 0',
          maxWidth: 420,
          font: `300 15px "Hanken Grotesk", system-ui, sans-serif`,
          color: 'rgba(232,226,212,0.58)',
          letterSpacing: '0.005em',
          lineHeight: 1.6,
          textShadow: '0 1px 12px rgba(0,0,0,0.5)',
        }}
      >
        Learn how GPU shaders actually work.
      </p>
      <div
        style={{
          marginTop: 38,
          font: `500 10.5px "Hanken Grotesk", system-ui, sans-serif`,
          letterSpacing: '0.5em', textTransform: 'uppercase',
          color: 'rgba(232,226,212,0.4)', paddingLeft: '0.5em',
          animation: 'shadeFadeIn 2.8s ease-out 1.2s both',
        }}
      >
        Work in progress
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
    <ShadeCanvas variant="flow" />
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
        <div style={{ background: SHADE.bg, borderRight: `1px solid ${SHADE.border}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* mode tabs — 2D / 3D / Anim, mirroring the real palette */}
          <div style={{ display: 'flex', gap: 3, background: SHADE.surface1, border: `1px solid ${SHADE.border}`, borderRadius: 6, padding: 3 }}>
            {['2D', '3D', 'ANIM'].map((t, i) => (
              <span key={t} style={{
                flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 4,
                font: `700 10px ${TYPE.bodyMono}`, letterSpacing: '0.08em',
                background: i === 0 ? SHADE.gold : 'transparent', color: i === 0 ? '#1a1208' : SHADE.textDim,
              }}>{t}</span>
            ))}
          </div>
          {/* search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: SHADE.surface1, border: `1px solid ${SHADE.border}`, borderRadius: 6, font: `400 11px ${TYPE.bodyMono}`, color: SHADE.textFaint }}>
            <span aria-hidden>⌕</span> search blocks
          </div>
          <CategoryHeader color={SHADE.catShape}   label="Shapes"      count={78} />
          <CategoryHeader color={SHADE.catDistort} label="Distortions" count={35} />
          <CategoryHeader color={SHADE.catColor}   label="Colors"      count={17} />
          <CategoryHeader color={SHADE.catEffect}  label="Effects"     count={38} />
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
        <div style={{ background: SHADE.surface2, borderLeft: `1px solid ${SHADE.border}`, display: 'flex', flexDirection: 'column' }}>
          {/* live preview */}
          <div
            style={{
              margin: 14, marginBottom: 10, borderRadius: 3, overflow: 'hidden',
              border: `1px solid ${SHADE.inkLine}`,
              aspectRatio: '1 / 1', background: '#000',
            }}
          >
            <ShadeCanvas variant="flow" />
          </div>
          {/* Block / Canvas inspector tabs, mirroring the real right bar */}
          <div style={{ display: 'flex', gap: 3, margin: '0 14px 12px', background: SHADE.surface1, border: `1px solid ${SHADE.border}`, borderRadius: 6, padding: 3 }}>
            {['Block', 'Canvas'].map((t, i) => (
              <span key={t} style={{
                flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 4,
                font: `700 9.5px ${TYPE.body}`, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: i === 0 ? SHADE.gold : 'transparent', color: i === 0 ? '#1a1208' : SHADE.textDim,
              }}>{t}</span>
            ))}
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

const CategoryHeader = ({ color, label, count }: { color: string; label: string; count?: number }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9,
      margin: 0,
      padding: '6px 10px',
      background: `${color}12`, border: `1px solid ${color}38`,
      borderRadius: 3,
      font: `700 10.5px ${TYPE.body}`, color, letterSpacing: '0.12em', textTransform: 'uppercase',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 16, height: 16, borderRadius: 2, background: color }} />
      {label}
    </span>
    {count !== undefined && (
      <span style={{ font: `700 9px ${TYPE.bodyMono}`, color, opacity: 0.75 }}>{count}</span>
    )}
  </div>
);

// ─── Code panel ─────────────────────────────────────────────────────────
// Syntax-token model for the live-compile animation.
const CODE_COLORS = {
  kw: SHADE.catDistort,
  ty: SHADE.catShape,
  fn: SHADE.catColor,
  num: SHADE.gold,
  com: 'rgba(254,231,199,0.42)',
  tx: SHADE.cream,
} as const;
type CodeSeg = [string, keyof typeof CODE_COLORS];
const CODE_LINES: CodeSeg[][] = [
  [['#version 100', 'com']],
  [['precision ', 'kw'], ['highp ', 'kw'], ['float', 'ty'], [';', 'tx']],
  [['uniform ', 'kw'], ['vec2', 'ty'], ['  uResolution;', 'tx']],
  [['uniform ', 'kw'], ['float', 'ty'], [' uTime;', 'tx']],
  [],
  [['// 5-octave fbm noise', 'com']],
  [['float ', 'ty'], ['fbm', 'fn'], ['(', 'tx'], ['vec2', 'ty'], [' p) {', 'tx']],
  [['  float', 'ty'], [' v = ', 'tx'], ['0.0', 'num'], [', a = ', 'tx'], ['0.5', 'num'], [';', 'tx']],
  [['  for ', 'kw'], ['(', 'tx'], ['int', 'ty'], [' i=', 'tx'], ['0', 'num'], ['; i<', 'tx'], ['5', 'num'], ['; i++) {', 'tx']],
  [['    v += a*', 'tx'], ['noise', 'fn'], ['(p); p *= ', 'tx'], ['2.0', 'num'], ['; a *= ', 'tx'], ['0.5', 'num'], [';', 'tx']],
  [['  } ', 'tx'], ['return', 'kw'], [' v;', 'tx']],
  [['}', 'tx']],
  [],
  [['// Block 03: DOMAIN WARP (animating)', 'com']],
  [['vec2 ', 'ty'], ['warp', 'fn'], ['(', 'tx'], ['vec2', 'ty'], [' uv) {', 'tx']],
  [['  vec2', 'ty'], [' q = ', 'tx'], ['vec2', 'ty'], ['(', 'tx'], ['fbm', 'fn'], ['(uv + uTime*', 'tx'], ['0.1', 'num'], ['), ', 'tx'], ['fbm', 'fn'], ['(uv + ', 'tx'], ['4.2', 'num'], ['));', 'tx']],
  [['  return', 'kw'], [' uv + ', 'tx'], ['0.35', 'num'], [' * q;', 'tx']],
  [['}', 'tx']],
  [],
  [['void ', 'ty'], ['main', 'fn'], ['() {', 'tx']],
  [['  vec3', 'ty'], [' col = ', 'tx'], ['palette', 'fn'], ['(', 'tx'], ['fbm', 'fn'], ['(', 'tx'], ['warp', 'fn'], ['(uv)));', 'tx']],
  [['  gl_FragColor = ', 'tx'], ['vec4', 'ty'], ['(col, ', 'tx'], ['1.0', 'num'], [');', 'tx']],
  [['}', 'tx']],
];
const CODE_LINE_H = 21;

// ─── Code panel — live "compilation" animation ───────────────────────────
// Streams the generated GLSL in line by line with a blinking caret, then flips
// the header to a compiled state and loops. Honors prefers-reduced-motion
// (renders the whole listing statically). Height is reserved up-front so the
// page never reflows as lines appear.
const CodePanel = () => {
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const total = CODE_LINES.length;
  const [shown, setShown] = useState(reduce ? total : 0);
  const [done, setDone] = useState(!!reduce);

  useEffect(() => {
    if (reduce) return;
    let n = 0;
    let timer = 0;
    const tick = () => {
      n += 1;
      setShown(n);
      if (n < total) {
        timer = window.setTimeout(tick, 72);
      } else {
        setDone(true);
        timer = window.setTimeout(() => {
          setDone(false);
          n = 0;
          setShown(0);
          timer = window.setTimeout(tick, 500);
        }, 2800);
      }
    };
    timer = window.setTimeout(tick, 600);
    return () => window.clearTimeout(timer);
  }, [reduce, total]);

  return (
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
        <span
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7,
            font: `600 10.5px ${TYPE.bodyMono}`, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: done ? '#8fd14f' : 'rgba(254,231,199,0.5)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: done ? '#8fd14f' : SHADE.gold,
              animation: done ? undefined : 'shadeBlink 1s steps(1) infinite',
            }}
          />
          {done ? `compiled · ${total} lines · 0 errors` : `compiling… ${shown}/${total}`}
        </span>
      </div>
      <div
        style={{
          margin: 0, padding: '16px 20px',
          font: `500 13px ${TYPE.bodyMono}`,
          lineHeight: `${CODE_LINE_H}px`,
          overflowX: 'auto',
          minHeight: total * CODE_LINE_H + 32,
        }}
      >
        {CODE_LINES.slice(0, shown).map((segs, i) => (
          <div
            key={i}
            style={{
              whiteSpace: 'pre', minHeight: CODE_LINE_H,
              animation: reduce ? undefined : 'shadeLineIn 220ms ease both',
            }}
          >
            {segs.length === 0
              ? ' '
              : segs.map(([t, c], j) => (
                  <span key={j} style={{ color: CODE_COLORS[c] }}>{t}</span>
                ))}
            {!done && i === shown - 1 && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block', width: 7, height: 14, marginLeft: 2,
                  verticalAlign: 'text-bottom', background: SHADE.gold,
                  animation: 'shadeBlink 1s steps(1) infinite',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Templates preview grid (12 starter templates teaser) ───────────────
const TEMPLATES: Template[] = [
  { name: 'Terrain',   hint: 'fbm · erosion',     variant: 'terrain' },
  { name: 'Nebula',    hint: 'noise · stars',     variant: 'nebula' },
  { name: 'DNA',       hint: 'sin · helix',       variant: 'dna' },
  { name: 'Ocean',     hint: 'waves · caustics',  variant: 'ocean' },
  { name: 'Lava',      hint: 'turbulence · heat', variant: 'lava' },
  { name: 'Molecule',  hint: 'metaballs · bonds', variant: 'molecule' },
  { name: 'Galaxy',    hint: 'spiral · stars',    variant: 'galaxy' },
  { name: 'Aurora',    hint: 'curtains · noise',  variant: 'aurora' },
  { name: 'Fire',      hint: 'turbulence · rise',  variant: 'fire' },
  { name: 'Crystals',  hint: 'voronoi · cells',   variant: 'crystals' },
  { name: 'Wormhole',  hint: 'polar · depth',     variant: 'wormhole' },
  { name: '3D Ball',   hint: 'raymarch · light',  variant: 'raymarch' },
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
    { q: 'Is the output real GLSL?', a: "Yes. Real GLSL ES fragment source, no Shaddy wrapper around it. Paste it into Shadertoy, Bonzomatic, or your own WebGL pipeline and it runs." },
    { q: 'Do I need to know shader math?', a: "Not at all. Most people start by snapping blocks until something pretty happens, then read the code drawer to figure out which line did what. The blocks teach the maths by sitting next to it." },
    { q: 'Does it run on mobile?', a: "Yep. Palette and properties slide up as bottom sheets so the canvas stays the hero. I tested on a four-year-old phone and still got 60 fps for most recipes." },
    { q: 'Will I get a fast GPU on my laptop?', a: "Almost certainly. Any laptop made since 2018 has a usable GPU and Shaddy renders through WebGL 2. The mobile path downscales the drawing buffer when the framerate drops; the desktop path renders at full devicePixelRatio." },
    { q: 'Can I import existing shaders?', a: "Paste GLSL into the Ask Claude panel and the AI pulls out the blocks it recognises. It won't always be a clean round-trip, but you get a starting chain to edit, which is the hard part." },
    { q: 'How do I get the GLSL out?', a: "Copy from the code drawer. The output is real GLSL ES 3.0 fragment source. Paste it into Shadertoy or your own WebGL pipeline and it runs. The drawer is read-write: edit the code, and the Ask Claude panel translates the edits back into cards." },
    { q: 'Is the code open source?', a: "MIT-licensed on GitHub. Renderer, card library, AI import, all in one repo, with no proprietary bits hiding anywhere." },
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
        © 2026 · MIT licensed · Built so a 12-year-old can learn GPU programming.
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
      <SiteNav inPage />
      <ScrollToTop />
      <PageTOC />
      <Hero />
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
                Drag a shape onto the canvas. Snap a distortion on top. Add a
                colour, then an effect. You can&apos;t make an invalid chain.
                Each block shows the one knob you&apos;ll actually grab for.
                Double-click for the rest.
              </>
            }
            visual={<FeatureChain />}
          />
          <FeatureRow
            eyebrow="02 · Tune"
            title={<>Move a slider.<br />Watch the canvas breathe.</>}
            body={
              <>
                Every parameter is a slider with an Animate toggle. Animated
                ones loop in real time, locked to a global tempo. Leave the
                editor alone for a minute and the canvas keeps moving.
              </>
            }
            visual={<FeatureSliders />}
            reverse
          />
          <FeatureRow
            eyebrow="03 · Export"
            title={<>Real GLSL.<br />Drops into anything.</>}
            body={
              <>
                The code drawer is the actual GLSL the GPU runs. Copy it,
                paste it into Shadertoy or your own WebGL page, and it just
                works. Edit the code in place and Ask Claude reparses your
                edits back into cards. Hit S to copy a share URL with the
                whole recipe in the hash. Plain text in, plain text out.
              </>
            }
            visual={<FeatureCanvas />}
          />
        </div>
      </SectionShell>

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
            Real things, made of maths.<br />Terrain, DNA, galaxies, fire.
          </h2>
          <p
            style={{
              margin: '20px auto 0', maxWidth: 580,
              font: `400 15.5px ${TYPE.body}`,
              color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
            }}
          >
            Open a template and take it apart. Each one builds something you
            recognise — a planet&apos;s terrain, a DNA helix, a lava flow — from
            a handful of blocks, with the exact trick labelled so you learn the
            move, not just admire the pixels.
          </p>
        </div>
        <TemplatesGrid />
      </section>


      <SectionShell
        id="compose"
        eyebrow="The composer"
        title={<>A composer<br />for fragment shaders.</>}
        subtitle="Chunky puzzle blocks in the middle. Live preview top-right. Properties on the right. Double-click any block to see the rest of its knobs."
      >
        <ComposerShowcase />
      </SectionShell>


      <SectionShell
        id="code"
        eyebrow="GLSL underneath"
        title={<>The code and<br />the canvas are<br />the same thing.</>}
        subtitle="Drag a block and the matching line in the code drawer scrolls into view and flashes lime. Edit a number in the code and the slider in the panel jumps to match. No black boxes between you and the GPU."
      >
        <CodePanel />
      </SectionShell>


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
              Tiny. Fast.<br />Open from day one.
            </h2>
            <p
              style={{
                margin: '20px 0 0', maxWidth: 480,
                font: `400 15.5px ${TYPE.body}`,
                color: 'rgba(232,226,212,0.62)', lineHeight: 1.6,
              }}
            >
              No backend. No install. No account, unless you want to save your
              work. Whatever browser tab you have open is the whole app. That
              raymarched fractal on the right? It&apos;s the same GLSL pipeline,
              looping live on your GPU at 60 fps.
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
            {/* Transparent fractal on the bare page background — no box, no
                backdrop; it reads as a silhouette floating in the dark. */}
            <FractalEntity />
          </div>
        </div>
      </section>


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
