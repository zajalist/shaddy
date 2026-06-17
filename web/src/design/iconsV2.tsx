import type { CSSProperties, ReactNode } from 'react';

// Inject the (very light) pattern-icon animations once. Respects reduced-motion.
if (typeof document !== 'undefined' && !document.getElementById('iv2-anim')) {
  const s = document.createElement('style');
  s.id = 'iv2-anim';
  s.textContent = `
    @keyframes iv2Ripple { 0% { transform: scale(0.34); opacity: 0.85; } 72% { opacity: 0.12; } 100% { transform: scale(1.24); opacity: 0; } }
    @keyframes iv2Flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.32; } }
    @keyframes iv2Repeat { 0%, 100% { transform: scale(0.72); opacity: 0.5; } 50% { transform: scale(1); opacity: 1; } }
    @keyframes iv2Spin { to { transform: rotate(360deg); } }
    .iv2-ripple-ring { transform-box: fill-box; transform-origin: center; animation: iv2Ripple 2.6s ease-out infinite; }
    .iv2-grid-dot { animation: iv2Flicker 3.4s ease-in-out infinite; }
    .iv2-repeat-tile { transform-box: fill-box; transform-origin: center; animation: iv2Repeat 2.4s ease-in-out infinite; }
    .iv2-spin { transform-box: fill-box; transform-origin: center; animation: iv2Spin 16s linear infinite; }
    @media (prefers-reduced-motion: reduce) { .iv2-ripple-ring, .iv2-grid-dot, .iv2-repeat-tile, .iv2-spin { animation: none; } }
  `;
  document.head.appendChild(s);
}

// ─── Icon language v2 ───────────────────────────────────────────────────────
// Bold flat/duotone. Each icon is a single STRONG, DISTINCT silhouette in the
// category color (`c`) + ONE cream accent. A uniform "subtle ink edge" is added
// by the IconV2 wrapper (a hard drop-shadow), so per-icon code only draws the
// silhouette + accent — never thin strokes for the body, never busy multi-dot
// marks. Goal: charismatic, professional, and legible at 15px.
//
// Grid: 24×24, content ~3..21 with generous optical margin for bolder shapes.

type Args = { c: string; cream: string; ink: string };
type Renderer = (a: Args) => ReactNode;

export const ICON_V2: Record<string, Renderer> = {
  // ─── Category icons ──────────────────────────────────────────────────────
  'cat-shape': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="12.4" height="12.4" rx="3.4" fill={c} />
      <circle cx="16.4" cy="16.4" r="4.7" fill={cream} />
    </>
  ),
  'cat-distort': ({ c, cream }) => (
    <>
      <path
        d="M1.5 13.4 C4 8.6 6.6 8.6 9 12.6 C11.4 16.6 14 16.6 16.4 12 C18 9 20 9 22.5 11.2 L22.5 15.4 C20 13.2 18 13.2 16.4 16.2 C14 20.8 11.4 20.8 9 16.8 C6.6 12.8 4 12.8 1.5 17.6 Z"
        fill={c}
      />
      <path d="M1.6 10.2 C4 5.6 6.6 5.6 9 9.4 C11.4 13.2 14 13.2 16.4 8.8" fill="none" stroke={cream} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  'cat-color': ({ c, cream }) => (
    <>
      <circle cx="9" cy="12" r="6.6" fill={c} />
      <circle cx="15.4" cy="12" r="6.6" fill={cream} />
      <path d="M12.2 7 A6.6 6.6 0 0 1 12.2 17 A6.6 6.6 0 0 0 12.2 7 Z" fill={c} opacity="0.55" />
    </>
  ),
  'cat-effect': ({ c, cream }) => (
    <>
      <path d="M12 1.8 C13 7.5 16.5 11 22.2 12 C16.5 13 13 16.5 12 22.2 C11 16.5 7.5 13 1.8 12 C7.5 11 11 7.5 12 1.8 Z" fill={c} />
      <path d="M12 7.4 C12.6 10.4 13.6 11.4 16.6 12 C13.6 12.6 12.6 13.6 12 16.6 C11.4 13.6 10.4 12.6 7.4 12 C10.4 11.4 11.4 10.4 12 7.4 Z" fill={cream} />
    </>
  ),

  // ─── Animation-block icons (clean line glyphs, cyan species) ─────────────
  'anim-time': ({ c }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill="none" stroke={c} strokeWidth="2.1" />
      <path d="M12 7.4V12l3.4 2" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'anim-mouse': ({ c }) => (
    <>
      <circle cx="12" cy="12" r="7.4" fill="none" stroke={c} strokeWidth="2.1" />
      <circle cx="12" cy="12" r="2.8" fill={c} />
      <path d="M12 1.8v2.6 M12 19.6v2.6 M1.8 12h2.6 M19.6 12h2.6" stroke={c} strokeWidth="2.1" strokeLinecap="round" />
    </>
  ),
  'anim-osc': ({ c }) => (
    <path d="M3 12q3-6 6 0t6 0 6 0" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'anim-pulse': ({ c }) => (
    <path d="M2.5 16.5H8V7.5h5v9h5.5v-9h2" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'anim-noise': ({ c }) => (
    <path d="M2.5 12 5 8.4 7 14.6 9.6 7.4 11.6 15 14 9 16 13.6 18.6 8 21.5 12" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'anim-remap': ({ c }) => (
    <>
      <path d="M2.6 12h18.8" stroke={c} strokeWidth="2.1" strokeLinecap="round" />
      <path d="M7 7.6 2.6 12 7 16.4 M17 7.6 21.4 12 17 16.4" fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'anim-ease': ({ c }) => (
    <>
      <path d="M4 20V4.5M4 20h15.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
      <path d="M4 20C4 9.5 11 5 20 5" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),

  // ─── UI icons ────────────────────────────────────────────────────────────
  search: ({ c, cream }) => (
    <>
      <rect x="13.5" y="13" width="8.4" height="3.6" rx="1.8" transform="rotate(45 13.5 13)" fill={c} />
      <circle cx="10" cy="10" r="6.6" fill={c} />
      <circle cx="10" cy="10" r="3.6" fill={cream} />
    </>
  ),
  plus: ({ c }) => (
    <>
      <rect x="10.1" y="3.4" width="3.8" height="17.2" rx="1.9" fill={c} />
      <rect x="3.4" y="10.1" width="17.2" height="3.8" rx="1.9" fill={c} />
    </>
  ),
  close: ({ c }) => (
    <>
      <rect x="2.6" y="10.1" width="18.8" height="3.8" rx="1.9" transform="rotate(45 12 12)" fill={c} />
      <rect x="2.6" y="10.1" width="18.8" height="3.8" rx="1.9" transform="rotate(-45 12 12)" fill={c} />
    </>
  ),
  chevron: ({ c }) => (
    <path d="M4.4 8.8 L6.7 6.6 L12 11.7 L17.3 6.6 L19.6 8.8 L12 16.2 Z" fill={c} strokeLinejoin="round" />
  ),
  play: ({ c, cream }) => (
    <>
      <path d="M6.5 4.4 C6.5 3.3 7.7 2.7 8.6 3.3 L19.4 10.3 C20.3 10.9 20.3 12.3 19.4 12.9 L8.6 19.9 C7.7 20.5 6.5 19.9 6.5 18.8 Z" fill={c} />
      <path d="M8.4 6.6 L8.4 11 L14.5 7.6 Z" fill={cream} opacity="0.5" />
    </>
  ),
  trash: ({ c, cream }) => (
    <>
      <rect x="8.4" y="2.6" width="7.2" height="3.4" rx="1.7" fill={c} />
      <rect x="3.6" y="4.8" width="16.8" height="3.4" rx="1.7" fill={c} />
      <path d="M5.4 8.4 L18.6 8.4 L17.4 20.2 C17.3 21 16.6 21.6 15.8 21.6 L8.2 21.6 C7.4 21.6 6.7 21 6.6 20.2 Z" fill={c} />
      <rect x="9" y="11" width="1.8" height="7" rx="0.9" fill={cream} opacity="0.6" />
      <rect x="13.2" y="11" width="1.8" height="7" rx="0.9" fill={cream} opacity="0.6" />
    </>
  ),
  code: ({ c, cream }) => (
    <>
      <path d="M8.8 5.4 L10.8 7.3 L5.9 12 L10.8 16.7 L8.8 18.6 L2 12 Z" fill={c} />
      <path d="M15.2 5.4 L13.2 7.3 L18.1 12 L13.2 16.7 L15.2 18.6 L22 12 Z" fill={c} />
      <rect x="11.1" y="3.4" width="1.8" height="17.2" rx="0.9" transform="rotate(12 12 12)" fill={cream} opacity="0.55" />
    </>
  ),
  share: ({ c, cream }) => (
    <>
      {/* open tray */}
      <path d="M5 11.4 C5 10.6 5.7 9.9 6.5 9.9 L9 9.9 L9 12.3 L7.4 12.3 L7.4 19 L16.6 19 L16.6 12.3 L15 12.3 L15 9.9 L17.5 9.9 C18.3 9.9 19 10.6 19 11.4 L19 20 C19 20.8 18.3 21.5 17.5 21.5 L6.5 21.5 C5.7 21.5 5 20.8 5 20 Z" fill={c} />
      {/* bold up-arrow — solid c so it's unmistakable */}
      <rect x="10.2" y="6" width="3.6" height="9" rx="1.8" fill={c} />
      <path d="M12 1.9 L17 7.2 L7 7.2 Z" fill={c} />
      {/* tiny cream highlight inside the head (subtle duotone, stays legible) */}
      <path d="M12 4.2 L14.3 6.6 L9.7 6.6 Z" fill={cream} opacity="0.5" />
    </>
  ),
  record: ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <circle cx="12" cy="12" r="3.4" fill={cream} />
    </>
  ),
  camera: ({ c, cream, ink }) => (
    <>
      <path d="M8.6 5.2 L15.4 5.2 L16.8 7.2 L19.5 7.2 C20.6 7.2 21.5 8.1 21.5 9.2 L21.5 18 C21.5 19.1 20.6 20 19.5 20 L4.5 20 C3.4 20 2.5 19.1 2.5 18 L2.5 9.2 C2.5 8.1 3.4 7.2 4.5 7.2 L7.2 7.2 Z" fill={c} />
      <circle cx="12" cy="13.4" r="4.2" fill={cream} />
      <circle cx="12" cy="13.4" r="2" fill={ink} opacity="0.85" />
    </>
  ),
  dots: ({ c }) => (
    <>
      <circle cx="5.4" cy="12" r="2.3" fill={c} />
      <circle cx="12" cy="12" r="2.3" fill={c} />
      <circle cx="18.6" cy="12" r="2.3" fill={c} />
    </>
  ),
  menu: ({ c }) => (
    <>
      <rect x="3.5" y="5.4" width="17" height="3" rx="1.5" fill={c} />
      <rect x="3.5" y="10.5" width="17" height="3" rx="1.5" fill={c} />
      <rect x="3.5" y="15.6" width="17" height="3" rx="1.5" fill={c} />
    </>
  ),
  lock: ({ c, cream }) => (
    <>
      <path d="M7.5 10 L7.5 8 C7.5 5.5 9.5 3.5 12 3.5 C14.5 3.5 16.5 5.5 16.5 8 L16.5 10 L13.8 10 L13.8 8 C13.8 7 13 6.2 12 6.2 C11 6.2 10.2 7 10.2 8 L10.2 10 Z" fill={c} />
      <rect x="4.6" y="9.6" width="14.8" height="10.8" rx="2.8" fill={c} />
      <circle cx="12" cy="14.2" r="1.9" fill={cream} />
      <rect x="11.2" y="14.2" width="1.6" height="3.8" rx="0.8" fill={cream} />
    </>
  ),
  sparkle: ({ c, cream }) => (
    <>
      <path d="M11 2.6 C11.7 7.2 13.8 9.3 18.4 10 C13.8 10.7 11.7 12.8 11 17.4 C10.3 12.8 8.2 10.7 3.6 10 C8.2 9.3 10.3 7.2 11 2.6 Z" fill={c} />
      <path d="M18 13.8 C18.3 15.8 19 16.5 21 16.8 C19 17.1 18.3 17.8 18 19.8 C17.7 17.8 17 17.1 15 16.8 C17 16.5 17.7 15.8 18 13.8 Z" fill={cream} />
    </>
  ),

  // ─── Topbar icons ────────────────────────────────────────────────────────
  'tb-photo': ({ c, cream, ink }) => (
    <>
      <path d="M8.6 5 L15.4 5 L16.8 7 L19.5 7 C20.6 7 21.5 7.9 21.5 9 L21.5 18 C21.5 19.1 20.6 20 19.5 20 L4.5 20 C3.4 20 2.5 19.1 2.5 18 L2.5 9 C2.5 7.9 3.4 7 4.5 7 L7.2 7 Z" fill={c} />
      <circle cx="12" cy="13.4" r="4.4" fill={cream} />
      <circle cx="12" cy="13.4" r="2.1" fill={ink} opacity="0.85" />
    </>
  ),
  'tb-signin': ({ c, cream }) => (
    <>
      <path d="M4.5 21 C4.5 16.6 7.9 13.6 12 13.6 C16.1 13.6 19.5 16.6 19.5 21 Z" fill={c} />
      <circle cx="12" cy="8" r="5" fill={c} />
      <circle cx="10.4" cy="7" r="1.6" fill={cream} opacity="0.55" />
    </>
  ),
  'tb-paste': ({ c, cream }) => (
    <>
      <rect x="4.5" y="4" width="15" height="17" rx="2.8" fill={c} />
      <rect x="9" y="2.4" width="6" height="3.8" rx="1.7" fill={c} />
      <rect x="9.6" y="3" width="4.8" height="2.6" rx="1.1" fill={cream} opacity="0.5" />
      <path d="M10 10.6 L7.6 13 L10 15.4" fill="none" stroke={cream} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10.6 L16.4 13 L14 15.4" fill="none" stroke={cream} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'tb-share': ({ c, cream }) => (
    <>
      <path d="M5 11.4 C5 10.6 5.7 9.9 6.5 9.9 L9 9.9 L9 12.3 L7.4 12.3 L7.4 19 L16.6 19 L16.6 12.3 L15 12.3 L15 9.9 L17.5 9.9 C18.3 9.9 19 10.6 19 11.4 L19 20 C19 20.8 18.3 21.5 17.5 21.5 L6.5 21.5 C5.7 21.5 5 20.8 5 20 Z" fill={c} />
      <rect x="10.2" y="6" width="3.6" height="9" rx="1.8" fill={c} />
      <path d="M12 1.9 L17 7.2 L7 7.2 Z" fill={c} />
      <path d="M12 4.2 L14.3 6.6 L9.7 6.6 Z" fill={cream} opacity="0.5" />
    </>
  ),
  'composer-blocks': ({ c, cream }) => (
    <>
      <rect x="3" y="6" width="9.4" height="12" rx="2.6" fill={c} />
      <rect x="11.6" y="6" width="9.4" height="12" rx="2.6" fill={cream} />
      <circle cx="12" cy="12" r="2.3" fill={c} />
    </>
  ),

  // ─── Shape / primitive card icons ─────────────────────────────────────────
  'card-square': ({ c, cream }) => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.6" fill={c} />
      <rect x="6.6" y="6.6" width="5.2" height="5.2" rx="2" fill={cream} opacity="0.5" />
    </>
  ),
  'card-rectangle': ({ c, cream }) => (
    <>
      <rect x="2.6" y="6.4" width="18.8" height="11.2" rx="3.2" fill={c} />
      <rect x="5" y="8.8" width="5" height="4" rx="1.6" fill={cream} opacity="0.5" />
    </>
  ),
  'card-triangle': ({ c, cream }) => (
    <>
      <path d="M12 3.4 C12.7 3.4 13.3 3.8 13.6 4.4 L20.8 17.8 C21.4 18.9 20.6 20.3 19.3 20.3 L4.7 20.3 C3.4 20.3 2.6 18.9 3.2 17.8 L10.4 4.4 C10.7 3.8 11.3 3.4 12 3.4 Z" fill={c} />
      <path d="M12 8 L15 13.4 L9 13.4 Z" fill={cream} opacity="0.5" />
    </>
  ),
  'card-hexagon': ({ c, cream }) => (
    <>
      <path d="M11 3.1 C11.6 2.75 12.4 2.75 13 3.1 L19.5 6.85 C20.1 7.2 20.5 7.85 20.5 8.55 L20.5 15.45 C20.5 16.15 20.1 16.8 19.5 17.15 L13 20.9 C12.4 21.25 11.6 21.25 11 20.9 L4.5 17.15 C3.9 16.8 3.5 16.15 3.5 15.45 L3.5 8.55 C3.5 7.85 3.9 7.2 4.5 6.85 Z" fill={c} />
      <circle cx="9.6" cy="9.6" r="2.4" fill={cream} opacity="0.5" />
    </>
  ),
  'card-star': ({ c, cream }) => (
    <>
      <polygon points="12,2.4 14.5,8.9 21.4,9.2 16,13.5 17.8,20.2 12,16.2 6.2,20.2 8,13.5 2.6,9.2 9.5,8.9" fill={c} />
      <polygon points="12,6.6 13.2,9.9 16.6,10 14,12 14.8,15.3 12,13.4 9.2,15.3 10,12 7.4,10 10.8,9.9" fill={cream} opacity="0.5" />
    </>
  ),
  'card-heart': ({ c, cream }) => (
    <>
      <path d="M12 20.6 C3.8 14.7 3.4 9 7.3 6.6 C9.7 5.1 11.6 6.6 12 8.4 C12.4 6.6 14.3 5.1 16.7 6.6 C20.6 9 20.2 14.7 12 20.6 Z" fill={c} />
      <path d="M8.4 8.2 C7.2 9 7.1 10.6 8 12" fill="none" stroke={cream} strokeWidth="1.7" strokeLinecap="round" opacity="0.6" />
    </>
  ),
  'card-cross': ({ c, cream }) => (
    <>
      <path d="M9.4 3.6 C9.4 2.9 9.9 2.4 10.6 2.4 L13.4 2.4 C14.1 2.4 14.6 2.9 14.6 3.6 L14.6 9.4 L20.4 9.4 C21.1 9.4 21.6 9.9 21.6 10.6 L21.6 13.4 C21.6 14.1 21.1 14.6 20.4 14.6 L14.6 14.6 L14.6 20.4 C14.6 21.1 14.1 21.6 13.4 21.6 L10.6 21.6 C9.9 21.6 9.4 21.1 9.4 20.4 L9.4 14.6 L3.6 14.6 C2.9 14.6 2.4 14.1 2.4 13.4 L2.4 10.6 C2.4 9.9 2.9 9.4 3.6 9.4 L9.4 9.4 Z" fill={c} />
      <rect x="10.6" y="3.8" width="2.8" height="3" rx="1.2" fill={cream} opacity="0.45" />
    </>
  ),
  'card-arc': ({ c, cream }) => (
    <>
      <path d="M3 18.5 C3 13 7 9 12 9 C17 9 21 13 21 18.5 L16.6 18.5 C16.6 15.4 14.6 13.4 12 13.4 C9.4 13.4 7.4 15.4 7.4 18.5 Z" fill={c} />
      <circle cx="12" cy="18.5" r="1.7" fill={cream} opacity="0.55" />
    </>
  ),

  // ─── Card batch 2 — remaining shape primitives ────────────────────────────
  'card-radial-gradient': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill={c} />
      <circle cx="12" cy="12" r="5.2" fill={cream} opacity="0.4" />
      <circle cx="12" cy="12" r="2.4" fill={cream} />
    </>
  ),
  'card-ring': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="7" fill="none" stroke={c} strokeWidth="4.2" />
      <path d="M7.4 7.4 A7 7 0 0 1 16 6.2" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  'card-rounded-box': ({ c, cream }) => (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="6" fill={c} />
      <rect x="6.6" y="6.6" width="5" height="5" rx="2.4" fill={cream} opacity="0.45" />
    </>
  ),
  'card-pentagon': ({ c, cream }) => (
    <>
      <polygon points="12,3.5 20.56,9.72 17.29,19.78 6.71,19.78 3.44,9.72" fill={c} />
      <circle cx="9.6" cy="10.4" r="2.2" fill={cream} opacity="0.45" />
    </>
  ),
  'card-ellipse': ({ c, cream }) => (
    <>
      <ellipse cx="12" cy="12" rx="9.6" ry="6.4" fill={c} />
      <ellipse cx="9" cy="9.6" rx="2.6" ry="1.7" fill={cream} opacity="0.5" />
    </>
  ),
  'card-capsule': ({ c, cream }) => (
    <>
      <rect x="2.6" y="8" width="18.8" height="8" rx="4" fill={c} />
      <circle cx="8" cy="11" r="1.7" fill={cream} opacity="0.5" />
    </>
  ),
  'card-segment': ({ c, cream }) => (
    <>
      <rect x="3.4" y="10" width="17.2" height="4" rx="2" transform="rotate(-20 12 12)" fill={c} />
      <circle cx="6.6" cy="15" r="1.7" fill={cream} opacity="0.6" />
      <circle cx="17.4" cy="9" r="1.7" fill={cream} opacity="0.6" />
    </>
  ),
  'card-trapezoid': ({ c, cream }) => (
    <>
      <path d="M3.6 18.4 L7.8 6.6 L16.2 6.6 L20.4 18.4 Z" fill={c} />
      <rect x="9" y="8.2" width="4.4" height="3" rx="1.2" fill={cream} opacity="0.45" />
    </>
  ),
  'card-parallelogram': ({ c, cream }) => (
    <>
      <path d="M3.6 17.6 L9 6.4 L20.4 6.4 L15 17.6 Z" fill={c} />
      <rect x="8.4" y="8.4" width="4.6" height="3" rx="1.2" transform="skewX(-18)" fill={cream} opacity="0.4" />
    </>
  ),
  // Vesica piscis — the two overlapping circles (the construction) + the lens
  // intersection filled. The outlines make the "intersection of two circles"
  // reading obvious (the old icon did this; the bare lens lost it).
  'card-vesica': ({ c, cream }) => (
    <>
      <circle cx="8.6" cy="12" r="6.6" fill="none" stroke={c} strokeWidth="1.8" opacity="0.45" />
      <circle cx="15.4" cy="12" r="6.6" fill="none" stroke={c} strokeWidth="1.8" opacity="0.45" />
      <path d="M12 6.4 C15.2 9.2 15.2 14.8 12 17.6 C8.8 14.8 8.8 9.2 12 6.4 Z" fill={c} />
      <path d="M12 8.4 C13.3 10 13.3 14 12 15.6" fill="none" stroke={cream} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  'card-pie-slice': ({ c, cream }) => (
    <>
      <path d="M12 12 L12 2.8 A9.2 9.2 0 0 1 20.4 16.2 Z" fill={c} />
      <circle cx="12" cy="12" r="1.7" fill={cream} opacity="0.6" />
    </>
  ),
  'card-horseshoe': ({ c, cream }) => (
    <>
      <path d="M6 7 A8 8 0 1 0 18 7" fill="none" stroke={c} strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="6" cy="7" r="2.1" fill={cream} opacity="0.5" />
      <circle cx="18" cy="7" r="2.1" fill={cream} opacity="0.5" />
    </>
  ),

  // ─── Card batch 3 — distinct patterns + polar/radial ──────────────────────
  'card-truchet': ({ c, cream }) => (
    <>
      <path d="M3 12 A9 9 0 0 1 12 3" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12 21 A9 9 0 0 1 21 12" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21 12 A9 9 0 0 0 12 21" fill="none" stroke={cream} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M12 3 A9 9 0 0 0 3 12" fill="none" stroke={cream} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  'card-truchet-tris': ({ c, cream }) => (
    <>
      <path d="M3 3 L12 3 L3 12 Z" fill={c} />
      <path d="M21 3 L12 3 L21 12 Z" fill={cream} opacity="0.55" />
      <path d="M3 21 L12 21 L3 12 Z" fill={cream} opacity="0.55" />
      <path d="M21 21 L12 21 L21 12 Z" fill={c} />
    </>
  ),
  'card-triangular-tiles': ({ c, cream }) => (
    <>
      <path d="M3 11 L7.5 4 L12 11 Z" fill={c} />
      <path d="M7.5 4 L12 11 L16.5 4 Z" fill={cream} opacity="0.55" />
      <path d="M12 11 L16.5 4 L21 11 Z" fill={c} />
      <path d="M3 11 L7.5 18 L12 11 Z" fill={cream} opacity="0.55" />
      <path d="M7.5 18 L12 11 L16.5 18 Z" fill={c} />
      <path d="M12 11 L16.5 18 L21 11 Z" fill={cream} opacity="0.55" />
    </>
  ),
  'card-random-squares': ({ c, cream }) => (
    <>
      <rect x="3.4" y="4" width="6.6" height="6.6" rx="1.3" fill={c} />
      <rect x="13" y="3.4" width="5" height="5" rx="1.2" fill={cream} opacity="0.6" />
      <rect x="5.6" y="13" width="4.4" height="4.4" rx="1" fill={cream} opacity="0.6" />
      <rect x="12.4" y="11.6" width="7.4" height="7.4" rx="1.5" fill={c} />
    </>
  ),
  'card-cross-hatch': ({ c }) => (
    <g strokeLinecap="round" strokeWidth="2">
      {/* ↘ set */}
      <line x1="4" y1="10.5" x2="13.5" y2="20" stroke={c} />
      <line x1="4" y1="4" x2="20" y2="20" stroke={c} />
      <line x1="10.5" y1="4" x2="20" y2="13.5" stroke={c} />
      {/* ↗ set — slightly lighter for woven depth */}
      <line x1="4" y1="13.5" x2="13.5" y2="4" stroke={c} opacity="0.62" />
      <line x1="4" y1="20" x2="20" y2="4" stroke={c} opacity="0.62" />
      <line x1="10.5" y1="20" x2="20" y2="10.5" stroke={c} opacity="0.62" />
    </g>
  ),
  'card-wavy-stripes': ({ c, cream }) => (
    <g fill="none" strokeWidth="2.4" strokeLinecap="round">
      <path d="M2 8 q5 -3.5 10 0 t10 0" stroke={c} />
      <path d="M2 13 q5 -3.5 10 0 t10 0" stroke={cream} opacity="0.6" />
      <path d="M2 18 q5 -3.5 10 0 t10 0" stroke={c} />
    </g>
  ),
  'card-polar-grid': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5" fill="none" stroke={c} strokeWidth="1.8" />
      {[0, 45, 90, 135].map((a) => (
        <line key={a} x1="3" y1="12" x2="21" y2="12" stroke={c} strokeWidth="1.3" opacity="0.55" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.8" fill={cream} />
    </>
  ),
  'card-stripes': ({ c, cream }) => (
    <g transform="rotate(-25 12 12)">
      <rect x="-5" y="3.6" width="34" height="3.4" rx="1.7" fill={c} />
      <rect x="-5" y="10.3" width="34" height="3.4" rx="1.7" fill={cream} opacity="0.6" />
      <rect x="-5" y="17" width="34" height="3.4" rx="1.7" fill={c} />
    </g>
  ),
  'card-metaballs': ({ c, cream }) => (
    <>
      <circle cx="9.4" cy="13.6" r="6" fill={c} />
      <circle cx="16" cy="9.4" r="4.6" fill={c} />
      <circle cx="13" cy="12" r="2.3" fill={cream} opacity="0.55" />
    </>
  ),
  'card-rose-curve': ({ c, cream }) => (
    <>
      {[0, 60, 120].map((a) => (
        <ellipse key={a} cx="12" cy="7.4" rx="3" ry="6" fill="none" stroke={c} strokeWidth="1.8" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.8" fill={cream} />
    </>
  ),
  'card-rose-petals': ({ c, cream }) => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse key={i} cx="12" cy="6.6" rx="2.7" ry="5.6" fill={i % 2 ? cream : c} opacity={i % 2 ? 0.6 : 1} transform={`rotate(${i * 60} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2" fill={cream} />
    </>
  ),
  'card-cardioid-shape': ({ c, cream }) => (
    <>
      <path d="M12 8 C12 8 11 5.6 9 6.1 C5.6 6.9 4.6 11 6.1 15 C7.3 18 9.6 20.4 12 21 C14.4 20.4 16.7 18 17.9 15 C19.4 11 18.4 6.9 15 6.1 C13 5.6 12 8 12 8 Z" fill={c} />
      <rect x="11.2" y="3.4" width="1.6" height="3.6" rx="0.8" transform="rotate(12 12 5)" fill={cream} opacity="0.7" />
    </>
  ),
  'card-lemniscate': ({ c, cream }) => (
    <>
      <path d="M12 12 C9.5 8.4 4 8.4 4 12 C4 15.6 9.5 15.6 12 12 C14.5 8.4 20 8.4 20 12 C20 15.6 14.5 15.6 12 12 Z" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill={cream} />
    </>
  ),
  'card-spiral-arms': ({ c, cream }) => (
    <>
      {[0, 120, 240].map((a) => (
        <path key={a} d="M12 12 C13.6 9.4 17.6 10 19 14.6" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.2" fill={cream} />
    </>
  ),
  'card-sector': ({ c, cream }) => (
    <>
      <path d="M12 12 L6.2 4.4 A9.4 9.4 0 0 1 17.8 4.4 Z" fill={c} />
      <line x1="12" y1="12" x2="12" y2="3.4" stroke={cream} strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
    </>
  ),

  // ─── Card batch 4a — noise family ─────────────────────────────────────────
  'card-fbm': ({ c, cream }) => (
    <>
      {/* smooth rolling noise-terrain (summed octaves) — contrasts with the
          sharp jagged `ridged` icon */}
      <path d="M2 21 L2 13.5 C4 9.5 6 15.5 8 12.5 C10 9.5 12 14.5 14 11.5 C16 8.5 18 13.5 20 11.5 C21 10.5 22 11.5 22 12.5 L22 21 Z" fill={c} />
      <path d="M2 13.5 C4 9.5 6 15.5 8 12.5 C10 9.5 12 14.5 14 11.5 C16 8.5 18 13.5 20 11.5 C21 10.5 22 11.5 22 12.5" fill="none" stroke={cream} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  'card-ridged': ({ c, cream }) => (
    <>
      <path d="M2 19.5 L6 9.5 L9 14.5 L13 5 L16.5 12 L19.5 7.5 L22 19.5 Z" fill={c} />
      <path d="M13 5 L14.7 8.4 L11.4 8.4 Z" fill={cream} opacity="0.55" />
    </>
  ),
  // two interlocking curls — chaotic rotational flow
  'card-turbulence': ({ c }) => (
    <g fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <path d="M4.5 10.5 C5 6 11 6.5 10.5 11 C10.2 13.8 6.6 13.8 7 11" />
      <path d="M19.5 13.5 C19 18 13 17.5 13.5 13 C13.8 10.2 17.4 10.2 17 13" />
    </g>
  ),
  'card-domain-warp': ({ c }) => (
    <g fill="none" stroke={c} strokeLinecap="round">
      <path d="M3 8 q4.5 -3.4 9 0 t9 0" strokeWidth="2" />
      <path d="M3 16 q4.5 -3.4 9 0 t9 0" strokeWidth="2" />
      <path d="M8 3 q-3.4 4.5 0 9 t0 9" strokeWidth="2" opacity="0.55" />
      <path d="M16 3 q-3.4 4.5 0 9 t0 9" strokeWidth="2" opacity="0.55" />
    </g>
  ),
  'card-voronoi-cells': ({ c, cream }) => (
    <>
      <g fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M3 9 L9 5.5 L13 10 L9 15 L3.8 14 Z" />
        <path d="M13 10 L18.5 6.5 L21 13 L16 17.5 L9 15 Z" />
        <path d="M3.8 14 L9 15 L11.5 20.5 L5 21.5 Z" />
      </g>
      <circle cx="7.6" cy="10" r="1.5" fill={cream} />
      <circle cx="15" cy="12" r="1.5" fill={cream} />
      <circle cx="7.6" cy="17.6" r="1.5" fill={cream} />
    </>
  ),
  'card-worley-edges': ({ c, cream }) => (
    <>
      <path d="M3 9 L9 5.5 L13 10 L9 15 L3.8 14 Z" fill={c} opacity="0.85" />
      <path d="M13 10 L18.5 6.5 L21 13 L16 17.5 L9 15 Z" fill={c} opacity="0.5" />
      <path d="M3.8 14 L9 15 L11.5 20.5 L5 21.5 Z" fill={c} opacity="0.68" />
      <g fill="none" stroke={cream} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M9 5.5 L13 10 L9 15" />
        <path d="M9 15 L3.8 14" />
        <path d="M13 10 L16 17.5" />
      </g>
    </>
  ),
  'card-noise-field': ({ c, cream }) => (
    <>
      {([
        [5, 5, 1.5, 0], [10, 4, 1, 1], [15, 6, 1.7, 0], [19, 5, 1, 0],
        [4, 10, 1.1, 1], [9, 11, 1.8, 0], [14, 10, 1.2, 1], [19, 11, 1.6, 0],
        [6, 16, 1.6, 0], [11, 17, 1.1, 1], [16, 15, 1.4, 0], [20, 17, 1, 1],
        [4, 20, 1.2, 0], [13, 20, 1.7, 0], [18, 20, 1.1, 1],
      ] as const).map(([x, y, r, k], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={k ? cream : c} opacity={k ? 0.6 : 0.95} />
      ))}
    </>
  ),

  // ─── Card batch 4b — math / waves ─────────────────────────────────────────
  'card-sin-field': ({ c, cream }) => (
    <>
      <line x1="2" y1="12" x2="22" y2="12" stroke={cream} strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
      <path d="M2 12 C5 5 7 5 10 12 C13 19 15 19 18 12 C19.5 9 21 9.5 22 11" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  'card-plasma': ({ c, cream }) => (
    <>
      <path d="M8.5 4 C13 3 17 5.5 17.8 9.5 C18.5 13 21 14.5 19.5 17.5 C18 20.5 13 21 10 19.6 C6.5 18 3 17.5 3.2 13 C3.4 8.5 4.5 5 8.5 4 Z" fill={c} />
      <ellipse cx="9.5" cy="9.5" rx="3.2" ry="2.3" fill={cream} opacity="0.5" />
    </>
  ),
  'card-interference': ({ c }) => (
    <g fill="none" stroke={c} strokeWidth="1.9">
      <circle cx="8.5" cy="12" r="3.4" />
      <circle cx="8.5" cy="12" r="7.2" />
      <circle cx="15.5" cy="12" r="3.4" />
      <circle cx="15.5" cy="12" r="7.2" />
    </g>
  ),
  'card-moire': ({ c }) => (
    <>
      <g stroke={c} strokeWidth="1.5">
        {[5, 9, 13, 17].map((x) => (
          <line key={x} x1={x} y1="4" x2={x} y2="20" />
        ))}
      </g>
      <g stroke={c} strokeWidth="1.5" opacity="0.5" transform="rotate(24 12 12)">
        {[5, 9, 13, 17].map((x) => (
          <line key={x} x1={x} y1="4" x2={x} y2="20" />
        ))}
      </g>
    </>
  ),
  // top-down water caustics — a water tile with a bright wavy light-net
  'card-caustics': ({ c, cream }) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" fill={c} />
      <g fill="none" stroke={cream} strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
        <path d="M5 9 Q8.5 6.5 12 9 T19 9" />
        <path d="M5 15 Q8.5 12.5 12 15 T19 15" />
        <path d="M9 5 Q6.5 8.5 9 12 T9 19" />
        <path d="M15 5 Q18.5 8.5 15 12 T15 19" />
      </g>
    </>
  ),

  // ─── Card batch 4c — fractals (recognizable signatures) ───────────────────
  // Filled paisley/comma swirl — the dendritic Julia spiral, with a cream eye
  // at the curl centre (the spiral focus, not a decorative dot).
  'card-julia': ({ c, cream }) => (
    <>
      <path d="M5.5 17.5 C2.5 12 5.5 4.5 12.5 4.5 C18.5 4.5 20.5 11 16.5 14.8 C13.6 17.5 9 16.6 8.4 12.8 C8 10.2 10.2 8.6 12.4 9.6 C13.8 10.3 13.8 12 12.6 12.7 Z" fill={c} />
      <circle cx="11.4" cy="11.6" r="1.5" fill={cream} />
    </>
  ),
  'card-mandelbrot': ({ c }) => (
    <>
      <path d="M18 12 C18 7 13.8 4.2 10.4 6.2 C8.1 7.6 8.4 10 10.4 10.6 C8.4 11.2 8.1 13.6 10.4 15 C13.8 17 18 17 18 12 Z" fill={c} />
      <circle cx="5.4" cy="12" r="3" fill={c} />
      <line x1="1.8" y1="12" x2="2.6" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  'card-mandelbulb-2d': ({ c, cream }) => (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.6" rx="2.6" ry="5" fill={c} opacity="0.9" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3.4" fill={c} />
      <circle cx="12" cy="12" r="1.6" fill={cream} />
    </>
  ),
  'card-burning-ship': ({ c, cream }) => (
    <>
      <path d="M4 15 L20 15 L17 19.6 L7 19.6 Z" fill={c} />
      <path d="M9 15 L11 6 L13 15 Z" fill={c} />
      <path d="M13.6 15 L16 9 L18 15 Z" fill={c} opacity="0.8" />
      <path d="M11 6 L12 9 L10.2 9 Z" fill={cream} opacity="0.55" />
    </>
  ),
  'card-newton': ({ c, cream }) => (
    <>
      {[0, 120, 240].map((a, i) => (
        <path
          key={a}
          d="M12 12 C12 7 16 5.5 18 9 C19.2 11 17 13 14 12.6 Z"
          fill={i === 1 ? cream : c}
          opacity={i === 1 ? 0.6 : i === 2 ? 0.78 : 1}
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="1.6" fill={cream} />
    </>
  ),
  'card-sierpinski': ({ c, cream }) => (
    <>
      <path d="M12 3 L21 20 L3 20 Z" fill={c} />
      <path d="M7.5 11.5 L16.5 11.5 L12 20 Z" fill={cream} />
      <path d="M9.75 7.25 L14.25 7.25 L12 11.5 Z" fill={cream} />
      <path d="M5.25 15.75 L9.75 15.75 L7.5 20 Z" fill={cream} />
      <path d="M14.25 15.75 L18.75 15.75 L16.5 20 Z" fill={cream} />
    </>
  ),
  'card-orbit-trap-circle': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke={c} strokeWidth="1.6" opacity="0.7" />
      <circle cx="15.5" cy="9" r="2.6" fill={c} />
      <circle cx="15.5" cy="9" r="1" fill={cream} />
    </>
  ),

  // ─── Card batch 5a — UV-transform distortions ─────────────────────────────
  'card-translate': ({ c }) => (
    <>
      <line x1="6" y1="18" x2="16.4" y2="7.6" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M10.8 6 L18 6 L18 13.2 Z" fill={c} />
    </>
  ),
  'card-scale-uv': ({ c }) => (
    <>
      <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5.5 11 L5.5 18.5 L13 18.5 Z" fill={c} />
      <path d="M18.5 13 L18.5 5.5 L11 5.5 Z" fill={c} />
    </>
  ),
  'card-mirror-x': ({ c, cream }) => (
    <>
      <line x1="12" y1="3" x2="12" y2="21" stroke={cream} strokeWidth="1.5" strokeDasharray="2 2.4" opacity="0.7" />
      <path d="M10 7 L4 12 L10 17 Z" fill={c} />
      <path d="M14 7 L20 12 L14 17 Z" fill={c} opacity="0.5" />
    </>
  ),
  'card-mirror-y': ({ c, cream }) => (
    <>
      <line x1="3" y1="12" x2="21" y2="12" stroke={cream} strokeWidth="1.5" strokeDasharray="2 2.4" opacity="0.7" />
      <path d="M7 10 L12 4 L17 10 Z" fill={c} />
      <path d="M7 14 L12 20 L17 14 Z" fill={c} opacity="0.5" />
    </>
  ),
  'card-skew': ({ c, cream }) => (
    <>
      <path d="M8 5.5 L20.5 5.5 L16 18.5 L3.5 18.5 Z" fill={c} />
      <path d="M10.4 8 L16.2 8 L14.6 11.4 L8.8 11.4 Z" fill={cream} opacity="0.4" />
    </>
  ),
  'card-swirl': ({ c }) => (
    <path
      d="M12 12 C12 9.6 14.6 9.6 15 12 C15.6 15.2 11.6 16.8 8.6 14.6 C4.8 11.8 6.8 6.2 12 5.8 C18.2 5.3 20.8 11.6 18 16.4"
      fill="none"
      stroke={c}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  ),
  'card-fisheye': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill={c} />
      <g fill="none" stroke={cream} strokeWidth="1.4" opacity="0.55" strokeLinecap="round">
        <path d="M12 3.2 Q14.6 12 12 20.8" />
        <path d="M3.2 12 Q12 14.6 20.8 12" />
      </g>
      <circle cx="12" cy="12" r="2.4" fill={cream} opacity="0.6" />
    </>
  ),
  // polar coordinates — radial axes + concentric arcs from a corner origin
  'card-polar-warp': ({ c }) => (
    <g fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round">
      <path d="M11 20 A7 7 0 0 0 4 13" />
      <path d="M18 20 A14 14 0 0 0 4 6" />
      <line x1="4" y1="20" x2="4" y2="6.5" />
      <line x1="4" y1="20" x2="17.5" y2="20" />
      <line x1="4" y1="20" x2="14.4" y2="9.6" />
    </g>
  ),

  // ─── Card batch 5b — scalar transforms / remap ────────────────────────────
  'card-threshold-d': ({ c }) => (
    <path d="M3 17.5 L11 17.5 L11 6.5 L21 6.5" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'card-bands': ({ c }) => (
    <path d="M3 19 L7.5 19 L7.5 14.5 L12 14.5 L12 10 L16.5 10 L16.5 5.5 L21 5.5" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'card-invert-d': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill={c} />
      <path d="M12 3 A9 9 0 0 1 12 21 Z" fill={cream} />
    </>
  ),
  'card-onion': ({ c }) => (
    <g fill="none" stroke={c} strokeLinecap="round" strokeWidth="2.2">
      <path d="M3.5 18 A8.5 8.5 0 0 1 20.5 18" />
      <path d="M7 18 A5 5 0 0 1 17 18" />
      <path d="M10.2 18 A1.8 1.8 0 0 1 13.8 18" />
    </g>
  ),
  // topographic contour map — irregular nested loops bunched toward a peak,
  // distinct from the symmetric circular ripple / concentric / onion
  'card-contour': ({ c }) => (
    <g fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4.5 11 C4.5 7 9 5 13 6.5 C17.5 5 20 8.5 19.2 12 C20 16.5 15.5 19.5 11.5 18.3 C6.5 19.6 3.5 15 4.5 11 Z" />
      <path d="M9 12 C9 9.5 12 8.5 14.5 9.5 C17 9 18 11 17.2 13 C17.6 15.5 14.5 16.8 12 16 C9 16.4 8.5 14 9 12 Z" />
      <path d="M12.4 12.6 C12.4 11.4 13.9 11.1 14.7 11.9 C15.4 12.7 14.7 14 13.5 13.8 C12.6 13.8 12.3 13.1 12.4 12.6 Z" />
    </g>
  ),
  // input box → output box (a value/range mapped to another)
  'card-remap': ({ c }) => (
    <>
      <rect x="2.5" y="9.2" width="5.6" height="5.6" rx="1.3" fill={c} />
      <path d="M9.2 12 L11.4 12" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <path d="M10.9 9.9 L13.4 12 L10.9 14.1 Z" fill={c} />
      <rect x="14" y="8.2" width="7.6" height="7.6" rx="1.7" fill={c} opacity="0.7" />
    </>
  ),
  'card-power-curve': ({ c, cream }) => (
    <>
      <path d="M4 20 L4 4 M4 20 L20 20" fill="none" stroke={cream} strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
      <path d="M4 20 C11 19.5 16 14 20 4" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  'card-cubic-smoothstep': ({ c, cream }) => (
    <>
      <path d="M4 20 L4 4 M4 20 L20 20" fill="none" stroke={cream} strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
      <path d="M4 19 C9 19 9 12 12 12 C15 12 15 5 20 5" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  'card-ripple': ({ c, cream }) => (
    <>
      <g fill="none" stroke={c}>
        <circle cx="12" cy="12" r="8.5" strokeWidth="1.6" opacity="0.5" />
        <circle cx="12" cy="12" r="5.5" strokeWidth="1.9" opacity="0.75" />
        <circle cx="12" cy="12" r="2.6" strokeWidth="2.2" />
      </g>
      <circle cx="12" cy="12" r="1" fill={cream} />
    </>
  ),
  // angular repetition — identical wedges repeated around the centre
  'card-polar-repeat': ({ c }) => (
    <g fill={c}>
      {[0, 120, 240].map((a) => (
        <path key={a} d="M12 12 L12 3 A9 9 0 0 1 19.794 7.5 Z" transform={`rotate(${a} 12 12)`} />
      ))}
    </g>
  ),

  // ─── Card batch 5c — distortion stragglers ────────────────────────────────
  'card-twirl': ({ c }) => (
    <>
      <path d="M12 12 C12 10 14.6 10 14.9 12.4 C15.3 15.6 11.4 17.2 8.4 14.8 C4.6 11.8 7 6 12.2 5.8 C18.2 5.6 21 11.6 18.4 16.4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M18.4 16.4 L15.9 15.9 L18.4 13.4 Z" fill={c} />
    </>
  ),
  'card-noise-warp': ({ c }) => (
    <g fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8 L6 6 L8 9 L11 6.5 L14 9.5 L17 6 L21 8.5" />
      <path d="M3 16 L6 14 L8 17 L11 14.5 L14 17.5 L17 14 L21 16.5" />
    </g>
  ),
  'card-wave-warp': ({ c }) => (
    <g fill={c}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const h = Math.round((6 + Math.sin(i * 1.05 + 0.4) * 5) * 10) / 10;
        return <rect key={i} x={3.4 + i * 3} y={20 - h} width="2.3" height={h} rx="1.1" />;
      })}
    </g>
  ),
  'card-mirror-domain': ({ c, cream }) => (
    <>
      <line x1="12" y1="3" x2="12" y2="21" stroke={cream} strokeWidth="1.2" opacity="0.4" />
      <line x1="3" y1="12" x2="21" y2="12" stroke={cream} strokeWidth="1.2" opacity="0.4" />
      <path d="M12 12 L19 7 L19 11 Z" fill={c} />
      <path d="M12 12 L5 7 L5 11 Z" fill={c} />
      <path d="M12 12 L19 17 L19 13 Z" fill={c} />
      <path d="M12 12 L5 17 L5 13 Z" fill={c} />
    </>
  ),
  'card-mirror-repeat': ({ c, cream }) => (
    <>
      <path d="M3 7 L8 12 L3 17 Z" fill={c} />
      <path d="M11 7 L6 12 L11 17 Z" fill={cream} opacity="0.55" />
      <path d="M13 7 L18 12 L13 17 Z" fill={c} />
      <path d="M21 7 L16 12 L21 17 Z" fill={cream} opacity="0.55" />
    </>
  ),
  'card-zoom-blur-uv': ({ c }) => (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line key={a} x1="12" y1="4.5" x2="12" y2="8.8" stroke={c} strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.6" fill={c} />
    </>
  ),
  'card-sin-wave-d': ({ c, cream }) => (
    <>
      <path d="M4 20 L4 4 M4 20 L20 20" fill="none" stroke={cream} strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
      <path d="M4 12 C6 6 8 6 10 12 C12 18 14 18 16 12 C17 9 19 9.5 20 11" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  'card-antialiased-step': ({ c, cream }) => (
    <>
      <path d="M4 20 L4 4 M4 20 L20 20" fill="none" stroke={cream} strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
      <path d="M5 17 L10 17 C11.5 17 11.5 7 13 7 L20 7" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  'card-sigmoid-curve': ({ c, cream }) => (
    <>
      <path d="M4 20 L4 4 M4 20 L20 20" fill="none" stroke={cream} strokeWidth="1.3" opacity="0.4" strokeLinecap="round" />
      <path d="M4 18 C9.5 18 9 6 12 6 C15 6 14.5 6 20 6" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  // smooth union — two lobes fused by a concave waist (the metaball signature)
  'card-smooth-min-d': ({ c }) => (
    <path d="M4.5 12 C4.5 9 6.6 7.2 9 7.4 C10.6 7.5 11.3 8.5 12 8.5 C12.7 8.5 13.4 7.5 15 7.4 C17.4 7.2 19.5 9 19.5 12 C19.5 15 17.4 16.8 15 16.6 C13.4 16.5 12.7 15.5 12 15.5 C11.3 15.5 10.6 16.5 9 16.6 C6.6 16.8 4.5 15 4.5 12 Z" fill={c} />
  ),
  // a squircle settling toward its target circle (smooth-blend toward round)
  'card-smooth-min-to-circle': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={cream} strokeWidth="1.4" opacity="0.5" />
      <path d="M5 9.5 C5 6.4 6.4 5 9.5 5 L14.5 5 C17.6 5 19 6.4 19 9.5 L19 14.5 C19 17.6 17.6 19 14.5 19 L9.5 19 C6.4 19 5 17.6 5 14.5 Z" fill={c} />
    </>
  ),
  // smooth intersection — two SHARP square outlines; their overlap is filled
  // corner-to-corner as a softly-rounded square (smooth seam, sharp elsewhere)
  'card-smooth-intersection': ({ c }) => (
    <>
      <rect x="3" y="3" width="12" height="12" fill="none" stroke={c} strokeWidth="1.7" opacity="0.5" />
      <rect x="9" y="9" width="12" height="12" fill="none" stroke={c} strokeWidth="1.7" opacity="0.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.7" fill={c} />
    </>
  ),

  // ─── Card colors (REAL hues — this category is literally about colour) ─────
  // a single vivid colour chip with a glossy highlight
  'card-solid-color': () => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.6" fill="#3B79C9" />
      <rect x="6.8" y="6.6" width="5" height="2.4" rx="1.2" fill="#ffffff" opacity="0.5" />
    </>
  ),
  // palette — a smooth gradient between two colours
  'card-palette': () => (
    <>
      <defs>
        <linearGradient id="iv2g-pal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3B79C9" />
          <stop offset="0.5" stopColor="#8A5BCB" />
          <stop offset="1" stopColor="#EE8B3A" />
        </linearGradient>
      </defs>
      <rect x="3" y="7.5" width="18" height="9" rx="2.4" fill="url(#iv2g-pal)" />
    </>
  ),
  // cosine palette — a full-spectrum ramp with a cosine wave
  'card-cosine-palette': () => (
    <>
      <defs>
        <linearGradient id="iv2g-cos" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E0563D" />
          <stop offset="0.33" stopColor="#EFC250" />
          <stop offset="0.66" stopColor="#5BAE54" />
          <stop offset="1" stopColor="#3B79C9" />
        </linearGradient>
      </defs>
      <rect x="3" y="7.5" width="18" height="9" rx="2.4" fill="url(#iv2g-cos)" />
      <path d="M3 12 C6 9 9 9 12 12 C15 15 18 15 21 12" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
    </>
  ),
  // triple gradient — three distinct colour stops
  'card-triple-gradient': () => (
    <>
      <clipPath id="iv2c-tri"><rect x="3" y="7.5" width="18" height="9" rx="2.4" /></clipPath>
      <g clipPath="url(#iv2c-tri)">
        <rect x="3" y="7.5" width="6" height="9" fill="#E0563D" />
        <rect x="9" y="7.5" width="6" height="9" fill="#5BAE54" />
        <rect x="15" y="7.5" width="6" height="9" fill="#3B79C9" />
      </g>
    </>
  ),
  // themed — a painter's palette (thumb-hole + preset dabs); a distinct
  // silhouette vs the triple-gradient bar
  'card-palette-themed': () => (
    <>
      <path fillRule="evenodd" d="M21 12 a9 7.5 0 1 0 -18 0 a9 7.5 0 1 0 18 0 M9.3 15.6 a1.7 1.7 0 1 0 -3.4 0 a1.7 1.7 0 1 0 3.4 0" fill="#E0CDA0" />
      <circle cx="10.4" cy="8.8" r="1.9" fill="#E0563D" />
      <circle cx="15.4" cy="10" r="1.9" fill="#3B79C9" />
      <circle cx="14" cy="14.4" r="1.9" fill="#EFC250" />
    </>
  ),
  // duotone — a square split on the diagonal into two colours
  'card-duotone': () => (
    <>
      <clipPath id="iv2c-duo"><rect x="4" y="4" width="16" height="16" rx="3.4" /></clipPath>
      <g clipPath="url(#iv2c-duo)">
        <rect x="4" y="4" width="16" height="16" fill="#EE8B3A" />
        <path d="M4 4 L20 20 L4 20 Z" fill="#3B79C9" />
      </g>
    </>
  ),
  // split tone — warm highlights (top) vs cool shadows (bottom)
  'card-split-tone': () => (
    <>
      <clipPath id="iv2c-spl"><rect x="4" y="4" width="16" height="16" rx="3.4" /></clipPath>
      <g clipPath="url(#iv2c-spl)">
        <rect x="4" y="4" width="16" height="8" fill="#EFA94A" />
        <rect x="4" y="12" width="16" height="8" fill="#2F7FB0" />
      </g>
    </>
  ),
  // tritone — shadows / mids / highlights as three colour bands
  'card-tritone': () => (
    <>
      <clipPath id="iv2c-trit"><rect x="4" y="4" width="16" height="16" rx="3.4" /></clipPath>
      <g clipPath="url(#iv2c-trit)">
        <rect x="4" y="4" width="16" height="5.34" fill="#EFC250" />
        <rect x="4" y="9.34" width="16" height="5.33" fill="#D8559E" />
        <rect x="4" y="14.66" width="16" height="5.34" fill="#3B3F8A" />
      </g>
    </>
  ),
  // four-corner (bilinear) gradient — four colours, one per quadrant
  'card-four-gradient': () => (
    <>
      <clipPath id="iv2c-four"><rect x="4" y="4" width="16" height="16" rx="3.4" /></clipPath>
      <g clipPath="url(#iv2c-four)">
        <rect x="4" y="4" width="8" height="8" fill="#E0563D" />
        <rect x="12" y="4" width="8" height="8" fill="#EFC250" />
        <rect x="4" y="12" width="8" height="8" fill="#33A7B5" />
        <rect x="12" y="12" width="8" height="8" fill="#8A5BCB" />
      </g>
    </>
  ),
  // grayscale — colour on one half, neutral grey on the other
  'card-grayscale': () => (
    <>
      <circle cx="12" cy="12" r="8" fill="#9E9E9E" />
      <path d="M12 4 A8 8 0 0 0 12 20 Z" fill="#E0563D" />
    </>
  ),
  // sepia — a warmly brown-toned little photo (sun over hills)
  'card-sepia': () => (
    <>
      <clipPath id="iv2c-sep"><rect x="3.5" y="5" width="17" height="14" rx="2.6" /></clipPath>
      <g clipPath="url(#iv2c-sep)">
        <rect x="3.5" y="5" width="17" height="14" fill="#A87A45" />
        <circle cx="8" cy="9.5" r="2.1" fill="#E6CB95" />
        <path d="M3.5 19 L9.5 13 L13.5 16.5 L16.5 13.5 L20.5 17.5 L20.5 19 Z" fill="#6E4A26" />
      </g>
    </>
  ),
  // saturate — a vivid droplet (pale → saturated)
  'card-saturate': () => (
    <>
      <defs>
        <linearGradient id="iv2g-sat" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#F3C2DC" />
          <stop offset="1" stopColor="#CE2080" />
        </linearGradient>
      </defs>
      <path d="M12 3 C12 3 19 10.6 19 15.2 A7 7 0 0 1 5 15.2 C5 10.6 12 3 12 3 Z" fill="url(#iv2g-sat)" />
      <path d="M8.6 14.8 A3.4 3.4 0 0 0 11.6 17.8" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  // hue shift — a real colour wheel with a rotation arrow
  'card-hue-shift': () => (
    <>
      {['#E0563D', '#EE9B3A', '#EFC83F', '#5BAE54', '#33A7B5', '#3B79C9', '#8A5BCB', '#D8559E'].map((col, i) => (
        <path key={i} d="M12 12 L12 4 A8 8 0 0 1 17.66 6.34 Z" fill={col} transform={`rotate(${i * 45} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3" fill="#FBF6EA" />
      <path d="M7.3 10.3 A5 5 0 0 1 16.7 10.3" fill="none" stroke="#2c2a25" strokeWidth="3.6" strokeLinecap="round" opacity="0.38" />
      <path d="M7.3 10.3 A5 5 0 0 1 16.7 10.3" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M15 10.4 L18.4 10.4 L16.7 13.1 Z" fill="#ffffff" stroke="#2c2a25" strokeWidth="0.7" strokeLinejoin="round" strokeOpacity="0.38" />
    </>
  ),
  // hue cycle — the same colour wheel, slowly turning
  'card-hue-cycle': () => (
    <g className="iv2-spin">
      {['#E0563D', '#EE9B3A', '#EFC83F', '#5BAE54', '#33A7B5', '#3B79C9', '#8A5BCB', '#D8559E'].map((col, i) => (
        <path key={i} d="M12 12 L12 4 A8 8 0 0 1 17.66 6.34 Z" fill={col} transform={`rotate(${i * 45} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3.1" fill="#FBF6EA" />
    </g>
  ),
  // rainbow — real concentric spectrum arcs
  'card-rainbow-d': () => (
    <g fill="none" strokeLinecap="round" strokeWidth="2.1">
      <path d="M3.5 18 A8.5 8.5 0 0 1 20.5 18" stroke="#E0563D" />
      <path d="M6 18 A6 6 0 0 1 18 18" stroke="#EFC250" />
      <path d="M8.5 18 A3.5 3.5 0 0 1 15.5 18" stroke="#5BAE54" />
      <path d="M10.7 18 A1.3 1.3 0 0 1 13.3 18" stroke="#3B79C9" />
    </g>
  ),
  // distance as RGB — three additive R/G/B channels overlapping
  'card-d-as-rgb': () => (
    <>
      <circle cx="12" cy="9" r="5.4" fill="#E24A4A" opacity="0.82" />
      <circle cx="8.5" cy="14.8" r="5.4" fill="#3FA64F" opacity="0.82" />
      <circle cx="15.5" cy="14.8" r="5.4" fill="#3B79C9" opacity="0.82" />
    </>
  ),
  // material colour — a shaded 3D sphere with a specular highlight
  'card-material-color-3d': () => (
    <>
      <defs>
        <radialGradient id="iv2g-mat" cx="0.38" cy="0.34" r="0.78">
          <stop offset="0" stopColor="#86B7E8" />
          <stop offset="0.6" stopColor="#3B79C9" />
          <stop offset="1" stopColor="#23497F" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="8.2" fill="url(#iv2g-mat)" />
      <ellipse cx="9.2" cy="9" rx="2.4" ry="1.6" fill="#ffffff" opacity="0.75" transform="rotate(-32 9.2 9)" />
    </>
  ),

  // ─── Card effects (38; built + collision-audited via workflow) ───────────
  // A film strip (perforated frame) with a bold S-curve threading through it — the cinematic ACES reference look.
  'card-aces-tonemap': ({ c, cream }) => (
    <><rect x="4.6" y="3.4" width="14.8" height="17.2" rx="2.4" fill={c} /><rect x="6" y="4.9" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="6" y="8.7" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="6" y="12.5" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="6" y="16.3" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="16.3" y="4.9" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="16.3" y="8.7" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="16.3" y="12.5" width="1.7" height="1.7" rx="0.5" fill={cream} /><rect x="16.3" y="16.3" width="1.7" height="1.7" rx="0.5" fill={cream} /><path d="M9.3 18 C9.3 14.6 11 14 12 12 C13 10 14.7 9.4 14.7 6" fill="none" stroke={cream} strokeWidth="2.2" strokeLinecap="round" /></>
  ),
  // A solid S-shaped tone wedge — a luminance ramp rolled off at both ends (toe + shoulder) into one filled, soft 
  // film strip with a bright exposed centre frame (the legacy cinema look)
  'card-filmic-tonemap': ({ c, cream, ink }) => (
    <>
      <rect x="2.4" y="5.4" width="19.2" height="13.2" rx="1.6" fill={c} />
      <rect x="2.4" y="5.4" width="19.2" height="2.4" fill={ink} opacity="0.4" />
      <rect x="2.4" y="16.2" width="19.2" height="2.4" fill={ink} opacity="0.4" />
      {[4.5, 8.4, 12, 15.6, 19.5].map((x, i) => (
        <rect key={`t${i}`} x={x - 0.8} y="6" width="1.6" height="1.3" rx="0.3" fill={cream} />
      ))}
      {[4.5, 8.4, 12, 15.6, 19.5].map((x, i) => (
        <rect key={`b${i}`} x={x - 0.8} y="16.8" width="1.6" height="1.3" rx="0.3" fill={cream} />
      ))}
      <line x1="8.7" y1="7.8" x2="8.7" y2="16.2" stroke={ink} strokeWidth="0.8" opacity="0.3" />
      <line x1="15.3" y1="7.8" x2="15.3" y2="16.2" stroke={ink} strokeWidth="0.8" opacity="0.3" />
      <circle cx="12" cy="12" r="2.6" fill={cream} />
      <circle cx="12" cy="12" r="1.2" fill={c} />
    </>
  ),
  // A curve that climbs steeply then flattens hard against a ceiling bar — x/(1+x) compression saturating at its a
  'card-reinhard-tonemap': ({ c, cream }) => (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.6" fill="none" stroke={cream} strokeWidth="1.2" opacity="0.35" />
      <path d="M4 6.5 L20 6.5" stroke={cream} strokeWidth="1.3" strokeDasharray="2 2" opacity="0.7" />
      <path d="M4 20 C5.6 13 8 8.6 12 7.3 C15.5 6.7 18 6.7 20 6.7" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  // A camera aperture iris (six blades around a bright center) — opening up exposure / stops of light.
  'card-exposure': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill={c} />
      <path d="M16 12 L14 15.46 L10 15.46 L8 12 L10 8.54 L14 8.54 Z" fill={cream} />
      <g stroke={cream} strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line key={a} x1="16" y1="12" x2="19.09" y2="17.54" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
    </>
  ),
  // The Greek letter gamma (γ) — the literal symbol of the gamma transfer function.
  'card-gamma': ({ c, cream }) => (
    <><path d="M4.2 5.2 C4.2 4.4 4.9 3.8 5.8 3.8 C6.6 3.8 7.2 4.2 7.5 4.9 L10.5 12 L13.6 4.7 C13.9 3.9 14.7 3.5 15.5 3.8 C16.4 4.1 16.8 5 16.4 5.9 L12.1 15.6 L12.1 19.6 C12.1 20.5 11.4 21.2 10.5 21.2 C9.6 21.2 8.9 20.5 8.9 19.6 L8.9 14.4 L5.5 6.4 C5.4 6.1 5.2 5.9 5 5.7 Z" fill={c} /><circle cx="15" cy="5.3" r="1.5" fill={cream} /></>
  ),
  // A square split on the diagonal into two luminance ramps — flat linear values on one half, encoded sRGB values 
  'card-linear-to-srgb': ({ c, cream }) => (
    <><clipPath id="iv2e-l2s-clip"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.2"/></clipPath><g clipPath="url(#iv2e-l2s-clip)"><rect x="3.6" y="3.6" width="16.8" height="16.8" fill={c} opacity="0.32"/><rect x="3.6" y="15.4" width="8.4" height="5" fill={c}/><rect x="3.6" y="10.6" width="8.4" height="4.8" fill={c} opacity="0.7"/><rect x="3.6" y="6.4" width="8.4" height="4.2" fill={c} opacity="0.45"/><rect x="12" y="3.6" width="8.4" height="16.8" fill={cream} opacity="0.22"/><rect x="12" y="16.4" width="8.4" height="4" fill={c}/><rect x="12" y="11.8" width="8.4" height="4.6" fill={c} opacity="0.62"/><rect x="12" y="6" width="8.4" height="5.8" fill={c} opacity="0.3"/></g><path d="M9.6 12 L14.4 12 M12.4 9.8 L14.8 12 L12.4 14.2" fill="none" stroke={cream} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></>
  ),
  // A disc split straight down the middle — one half dark tint, one half cream — pure light-vs-dark contrast.
  'card-contrast': ({ c, cream }) => (
    <><circle cx="12" cy="12" r="9" fill={c}/><path d="M12 3 A9 9 0 0 1 12 21 L12 16 L9.4 16 L9.4 13 L12 13 L12 8 L9.4 8 L9.4 5 L12 5 Z" fill={cream}/></>
  ),
  // A sun with short rays being darkened by a scrim, with a downward arrow — brightness turned down.
  'card-dim': ({ c, cream }) => (
    <><g stroke={c} strokeWidth="1.7" strokeLinecap="round"><line x1="11" y1="2.4" x2="11" y2="4.2"/><line x1="4.8" y1="5" x2="6" y2="6.2"/><line x1="2.4" y1="11" x2="4.2" y2="11"/></g><circle cx="11" cy="11" r="5.6" fill={c}/><path d="M11 5.4 A5.6 5.6 0 0 1 11 16.6 A5.6 5.6 0 0 0 11 5.4 Z" fill={cream} opacity="0.5"/><path d="M18 11.4 L18 19.6 M14.6 16 L18 19.8 L21.4 16" fill="none" stroke={cream} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/></>
  ),
  // An over-bright core orb with soft light lobes bleeding/blooming past its edges.
  'card-bloom': ({ c, cream }) => (
    <><defs><radialGradient id="iv2e-bloom" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={cream} stopOpacity="0.9"/><stop offset="0.5" stopColor={c} stopOpacity="0.5"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="url(#iv2e-bloom)"/><path d="M12 1.6 L13 9.4 L12 12 L11 9.4 Z" fill={cream} opacity="0.85"/><path d="M12 22.4 L13 14.6 L12 12 L11 14.6 Z" fill={cream} opacity="0.85"/><path d="M1.6 12 L9.4 11 L12 12 L9.4 13 Z" fill={cream} opacity="0.85"/><path d="M22.4 12 L14.6 11 L12 12 L14.6 13 Z" fill={cream} opacity="0.85"/><circle cx="12" cy="12" r="4.3" fill={c}/><circle cx="12" cy="12" r="2.2" fill={cream}/></>
  ),
  // A solid object hugged by one smooth soft aura — uniform halo around a shape.
  'card-glow': ({ c, cream }) => (
    <><defs><radialGradient id="iv2e-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0.42" stopColor={c} stopOpacity="0.62"/><stop offset="0.7" stopColor={c} stopOpacity="0.28"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="11" fill="url(#iv2e-glow)"/><circle cx="12" cy="12" r="5" fill={c}/><circle cx="12" cy="12" r="2.2" fill={cream} opacity="0.85"/></>
  ),
  // A corner sun casting wide tapered light shafts fanning diagonally across the frame.
  'card-god-rays': ({ c, cream }) => (
    <>
      <g fill={c}>
        <path d="M3.5 3.5 L22 8 L22 11 Z" opacity="0.85" />
        <path d="M3.5 3.5 L21 14.5 L18 17.5 Z" opacity="0.5" />
        <path d="M3.5 3.5 L11.5 22 L8 22 Z" opacity="0.7" />
        <path d="M3.5 3.5 L18 10.5 L14 14.5 Z" fill={cream} opacity="0.45" />
      </g>
      <circle cx="3.6" cy="3.6" r="3.8" fill={cream} />
      <circle cx="3.6" cy="3.6" r="2.1" fill={c} />
    </>
  ),
  // Soft tapered streaks smeared radially outward from a blurred center — a zoom-blur wash.
  'card-radial-blur-fake': ({ c, cream }) => (
    <>
      <defs>
        <radialGradient id="iv2e-radwash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.15" stopColor={c} />
          <stop offset="1" stopColor={c} stopOpacity="0.05" />
        </radialGradient>
      </defs>
      <g fill="url(#iv2e-radwash)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M12 12 L10.1 2.6 L13.9 2.6 Z" transform={`rotate(${a} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2.6" fill={c} />
      <circle cx="12" cy="12" r="1.1" fill={cream} />
    </>
  ),
  // A cursor arrow resting on a soft radial glow pool that follows it.
  'card-mouse-glow': ({ c, cream }) => (
    <><defs>
        <radialGradient id="iv2e-mglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c} stopOpacity="0.7" />
          <stop offset="0.6" stopColor={c} stopOpacity="0.3" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the glow pool under the cursor */}
      <circle cx="10" cy="11" r="9" fill="url(#iv2e-mglow)" />
      {/* arrow cursor — the unmistakable signature */}
      <path d="M8.4 4.6 L18.6 12.2 L13.4 12.9 L16.2 18.2 L13.4 19.6 L10.6 14.2 L7 17.4 Z" fill={c} />
      <path d="M9.7 7.1 L14.4 10.6 L11.4 11 Z" fill={cream} opacity="0.7" /></>
  ),
  // A shaded sphere lit from upper-left with one tight, crisp cream specular hot-spot.
  'card-blinn-phong': ({ c, cream }) => (
    <>
      <defs>
        <radialGradient id="iv2e-blinn-phong" cx="0.35" cy="0.32" r="0.85">
          <stop offset="0" stopColor={c} stopOpacity="0.45" />
          <stop offset="0.55" stopColor={c} />
          <stop offset="1" stopColor={c} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12.5" r="8" fill="url(#iv2e-blinn-phong)" />
      <line x1="2.6" y1="2.6" x2="7" y2="7" stroke={cream} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M2.6 5 L2.6 2.6 L5 2.6" fill="none" stroke={cream} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.6" cy="9.2" r="2.4" fill={cream} />
    </>
  ),
  // A dark sphere silhouetted against a back light, with a bright cream crescent hugging one edge.
  'card-rim-light': ({ c, cream }) => (
    <><circle cx="12" cy="12" r="8.4" fill={c}/><path d="M15.2 5.8 A6.6 6.6 0 0 1 15.2 18.2" fill="none" stroke={cream} strokeWidth="2.8" strokeLinecap="round"/><path d="M19.4 8.6 L21.4 7 M20.4 12 L22.6 12 M19.4 15.4 L21.4 17" stroke={cream} strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/></>
  ),
  // A sphere with a bright glowing rim all the way around (edge brightens at grazing angle) and an eye watching it
  'card-fresnel': ({ c, cream }) => (
    <><circle cx="12" cy="11" r="7.6" fill={cream}/><circle cx="12" cy="11" r="5.4" fill={c}/><path d="M5 20.6 C7.6 17.4 16.4 17.4 19 20.6 C16.4 23.8 7.6 23.8 5 20.6 Z" fill={c}/><circle cx="12" cy="20.6" r="2" fill={cream}/></>
  ),
  // A cube sitting in a wall corner with darkening pooled into the crease where the surfaces meet.
  'card-ambient-occlusion': ({ c, cream }) => (
    <><defs><linearGradient id="iv2e-ambient-occlusion" x1="0" y1="1" x2="0.55" y2="0.45"><stop offset="0" stopColor={c}/><stop offset="1" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d="M3.4 3.4 L6.4 3.4 L6.4 17.6 L20.6 17.6 L20.6 20.6 L3.4 20.6 Z" fill={c}/><rect x="9" y="6" width="9" height="9" rx="1.4" fill={cream}/><path d="M3.4 20.6 L3.4 3.4 L9 3.4 C7 9 7 15 3.4 20.6 Z" fill="url(#iv2e-ambient-occlusion)" opacity="0.85"/><path d="M3.4 20.6 L20.6 20.6 L20.6 15 C15 17 9 17 3.4 20.6 Z" fill="url(#iv2e-ambient-occlusion)" opacity="0.85"/></>
  ),
  // A sphere resting on a floor with a dark contact shadow pooled tightly directly beneath it.
  'card-sphere-ao': ({ c, cream }) => (
    <><defs><radialGradient id="iv2e-sphere-ao" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor={c}/><stop offset="0.6" stopColor={c} stopOpacity="0.75"/><stop offset="1" stopColor={c} stopOpacity="0"/></radialGradient></defs><line x1="3" y1="17.4" x2="21" y2="17.4" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity="0.45"/><ellipse cx="12" cy="18.2" rx="7.2" ry="2.4" fill="url(#iv2e-sphere-ao)"/><circle cx="12" cy="10.6" r="6.6" fill={cream}/><circle cx="12" cy="10.6" r="6.6" fill={c} opacity="0.12"/></>
  ),
  // A small disc casting a long, blurred, fading penumbra shadow offset to one side on the ground.
  'card-soft-shadow': ({ c, cream }) => (
    <><defs><linearGradient id="iv2e-soft-shadow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={c}/><stop offset="1" stopColor={c} stopOpacity="0"/></linearGradient></defs><path d="M3.6 6.2 L5.4 4.7" stroke={cream} strokeWidth="1.7" strokeLinecap="round" opacity="0.7"/><ellipse cx="14.4" cy="18" rx="7" ry="2.7" fill="url(#iv2e-soft-shadow)" transform="rotate(8 14.4 18)"/><circle cx="9.4" cy="10.2" r="4.6" fill={c}/><circle cx="7.9" cy="8.7" r="1.5" fill={cream} opacity="0.7"/></>
  ),
  // a solid photo tile carrying a few bold chunky monochrome grain clumps
  'card-grain': ({ c, cream }) => (
    <><rect x="3" y="3" width="18" height="18" rx="3.6" fill={c} /><path d="M6.6 6 L9.4 6.8 L8.4 9.4 L5.8 8.6 Z" fill={cream} /><path d="M14.4 5.6 L17 6.4 L16 8.6 L13.6 7.8 Z" fill={cream} opacity="0.7" /><path d="M9.2 11.6 L12.4 12.2 L11.6 15.2 L8.4 14.6 Z" fill={cream} /><path d="M16.2 12.4 L18.4 13 L17.4 15.4 L15.2 14.8 Z" fill={cream} opacity="0.7" /><path d="M5.4 16.6 L8 17.2 L7.2 19.4 L4.8 18.8 Z" fill={cream} opacity="0.85" /><path d="M12.6 17 L15 17.6 L14.2 19.6 L11.8 19 Z" fill={cream} opacity="0.6" /></>
  ),
  // a vertical 35mm film strip with sprocket holes and R/G/B colour frames
  'card-film-grain-color': ({ c, cream }) => (
    <><rect x="6" y="3" width="12" height="18" rx="2" fill={c} /><g fill={cream}><rect x="7" y="4.2" width="1.8" height="2" rx="0.6" /><rect x="7" y="8" width="1.8" height="2" rx="0.6" /><rect x="7" y="11.8" width="1.8" height="2" rx="0.6" /><rect x="7" y="15.6" width="1.8" height="2" rx="0.6" /><rect x="15.2" y="4.2" width="1.8" height="2" rx="0.6" /><rect x="15.2" y="8" width="1.8" height="2" rx="0.6" /><rect x="15.2" y="11.8" width="1.8" height="2" rx="0.6" /><rect x="15.2" y="15.6" width="1.8" height="2" rx="0.6" /></g><rect x="9.4" y="4.6" width="5.2" height="4.4" rx="0.8" fill="#E24A4A" /><rect x="9.4" y="9.8" width="5.2" height="4.4" rx="0.8" fill="#3FA64F" /><rect x="9.4" y="15" width="5.2" height="4.4" rx="0.8" fill="#3B79C9" /></>
  ),
  // a translucent noise sheet laid over a base tile (two offset stacked layers)
  // overlay noise — a base image layer with a REAL procedural-grain sheet on top
  'card-overlay-noise': ({ c, cream }) => (
    <>
      <defs>
        <filter id="iv2e-onoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="11" stitchTiles="stitch" result="t" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 1 1 0 -1.7" result="a" />
          <feFlood floodColor={cream} result="f" />
          <feComposite in="f" in2="a" operator="in" />
        </filter>
        <clipPath id="iv2e-onoise-clip"><rect x="8" y="4.5" width="13" height="13" rx="3" /></clipPath>
      </defs>
      <rect x="3" y="6.5" width="13" height="13" rx="3" fill={c} />
      <g clipPath="url(#iv2e-onoise-clip)">
        <rect x="8" y="4.5" width="13" height="13" fill={c} opacity="0.5" />
        <rect x="8" y="4.5" width="13" height="13" filter="url(#iv2e-onoise)" />
      </g>
    </>
  ),
  // a tile ramping from solid into an ordered checkerboard (the Bayer dither gradient)
  'card-dither': ({ c, cream }) => (
    <><clipPath id="iv2e-card-dither"><rect x="3" y="3" width="18" height="18" rx="3.6" /></clipPath><g clipPath="url(#iv2e-card-dither)"><rect x="3" y="3" width="18" height="18" fill={c} /><g fill={cream}><rect x="12" y="3" width="3" height="3" /><rect x="18" y="3" width="3" height="3" /><rect x="15" y="6" width="3" height="3" /><rect x="12" y="9" width="3" height="3" /><rect x="18" y="9" width="3" height="3" /><rect x="15" y="12" width="3" height="3" /><rect x="12" y="15" width="3" height="3" /><rect x="18" y="15" width="3" height="3" /><rect x="15" y="18" width="3" height="3" /><rect x="9" y="6" width="3" height="3" /><rect x="9" y="12" width="3" height="3" /><rect x="9" y="18" width="3" height="3" /></g></g></>
  ),
  // A 4x4 grid of solid dots that grow from tiny to large across the tile — a newspaper halftone luminance ramp.
  'card-halftone': ({ c }) => (
    <>{[[5,5,0.6],[10,5,1.0],[14.5,5,1.4],[19,5,1.9],[5,10,1.0],[10,10,1.4],[14.5,10,1.9],[19,10,2.3],[5,14.5,1.4],[10,14.5,1.9],[14.5,14.5,2.3],[19,14.5,2.8],[5,19,1.9],[10,19,2.3],[14.5,19,2.8],[19,19,3.1]].map(([x, y, r], i) => (<circle key={i} cx={x} cy={y} r={r} fill={c} />))}</>
  ),
  // A bold capital 'A' letterform seated in a character cell — text/typography stands in for ASCII art.
  // an ASCII-art "A" (figlet). Each row is CENTERED (textAnchor=middle) so the
  // symmetric figlet aligns into an A without relying on leading-space preservation.
  'card-ascii': ({ c }) => (
    <g fill={c} fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" fontSize="4.6" fontWeight="700" textAnchor="middle">
      <text x="12" y="7.6">db</text>
      <text x="12" y="12.3">dPYb</text>
      <text x="12" y="17">dP__Yb</text>
      <text x="12" y="21.7">{'dP""""Yb'}</text>
    </g>
  ),
  // A chunky pencil drawn diagonally over a patch of cross-hatch strokes — hand-drawn pencil sketch.
  'card-sketch': ({ c, cream }) => (
    <>
      <g stroke={c} strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
        <line x1="3.2" y1="16.6" x2="6.4" y2="19.8" />
        <line x1="3.2" y1="19" x2="4.8" y2="20.6" />
      </g>
      <path d="M16.8 4.4 L19.6 7.2 L9.7 17.1 L6.9 14.3 Z" fill={c} />
      <path d="M18.6 2.6 L21.4 5.4 L19.6 7.2 L16.8 4.4 Z" fill={cream} />
      <path d="M9.7 17.1 L6.9 14.3 L5 19 Z" fill={cream} />
      <path d="M8.2 17.4 L7.1 16 L5 19 Z" fill={c} />
    </>
  ),
  // A solid blob whose outline is traced by a bright glowing rim while its interior is knocked back — only the edg
  'card-edge-detect': ({ c, cream, ink }) => (
    <><path d="M11 3.6 C15.4 2.9 20.4 5.4 20.6 10 C20.8 14.2 18.4 16.2 16.6 18.4 C14.6 20.8 10.4 21.8 7 20 C3.4 18.1 2.8 13.4 4.4 9.6 C5.8 6.2 7.6 4.1 11 3.6 Z" fill={c} />
      <path d="M11 6.4 C13.9 5.95 17.4 7.5 17.6 10.4 C17.75 13 16.2 14.4 14.9 16 C13.4 17.8 10.7 18.5 8.4 17.3 C6 16.1 5.7 13 6.8 10.6 C7.7 8.5 8.8 6.75 11 6.4 Z" fill={ink} opacity="0.85" />
      <path d="M11 3.6 C15.4 2.9 20.4 5.4 20.6 10 C20.8 14.2 18.4 16.2 16.6 18.4 C14.6 20.8 10.4 21.8 7 20 C3.4 18.1 2.8 13.4 4.4 9.6 C5.8 6.2 7.6 4.1 11 3.6 Z M11 6.4 C13.9 5.95 17.4 7.5 17.6 10.4 C17.75 13 16.2 14.4 14.9 16 C13.4 17.8 10.7 18.5 8.4 17.3 C6 16.1 5.7 13 6.8 10.6 C7.7 8.5 8.8 6.75 11 6.4 Z" fill={cream} fillRule="evenodd" /></>
  ),
  // A CRT tube screen whose four edges bow outward in a fat pillow/barrel, with a curved glass-glare swipe.
  'card-crt-curvature': ({ c, cream }) => (
    <><path d="M3 6 C8 4.4 16 4.4 21 6 C19.4 10 19.4 14 21 18 C16 19.6 8 19.6 3 18 C4.6 14 4.6 10 3 6 Z" fill={c} />
      <path d="M6.4 8.2 C9.3 7.4 14.7 7.4 17.6 8.2 C16.9 10.7 16.9 13.3 17.6 15.8 C14.7 16.6 9.3 16.6 6.4 15.8 C7.1 13.3 7.1 10.7 6.4 8.2 Z" fill={cream} opacity="0.28" />
      <path d="M6.8 8.6 C9.2 7.9 11.8 7.7 13.6 7.9" fill="none" stroke={cream} strokeWidth="1.9" strokeLinecap="round" /></>
  ),
  // Tape tracking error: a stack of horizontal scanline bars shoved sideways at random offsets, with one bright cr
  'card-vhs-glitch': ({ c, cream }) => (
    <>
      <clipPath id="iv2e-vhs"><rect x="3" y="4.5" width="18" height="15" rx="2.6" /></clipPath>
      <g clipPath="url(#iv2e-vhs)">
        <rect x="3" y="4.5" width="18" height="15" fill={c} />
        <rect x="3" y="7" width="18" height="1" fill={c} opacity="0.45" />
        <rect x="6.5" y="9" width="16" height="3" fill={cream} />
        <rect x="4.6" y="9" width="1.9" height="3" fill="#E0463F" />
        <rect x="-1" y="14.4" width="13.5" height="2.6" fill={cream} opacity="0.55" />
        <rect x="12.5" y="14.4" width="1.9" height="2.6" fill="#3B6BE0" />
      </g>
    </>
  ),
  // One screen element split into its colour channels: a red ghost shifted left, a blue ghost shifted right, the p
  'card-chromatic-aberration': ({ c, cream }) => (
    <><rect x="4.4" y="4.5" width="9" height="15" rx="3.3" fill="#E0463F" />
      <rect x="10.6" y="4.5" width="9" height="15" rx="3.3" fill="#3B6BE0" />
      <rect x="7.5" y="4.5" width="9" height="15" rx="3.3" fill={c} />
      <rect x="9" y="8" width="6" height="2.4" rx="1.2" fill={cream} /></>
  ),
  // Three bold drifting horizontal mist banks, stacked and offset like rolling fog layers.
  // fog — depth-faded mountains rising out of a soft horizontal mist band
  'card-fog': ({ c, cream }) => (
    <>
      <defs>
        <linearGradient id="iv2e-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cream} stopOpacity="0" />
          <stop offset="0.45" stopColor={cream} stopOpacity="0.9" />
          <stop offset="1" stopColor={cream} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g fill={c}>
        <path d="M3 20.5 L9 9 L15 20.5 Z" opacity="0.4" />
        <path d="M11 20.5 L17.5 11 L24 20.5 Z" opacity="0.6" />
        <path d="M-1 20.5 L6 13 L13 20.5 Z" />
      </g>
      <rect x="0" y="13.5" width="24" height="7" fill="url(#iv2e-fog)" />
    </>
  ),
  // A clear bright core swallowed by a dense lumpy cloud — bright centre, exponential falloff into haze toward the
  'card-fog-exp': ({ c, cream }) => (
    <><defs><linearGradient id="iv2e-fogexp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c}/><stop offset="0.55" stopColor={c} stopOpacity="0.5"/><stop offset="1" stopColor={c} stopOpacity="0.08"/></linearGradient></defs><clipPath id="iv2e-fogexp-clip"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/></clipPath><g clipPath="url(#iv2e-fogexp-clip)"><rect x="3.5" y="4.5" width="17" height="15" fill={cream}/><path d="M3.5 19.5 L8.5 12 L12 16 L16 10.5 L20.5 17 L20.5 19.5 Z" fill={c}/><rect x="3.5" y="4.5" width="17" height="15" fill="url(#iv2e-fogexp)"/></g></>
  ),
  // A frame with four solid darkened corner wedges hugging a bright clear centre — corners crushed, middle untouch
  'card-vignette': ({ c, cream }) => (
    <><rect x="3" y="3" width="18" height="18" rx="4" fill={c} /><path d="M3 7 C3 4.8 4.8 3 7 3 L3 3 Z M7 3 C4.8 3 3 4.8 3 7 L3 12 C3 7 7 3 12 3 L7 3 Z" fill={c} /><path d="M3 3 L11 3 C6.6 3 3 6.6 3 11 Z" fill={c} /><path d="M21 3 L13 3 C17.4 3 21 6.6 21 11 Z" fill={c} /><path d="M3 21 L11 21 C6.6 21 3 17.4 3 13 Z" fill={c} /><path d="M21 21 L13 21 C17.4 21 21 17.4 21 13 Z" fill={c} /><circle cx="12" cy="12" r="6.1" fill={cream} /><circle cx="12" cy="12" r="6.1" fill="none" stroke={c} strokeWidth="1.2" opacity="0.35" /></>
  ),
  // A tipped paint bucket pouring a stream of hue with a falling droplet — washing an image in colour.
  'card-tint': ({ c, cream }) => (
    <><defs><linearGradient id="iv2e-tint-pour" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c}/><stop offset="1" stopColor={cream}/></linearGradient></defs><path d="M5.4 4.2 L13.6 6.4 C14.7 6.7 15.3 7.8 15 8.9 L13.2 15.6 C12.9 16.7 11.8 17.3 10.7 17 L4.5 15.3 C3.4 15 2.8 13.9 3.1 12.8 L4.7 6.9 C5 5.8 4.3 5.5 5.4 4.2 Z" fill={c} transform="rotate(-24 9 11)"/><path d="M15.2 10.4 C15.2 10.4 18.4 14.6 18.4 16.8 A3.2 3.2 0 0 1 12 16.8 C12 14.6 15.2 10.4 15.2 10.4 Z" fill="url(#iv2e-tint-pour)"/><path d="M13.6 16.6 A1.6 1.6 0 0 0 15 18" fill="none" stroke={cream} strokeWidth="1.4" strokeLinecap="round" opacity="0.8"/></>
  ),
  // A glowing lightbulb with a flickering filament-core and short emitted glints — brightness throbbing up and dow
  'card-pulse-brightness': ({ c, cream }) => (
    <><path d="M12 3 C8.1 3 5.2 6 5.2 9.6 C5.2 12 6.5 13.6 7.8 15 C8.6 15.9 9 16.5 9.1 17.6 L14.9 17.6 C15 16.5 15.4 15.9 16.2 15 C17.5 13.6 18.8 12 18.8 9.6 C18.8 6 15.9 3 12 3 Z" fill={c}/><rect x="8.8" y="18.4" width="6.4" height="2.4" rx="1.2" fill={c}/><circle cx="12" cy="9.4" r="3" fill={cream} className="iv2-grid-dot"/><g stroke={cream} strokeWidth="1.5" strokeLinecap="round" opacity="0.85"><line x1="12" y1="1.4" x2="12" y2="0.6"/><line x1="4.2" y1="4.2" x2="3.4" y2="3.4"/><line x1="19.8" y1="4.2" x2="20.6" y2="3.4"/></g></>
  ),
  // A full-spectrum hue bar with a heartbeat/ECG line riding over it — the hue value oscillating in time.
  'card-pulse-hue': ({ cream }) => (
    <><defs><linearGradient id="iv2e-phue-bar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#E0563D"/><stop offset="0.25" stopColor="#EFC250"/><stop offset="0.5" stopColor="#5BAE54"/><stop offset="0.75" stopColor="#3B79C9"/><stop offset="1" stopColor="#8A5BCB"/></linearGradient></defs><rect x="3" y="8" width="18" height="8" rx="2.6" fill="url(#iv2e-phue-bar)"/><path d="M3.4 12 L6.4 12 L7.4 12 L8.2 6 L9.2 18 L10.4 9.4 L11.4 12 L13.4 12 L14.4 9 L15.4 12 L20.6 12" fill="none" stroke={cream} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9.2" cy="18" r="1.4" fill={cream}/></>
  ),
  // A chevron echoing rightward in three steps, each copy smaller and fainter — a trail decaying toward nothing.
  'card-feedback-decay': ({ c, cream }) => (
    <><path d="M3.4 6.5 L8.4 12 L3.4 17.5 L6.6 17.5 L11.6 12 L6.6 6.5 Z" fill={c}/><path d="M9.6 7.6 L13.6 12 L9.6 16.4 L12 16.4 L16 12 L12 7.6 Z" fill={c} opacity="0.62"/><path d="M14.8 8.6 L18 12 L14.8 15.4 L16.5 15.4 L19.6 12 L16.5 8.6 Z" fill={cream} opacity="0.5" className="iv2-ripple-ring"/></>
  ),
  // An upright glowing oval gateway with a spiralling vortex drawn into its centre — a doorway into another space.
  'card-portal': ({ c, cream }) => (
    <><ellipse cx="12" cy="12" rx="6.6" ry="9" fill={c}/><ellipse cx="12" cy="12" rx="4.4" ry="6.6" fill="none" stroke={cream} strokeWidth="1.4" opacity="0.55"/><g className="iv2-spin"><path d="M12 12 C12 9 9.4 8 8 10.4 C6.4 13.2 9 16.2 12.4 15.6 C16 15 16.6 10.4 14 7.8" fill="none" stroke={cream} strokeWidth="1.8" strokeLinecap="round"/></g><circle cx="12" cy="12" r="1.5" fill={cream}/></>
  ),

  // ─── Card batch 8 — 3D / gradients / media / mouse / Islamic patterns ──────
  // 3D primitives (raymarched) — isometric / wireframe, distinct from flat shapes
  'card-box-3d': ({ c, cream }) => (
    <>
      <path d="M12 3 L20 7.5 L12 12 L4 7.5 Z" fill={cream} />
      <path d="M4 7.5 L12 12 L12 21 L4 16.5 Z" fill={c} />
      <path d="M20 7.5 L12 12 L12 21 L20 16.5 Z" fill={c} opacity="0.72" />
    </>
  ),
  // wireframe globe — distinct from the shaded spheres (material-3d / blinn / sphere-ao)
  'card-sphere-3d': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <ellipse cx="12" cy="12" rx="3.5" ry="8.4" fill="none" stroke={cream} strokeWidth="1.4" opacity="0.9" />
      <line x1="3.6" y1="12" x2="20.4" y2="12" stroke={cream} strokeWidth="1.4" opacity="0.9" />
    </>
  ),
  'card-torus-3d': ({ c, cream }) => (
    <>
      <path fillRule="evenodd" d="M21 12 a9 6 0 1 0 -18 0 a9 6 0 1 0 18 0 M15.6 12 a3.6 2.2 0 1 0 -7.2 0 a3.6 2.2 0 1 0 7.2 0" fill={c} />
      <path d="M5.6 9.4 A9 6 0 0 1 18.4 9.4" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </>
  ),
  'card-ground-3d': ({ c, cream }) => (
    <>
      <path d="M1.5 21 L9 8.5 L15 8.5 L22.5 21 Z" fill={c} />
      <g fill="none" stroke={cream} strokeWidth="1.1" strokeLinecap="round" opacity="0.6">
        <path d="M6.6 16.4 L17.4 16.4" />
        <path d="M8 12.4 L16 12.4" />
        <path d="M12 8.5 L12 21" />
        <path d="M9 8.5 L4.5 21" />
        <path d="M15 8.5 L19.5 21" />
      </g>
    </>
  ),
  'card-repeat-3d': ({ c, cream }) => (
    <g>
      {[[8, 8.5], [15.5, 9.5], [11.5, 15.5]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(0.5)`}>
          <path d="M0 -5 L5 -2.5 L0 0 L-5 -2.5 Z" fill={cream} />
          <path d="M-5 -2.5 L0 0 L0 5 L-5 2.5 Z" fill={c} />
          <path d="M5 -2.5 L0 0 L0 5 L5 2.5 Z" fill={c} opacity="0.72" />
        </g>
      ))}
    </g>
  ),
  // two 3D balls smoothly fusing (metaball + speculars) — vs flat smooth-min-d
  'card-smooth-union-3d': ({ c, cream }) => (
    <>
      <path d="M4.5 12 C4.5 9 6.6 7.2 9 7.4 C10.6 7.5 11.3 8.5 12 8.5 C12.7 8.5 13.4 7.5 15 7.4 C17.4 7.2 19.5 9 19.5 12 C19.5 15 17.4 16.8 15 16.6 C13.4 16.5 12.7 15.5 12 15.5 C11.3 15.5 10.6 16.5 9 16.6 C6.6 16.8 4.5 15 4.5 12 Z" fill={c} />
      <ellipse cx="7.8" cy="10.2" rx="1.7" ry="1.2" fill={cream} opacity="0.7" transform="rotate(-20 7.8 10.2)" />
      <ellipse cx="16.2" cy="10.2" rx="1.7" ry="1.2" fill={cream} opacity="0.7" transform="rotate(-20 16.2 10.2)" />
    </>
  ),
  // gradients — distinct from the colour-category palette bars
  'card-gradient-linear': ({ c, cream }) => (
    <>
      <defs>
        <linearGradient id="iv2s-glin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c} />
          <stop offset="1" stopColor={cream} />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="3.4" fill="url(#iv2s-glin)" />
      <path d="M7.5 7.5 L13 13 M13 10.2 L13 13 L10.2 13" fill="none" stroke={cream} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'card-gradient-conic': ({ c, cream }) => (
    <>
      <g>
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d="M12 12 L12 3 A9 9 0 0 1 16.5 4.2 Z" fill={c} opacity={(i + 1) / 12} transform={`rotate(${i * 30} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2.4" fill={cream} />
    </>
  ),
  // media / IO sources
  'card-image-input': ({ c, cream }) => (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.6" fill={c} />
      <circle cx="8.2" cy="9.6" r="1.9" fill={cream} />
      <path d="M3.5 19 L9.5 12.5 L13 15.8 L16.5 11.5 L20.5 16.5 L20.5 19 Z" fill={cream} />
    </>
  ),
  'card-webcam-input': ({ c, cream }) => (
    <>
      <circle cx="12" cy="10.8" r="7.6" fill={c} />
      <circle cx="12" cy="10.8" r="3.4" fill={cream} />
      <circle cx="12" cy="10.8" r="1.5" fill={c} />
      <rect x="7.5" y="18.6" width="9" height="2.6" rx="1.3" fill={c} />
    </>
  ),
  // multipass sample buffers — a render-target stack labelled A–D
  'card-sample-buffer-a': ({ c, cream }) => (
    <>
      <rect x="4.5" y="4" width="12.5" height="12.5" rx="2.2" fill={c} opacity="0.38" />
      <rect x="7" y="7" width="12.5" height="12.5" rx="2.2" fill={c} />
      <text x="13.25" y="16.7" fontSize="9" fontWeight="800" fill={cream} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">A</text>
    </>
  ),
  'card-sample-buffer-b': ({ c, cream }) => (
    <>
      <rect x="4.5" y="4" width="12.5" height="12.5" rx="2.2" fill={c} opacity="0.38" />
      <rect x="7" y="7" width="12.5" height="12.5" rx="2.2" fill={c} />
      <text x="13.25" y="16.7" fontSize="9" fontWeight="800" fill={cream} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">B</text>
    </>
  ),
  'card-sample-buffer-c': ({ c, cream }) => (
    <>
      <rect x="4.5" y="4" width="12.5" height="12.5" rx="2.2" fill={c} opacity="0.38" />
      <rect x="7" y="7" width="12.5" height="12.5" rx="2.2" fill={c} />
      <text x="13.25" y="16.7" fontSize="9" fontWeight="800" fill={cream} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">C</text>
    </>
  ),
  'card-sample-buffer-d': ({ c, cream }) => (
    <>
      <rect x="4.5" y="4" width="12.5" height="12.5" rx="2.2" fill={c} opacity="0.38" />
      <rect x="7" y="7" width="12.5" height="12.5" rx="2.2" fill={c} />
      <text x="13.25" y="16.7" fontSize="9" fontWeight="800" fill={cream} textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif">D</text>
    </>
  ),
  // mouse interactions (distortion)
  'card-mouse-paint-d': ({ c, cream }) => (
    <>
      <path d="M4 18 C7 13 9 17 13 12 C15 9.5 17 10.5 19.5 7.5" fill="none" stroke={cream} strokeWidth="3" strokeLinecap="round" />
      <path d="M8.4 4.6 L16.2 10.4 L12.2 10.9 L14.3 15 L12.5 15.9 L10.4 11.8 L7.6 14.6 Z" fill={c} />
    </>
  ),
  'card-mouse-repel': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="3.2" fill={c} />
      <g fill="none" stroke={cream} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6.8 L12 3.2 M10.5 4.7 L12 3.2 L13.5 4.7" />
        <path d="M12 17.2 L12 20.8 M10.5 19.3 L12 20.8 L13.5 19.3" />
        <path d="M6.8 12 L3.2 12 M4.7 10.5 L3.2 12 L4.7 13.5" />
        <path d="M17.2 12 L20.8 12 M19.3 10.5 L20.8 12 L19.3 13.5" />
      </g>
    </>
  ),
  // Islamic geometry — distinguished by point-count
  'card-islamic-6pt-star': ({ c, cream }) => (
    <>
      <path d="M12 3.2 L19 15 L5 15 Z" fill={c} />
      <path d="M12 20.8 L5 9 L19 9 Z" fill={c} />
      <path d="M12 8.4 L15.2 10.2 L15.2 13.8 L12 15.6 L8.8 13.8 L8.8 10.2 Z" fill={cream} />
    </>
  ),
  'card-islamic-8pt-star': ({ c, cream }) => (
    <>
      <g fill={c}>
        <rect x="5.2" y="5.2" width="13.6" height="13.6" />
        <rect x="5.2" y="5.2" width="13.6" height="13.6" transform="rotate(45 12 12)" />
      </g>
      <circle cx="12" cy="12" r="3.4" fill={cream} />
    </>
  ),
  'card-islamic-12pt-rosette': ({ c, cream }) => (
    <>
      <g fill={c}>
        <path d="M12 3 L19.8 7.5 L19.8 16.5 L12 21 L4.2 16.5 L4.2 7.5 Z" />
        <path d="M12 3 L19.8 7.5 L19.8 16.5 L12 21 L4.2 16.5 L4.2 7.5 Z" transform="rotate(30 12 12)" />
      </g>
      <circle cx="12" cy="12" r="4" fill={cream} />
    </>
  ),
  'card-arabesque-curls': ({ c, cream }) => (
    <>
      <g fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 21 L12 11.5" />
        <path d="M12 12 C12 8.4 8.6 6.6 6 8.8 C3.8 10.6 5.2 13.6 7.8 12.2" />
        <path d="M12 12 C12 8.4 15.4 6.6 18 8.8 C20.2 10.6 18.8 13.6 16.2 12.2" />
      </g>
      <circle cx="12" cy="9.6" r="1.8" fill={cream} />
    </>
  ),
  'card-kufic-grid': ({ c, cream }) => (
    <>
      <g fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="miter" strokeLinecap="square">
        <path d="M4 4 L4 13 L10 13 L10 7 L14 7 L14 11" />
        <path d="M20 20 L20 11 L14 11 L14 17 L10 17 L10 13" />
      </g>
      <rect x="16.5" y="4" width="3.5" height="3.5" fill={cream} />
      <rect x="4" y="16.5" width="3.5" height="3.5" fill={cream} />
    </>
  ),
  'card-zellige-grid': ({ c, cream }) => (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.4" fill={c} />
      <g fill={cream}>
        <path d="M8 4.5 L11.5 8 L8 11.5 L4.5 8 Z" />
        <path d="M16 4.5 L19.5 8 L16 11.5 L12.5 8 Z" />
        <path d="M8 12.5 L11.5 16 L8 19.5 L4.5 16 Z" />
        <path d="M16 12.5 L19.5 16 L16 19.5 L12.5 16 Z" />
      </g>
    </>
  ),

  // ─── Pattern / abstract block icons (the ones that turned to mush) ─────────
  'b-ripple': ({ c, cream }) => (
    <>
      {/* two rings emanate outward (staggered); static frame still reads as a ripple */}
      <circle cx="12" cy="12" r="8.6" className="iv2-ripple-ring" fill="none" stroke={c} strokeWidth="2.2" style={{ animationDelay: '1.3s' }} />
      <circle cx="12" cy="12" r="8.6" className="iv2-ripple-ring" fill="none" stroke={c} strokeWidth="2.6" />
      <circle cx="12" cy="12" r="2.7" fill={cream} />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke={c} strokeWidth="1.5" />
    </>
  ),
  'b-grid': ({ c, cream }) => (
    <>
      {[5, 12, 19].flatMap((y, yi) =>
        [5, 12, 19].map((x, xi) => {
          const i = yi * 3 + xi;
          const center = x === 12 && y === 12;
          return (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={center ? 2.7 : 2}
              fill={center ? cream : c}
              className={center ? undefined : 'iv2-grid-dot'}
              // varied delays so dots twinkle occasionally, never in unison
              style={center ? undefined : { animationDelay: `${(i * 0.53) % 3.4}s` }}
            />
          );
        }),
      )}
    </>
  ),

  // ─── Card batch 1 — grids & tilings ───────────────────────────────────────
  // generic concentric card (default type = rings)
  'card-concentric': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="5.4" fill="none" stroke={c} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="2" fill={cream} />
    </>
  ),
  'card-concentric-squares': ({ c, cream }) => (
    <>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="3.2" fill="none" stroke={c} strokeWidth="2.4" />
      <rect x="7.6" y="7.6" width="8.8" height="8.8" rx="2.2" fill="none" stroke={c} strokeWidth="2.4" />
      <rect x="10.6" y="10.6" width="2.8" height="2.8" rx="1" fill={cream} />
    </>
  ),
  // `repeat` tiles a shape into a grid. Clean 2×2 — the source tile (cream)
  // repeated across the others.
  'card-repeat': ({ c, cream }) => (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.9" fill={cream} />
      <rect x="13" y="4" width="7" height="7" rx="1.9" fill={c} />
      <rect x="4" y="13" width="7" height="7" rx="1.9" fill={c} />
      <rect x="13" y="13" width="7" height="7" rx="1.9" fill={c} />
    </>
  ),
  'card-sunburst': ({ c, cream }) => (
    <>
      <g className="iv2-spin">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const inner = 4.2;
          const outer = i % 2 ? 8.4 : 10.6; // alternating ray length = sun look
          return (
            <line
              key={i}
              x1={12 + Math.cos(a) * inner}
              y1={12 + Math.sin(a) * inner}
              x2={12 + Math.cos(a) * outer}
              y2={12 + Math.sin(a) * outer}
              stroke={c}
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity={i % 2 ? 0.6 : 1}
            />
          );
        })}
      </g>
      <circle cx="12" cy="12" r="3.2" fill={cream} />
    </>
  ),
  'card-radial-stripes': ({ c, cream }) => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d="M12 12 L9.6 1.9 L14.4 1.9 Z" fill={i % 2 ? cream : c} opacity={i % 2 ? 0.6 : 1} transform={`rotate(${i * 45} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2" fill={c} />
    </>
  ),
  'card-brick-wall': ({ c, cream }) => (
    <>
      <rect x="3" y="4.6" width="8" height="4.2" rx="1.2" fill={c} />
      <rect x="13" y="4.6" width="8" height="4.2" rx="1.2" fill={cream} opacity="0.55" />
      <rect x="3" y="10" width="3.6" height="4.2" rx="1.2" fill={cream} opacity="0.55" />
      <rect x="8.6" y="10" width="8" height="4.2" rx="1.2" fill={c} />
      <rect x="18.6" y="10" width="2.4" height="4.2" rx="1.2" fill={cream} opacity="0.55" />
      <rect x="3" y="15.4" width="8" height="4.2" rx="1.2" fill={c} />
      <rect x="13" y="15.4" width="8" height="4.2" rx="1.2" fill={cream} opacity="0.55" />
    </>
  ),
  'card-triangle-grid': ({ c, cream }) => (
    <>
      <path d="M3 16.2 L7 8 L11 16.2 Z" fill={c} />
      <path d="M7 8 L11 16.2 L15 8 Z" fill={cream} opacity="0.55" />
      <path d="M11 16.2 L15 8 L19 16.2 Z" fill={c} />
      <path d="M15 8 L19 16.2 L23 8 Z" fill={cream} opacity="0.55" />
    </>
  ),
  'card-hex-grid': ({ c, cream }) => (
    <>
      <polygon points="12,3.4 15.98,5.7 15.98,10.3 12,12.6 8.02,10.3 8.02,5.7" fill={cream} opacity="0.55" />
      <polygon points="7.2,11.4 11.18,13.7 11.18,18.3 7.2,20.6 3.22,18.3 3.22,13.7" fill={c} />
      <polygon points="16.8,11.4 20.78,13.7 20.78,18.3 16.8,20.6 12.82,18.3 12.82,13.7" fill={c} />
    </>
  ),
};

export type IconV2Name = keyof typeof ICON_V2;

export const IconV2 = ({
  name,
  size = 20,
  color = 'currentColor',
  cream = '#FEE7C7',
  ink = '#2b2a25',
  rotate,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  cream?: string;
  ink?: string;
  rotate?: number;
  style?: CSSProperties;
}) => {
  const render = ICON_V2[name];
  if (!render) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'block', transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
    >
      {/* uniform subtle ink edge — a hard, tiny drop-shadow gives every glyph
          the same crisp bottom edge without per-icon underlays */}
      <g style={{ filter: `drop-shadow(0 0.6px 0.15px ${ink}bb)` }}>{render({ c: color, cream, ink })}</g>
    </svg>
  );
};
