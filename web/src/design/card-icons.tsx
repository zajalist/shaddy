// Charismatic per-card SVG icons for the Shaddy cards library.
// Names follow the `card-<kebab-type>` convention so DesignApp's tokens
// mapping wires them up automatically.
//
// Style: matches `icons.tsx` flat-multicolor language —
//   - Solid filled shapes, no outline strokes (except hairline depth marks).
//   - 2-3 colors per icon: primary (`c`), cream highlight, soft black shadow.
//   - Slight tilts / asymmetry for hand-set personality.
//   - Rounded corners; no sharp points.
//   - 24x24 viewBox; mostly within 2..22.
//   - Thematic palette icons hardcode their thematic hexes (the theme IS the identity).

import type { ReactNode } from 'react';

type IconRenderArgs = { c: string; cream: string; ink: string };
type IconRenderer = (args: IconRenderArgs) => ReactNode;

const SHADOW = 'rgba(0,0,0,0.22)';

export const CARD_ICON_PATHS: Record<string, IconRenderer> = {
  // ───────────────────────────────── MARKERS ────────────────────────────────

  'card-portal': ({ cream }) => (
    <>
      {/* concentric portal rings — gold outer, cream inner — reads as a
          small round portal glyph at any size. Brand gold is hardcoded so
          the portal always reads with the same warm hue regardless of the
          calling category colour. */}
      <circle cx="12" cy="12" r="9" fill="none" stroke="#FCB427" strokeWidth="2" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#FCB427" strokeWidth="1.5" opacity="0.7" />
      <circle cx="12" cy="12" r="3.2" fill="#FCB427" />
      <circle cx="10.6" cy="10.6" r="1.2" fill={cream} opacity="0.85" />
    </>
  ),

  // ───────────────────────────────── SHAPES ─────────────────────────────────

  'card-square': ({ c, cream }) => (
    <>
      <rect x="4" y="4.6" width="16" height="16" rx="3" fill={SHADOW} />
      <rect x="3.6" y="3.8" width="16" height="16" rx="3" fill={c} />
      <rect x="5.6" y="5.6" width="6" height="6" rx="1.6" fill={cream} opacity="0.78" transform="rotate(-4 8.6 8.6)" />
      <circle cx="16.4" cy="16.4" r="1.4" fill={cream} opacity="0.55" />
    </>
  ),

  'card-rectangle': ({ c, cream }) => (
    <>
      <rect x="2.8" y="6.6" width="18.4" height="11.6" rx="2.4" fill={SHADOW} />
      <rect x="2.4" y="5.8" width="18.4" height="11.6" rx="2.4" fill={c} />
      <rect x="4.2" y="7.6" width="7" height="3.6" rx="1.2" fill={cream} opacity="0.7" transform="rotate(-3 7.7 9.4)" />
      <circle cx="16.6" cy="13.6" r="1.3" fill={cream} opacity="0.55" />
    </>
  ),

  'card-triangle': ({ c, cream }) => (
    <>
      <path d="M12 4.4 L21 19.6 L3 19.6 Z" fill={SHADOW} />
      <path d="M12 3.6 L20.6 18.8 L3.4 18.8 Z" fill={c} />
      <circle cx="12" cy="13" r="2.2" fill={cream} opacity="0.78" />
      <circle cx="9.4" cy="16.6" r="1.1" fill={cream} opacity="0.55" />
    </>
  ),

  'card-hexagon': ({ c, cream }) => (
    <>
      <path d="M12 3.6 L19.8 8.2 L19.8 15.8 L12 20.4 L4.2 15.8 L4.2 8.2 Z" fill={c} />
      <path d="M12 6.4 L17.2 9.4 L17.2 13.4 L12 11 Z" fill={cream} opacity="0.78" />
      <circle cx="9" cy="14.8" r="1.3" fill={cream} opacity="0.55" />
    </>
  ),

  'card-star': ({ c, cream }) => (
    <>
      <path d="M12 3 L14.2 9.6 L21.2 9.6 L15.5 13.8 L17.7 20.4 L12 16.2 L6.3 20.4 L8.5 13.8 L2.8 9.6 L9.8 9.6 Z" fill={c} />
      <path d="M12 6 L13.2 9.8 L17 9.8 L13.9 12.2 L15.1 16 L12 13.6 Z" fill={cream} opacity="0.78" />
    </>
  ),

  'card-heart': ({ c, cream }) => (
    <>
      <path d="M12 20.4 C 3.6 14.6 4.4 7.4 8.8 6.4 C 10.6 6 11.6 7 12 8.4 C 12.4 7 13.4 6 15.2 6.4 C 19.6 7.4 20.4 14.6 12 20.4 Z" fill={c} />
      <path d="M8.6 9 Q7.4 11 8.4 13 Q9.6 12.6 9.6 10.6 Q9.4 9.2 8.6 9 Z" fill={cream} opacity="0.78" />
    </>
  ),

  'card-cross': ({ c, cream }) => (
    <>
      <rect x="10.2" y="3.6" width="3.6" height="16.8" rx="1.4" fill={c} />
      <rect x="3.6" y="10.2" width="16.8" height="3.6" rx="1.4" fill={c} />
      <rect x="10.4" y="4.8" width="3.2" height="3.2" rx="0.9" fill={cream} opacity="0.6" />
      <rect x="4.8" y="10.4" width="3.2" height="3.2" rx="0.9" fill={cream} opacity="0.6" />
    </>
  ),

  'card-arc': ({ c, cream }) => (
    <>
      <path d="M3.2 19 A10 10 0 0 1 20.8 19 L17 19 A6.4 6.4 0 0 0 7 19 Z" fill={c} />
      <path d="M4.6 17.4 A8.6 8.6 0 0 1 19.4 17.4 L17.2 17.4 A6.4 6.4 0 0 0 6.8 17.4 Z" fill={cream} opacity="0.55" />
    </>
  ),

  'card-fbm': ({ c, cream }) => (
    <>
      {/* clustered blobs of varying scale — fractal feel */}
      <circle cx="7" cy="8" r="3.4" fill={c} opacity="0.85" />
      <circle cx="9.4" cy="6.4" r="1.5" fill={cream} opacity="0.7" />
      <circle cx="15" cy="11" r="2.6" fill={c} opacity="0.75" />
      <circle cx="17.4" cy="9.2" r="1.1" fill={cream} opacity="0.6" />
      <circle cx="10" cy="15" r="2.2" fill={c} opacity="0.7" />
      <circle cx="17" cy="17" r="1.7" fill={cream} opacity="0.6" />
      <circle cx="6" cy="17" r="1.1" fill={c} opacity="0.5" />
    </>
  ),

  'card-ridged': ({ c, cream }) => (
    <>
      {/* sharp ridges suggested with thin tilted pills */}
      <path d="M3.4 7 Q12 4 20.6 7 L20.6 8.6 Q12 5.6 3.4 8.6 Z" fill={c} />
      <path d="M3.4 11 Q12 8 20.6 11 L20.6 12.6 Q12 9.6 3.4 12.6 Z" fill={cream} />
      <path d="M3.4 15 Q12 12 20.6 15 L20.6 16.6 Q12 13.6 3.4 16.6 Z" fill={c} opacity="0.7" />
      <path d="M3.4 19 Q12 16 20.6 19 L20.6 20 Q12 17 3.4 20 Z" fill={c} opacity="0.4" />
    </>
  ),

  'card-worley-edges': ({ c, cream }) => (
    <>
      {/* cell-like splotches with seed dots */}
      <path d="M3.4 6 Q7 4 10 6 Q12 9 9.6 12 Q6 12.8 4 11 Q2.6 8 3.4 6 Z" fill={c} opacity="0.8" />
      <path d="M11 6 Q15 4.4 18.6 6.6 Q20 10 17.6 12 Q14 12.6 12.2 11 Q10.4 9 11 6 Z" fill={cream} opacity="0.8" />
      <path d="M5 13 Q9 13.6 11 15.8 Q11.6 19 8.4 20 Q4.6 19.8 4 17 Q3.6 14.4 5 13 Z" fill={c} opacity="0.6" />
      <path d="M13 13 Q17.4 13.4 19.6 15.4 Q20 19 17 19.8 Q13.4 19.8 12.4 17.6 Q11.8 14.6 13 13 Z" fill={c} opacity="0.45" />
      <circle cx="7" cy="8.4" r="0.9" fill={cream} />
      <circle cx="15" cy="9" r="0.9" fill={c} />
    </>
  ),

  'card-turbulence': ({ c, cream }) => (
    <>
      {/* swirly tilted blob shapes */}
      <path d="M4 7 Q10 4 14 8 Q15 13 8 12 Q3 10 4 7 Z" fill={c} />
      <path d="M10 11 Q17 9 19 13 Q19 17 13 18 Q8 17 10 11 Z" fill={cream} opacity="0.8" />
      <circle cx="6.6" cy="16" r="1.6" fill={c} opacity="0.6" />
    </>
  ),

  'card-sin-field': ({ c, cream }) => (
    <>
      <path d="M3 7 Q7 3 11 7 T19 7 T21 7" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 12 Q7 8 11 12 T19 12 T21 12" fill="none" stroke={cream} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 17 Q7 13 11 17 T19 17 T21 17" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
    </>
  ),

  'card-plasma': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} opacity="0.4" />
      <path d="M5 10 Q9 5 14 9 Q19 12 16 17 Q11 20 7 16 Q3 13 5 10 Z" fill={c} />
      <path d="M8 11 Q12 8 15 11 Q16 14 13 16 Q9 16 8 13 Z" fill={cream} opacity="0.75" />
    </>
  ),

  'card-interference': ({ c, cream }) => (
    <>
      {/* two ring stacks intersecting */}
      <circle cx="9" cy="12" r="6.4" fill="none" stroke={c} strokeWidth="1.4" />
      <circle cx="9" cy="12" r="4" fill="none" stroke={c} strokeWidth="1.4" />
      <circle cx="9" cy="12" r="1.8" fill={c} />
      <circle cx="15" cy="12" r="6.4" fill="none" stroke={cream} strokeWidth="1.4" />
      <circle cx="15" cy="12" r="4" fill="none" stroke={cream} strokeWidth="1.4" />
      <circle cx="15" cy="12" r="1.8" fill={cream} />
    </>
  ),

  'card-hex-grid': ({ c, cream }) => (
    <>
      <path d="M7 5 L10 6.6 L10 9.8 L7 11.4 L4 9.8 L4 6.6 Z" fill={c} />
      <path d="M14 5 L17 6.6 L17 9.8 L14 11.4 L11 9.8 L11 6.6 Z" fill={cream} opacity="0.85" />
      <path d="M10.5 12 L13.5 13.6 L13.5 16.8 L10.5 18.4 L7.5 16.8 L7.5 13.6 Z" fill={c} opacity="0.7" />
      <path d="M17.5 12 L20.5 13.6 L20.5 16.8 L17.5 18.4 L14.5 16.8 L14.5 13.6 Z" fill={c} opacity="0.5" />
    </>
  ),

  'card-diamond-grid': ({ c, cream }) => (
    <>
      <path d="M7 4 L10 7 L7 10 L4 7 Z" fill={c} />
      <path d="M14 4 L17 7 L14 10 L11 7 Z" fill={cream} opacity="0.85" />
      <path d="M7 11 L10 14 L7 17 L4 14 Z" fill={cream} opacity="0.7" />
      <path d="M14 11 L17 14 L14 17 L11 14 Z" fill={c} opacity="0.75" />
      <path d="M10.5 17.6 L13.5 20.6 L10.5 23.6 L7.5 20.6 Z" fill={c} opacity="0.45" />
    </>
  ),

  'card-brick-wall': ({ c, cream }) => (
    <>
      <rect x="3" y="5" width="7" height="4" rx="0.9" fill={c} />
      <rect x="11" y="5" width="10" height="4" rx="0.9" fill={cream} opacity="0.85" />
      <rect x="3" y="10" width="11" height="4" rx="0.9" fill={cream} opacity="0.7" />
      <rect x="15" y="10" width="6" height="4" rx="0.9" fill={c} opacity="0.8" />
      <rect x="3" y="15" width="7" height="4" rx="0.9" fill={c} opacity="0.6" />
      <rect x="11" y="15" width="10" height="4" rx="0.9" fill={c} opacity="0.45" />
    </>
  ),

  'card-triangle-grid': ({ c, cream }) => (
    <>
      <path d="M4 19 L8 11 L12 19 Z" fill={c} />
      <path d="M8 11 L12 19 L16 11 Z" fill={cream} opacity="0.85" />
      <path d="M12 19 L16 11 L20 19 Z" fill={c} opacity="0.7" />
      <path d="M8 11 L12 3 L16 11 Z" fill={c} opacity="0.5" />
    </>
  ),

  'card-sunburst': ({ c, cream }) => (
    <>
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const x1 = 12 + Math.cos(r) * 4.2;
        const y1 = 12 + Math.sin(r) * 4.2;
        const x2 = 12 + Math.cos(r) * 10.2;
        const y2 = 12 + Math.sin(r) * 10.2;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2.2" strokeLinecap="round" opacity={i % 2 ? 0.55 : 1} />;
      })}
      <circle cx="12" cy="12" r="3.4" fill={cream} />
    </>
  ),

  'card-rose-curve': ({ c, cream }) => (
    <>
      {/* 4-petal rose */}
      <path d="M12 4 Q14 12 12 12 Q10 12 12 4 Z" fill={c} />
      <path d="M20 12 Q12 14 12 12 Q12 10 20 12 Z" fill={cream} opacity="0.85" />
      <path d="M12 20 Q10 12 12 12 Q14 12 12 20 Z" fill={c} opacity="0.7" />
      <path d="M4 12 Q12 10 12 12 Q12 14 4 12 Z" fill={cream} opacity="0.6" />
      <circle cx="12" cy="12" r="1.6" fill={c} />
    </>
  ),

  'card-sector': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={cream} opacity="0.35" />
      <path d="M12 12 L20.4 12 A8.4 8.4 0 0 1 13.6 20.3 Z" fill={c} />
      <circle cx="12" cy="12" r="1.6" fill={cream} />
    </>
  ),

  'card-gradient-linear': ({ c, cream }) => (
    <>
      <rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.4" fill={c} />
      <rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.4" fill={cream} opacity="0.18" />
      <rect x="3.4" y="5.6" width="5" height="12.8" rx="2.4" fill={cream} opacity="0.55" />
      <rect x="14" y="5.6" width="6.6" height="12.8" rx="2.4" fill={SHADOW} />
    </>
  ),

  'card-gradient-conic': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={cream} opacity="0.4" />
      <path d="M12 12 L20.4 12 A8.4 8.4 0 0 1 12 20.4 Z" fill={c} />
      <path d="M12 12 L12 3.6 A8.4 8.4 0 0 1 20.4 12 Z" fill={c} opacity="0.55" />
      <path d="M12 12 L3.6 12 A8.4 8.4 0 0 1 12 3.6 Z" fill={cream} />
      <circle cx="12" cy="12" r="1.6" fill={c} />
    </>
  ),

  'card-caustics': ({ c, cream }) => (
    <>
      {/* puddle of curved highlights */}
      <ellipse cx="12" cy="13" rx="9" ry="7" fill={c} opacity="0.45" />
      <path d="M5 11 Q10 8 14 11" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 14 Q12 11 17 14" fill="none" stroke={cream} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 17 Q13 15 18 17" fill="none" stroke={cream} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  'card-moire': ({ c, cream }) => (
    <>
      {/* two grids overlapping */}
      <g transform="rotate(-8 12 12)">
        <line x1="3" y1="6" x2="21" y2="6" stroke={c} strokeWidth="1.4" />
        <line x1="3" y1="10" x2="21" y2="10" stroke={c} strokeWidth="1.4" />
        <line x1="3" y1="14" x2="21" y2="14" stroke={c} strokeWidth="1.4" />
        <line x1="3" y1="18" x2="21" y2="18" stroke={c} strokeWidth="1.4" />
      </g>
      <g transform="rotate(8 12 12)">
        <line x1="3" y1="6" x2="21" y2="6" stroke={cream} strokeWidth="1.4" />
        <line x1="3" y1="10" x2="21" y2="10" stroke={cream} strokeWidth="1.4" />
        <line x1="3" y1="14" x2="21" y2="14" stroke={cream} strokeWidth="1.4" />
        <line x1="3" y1="18" x2="21" y2="18" stroke={cream} strokeWidth="1.4" />
      </g>
    </>
  ),

  'card-julia': ({ c, cream }) => (
    <>
      {/* dragon-curve-ish blobs */}
      <path d="M5 8 Q9 4 13 7 Q15 11 11 13 Q7 14 5 12 Q3 10 5 8 Z" fill={c} />
      <path d="M11 13 Q14 12 17 14 Q19 17 16 19 Q12 20 11 17 Q10 14 11 13 Z" fill={cream} opacity="0.8" />
      <circle cx="9" cy="10" r="1.1" fill={cream} />
      <circle cx="15" cy="16" r="0.9" fill={c} />
    </>
  ),

  'card-spiral-arms': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} opacity="0.35" />
      <path d="M12 6 Q17 7 17 12 Q17 17 12 17 Q8 17 8 13" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 9 Q14 9.6 14 12 Q14 14 12 14" fill="none" stroke={cream} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),

  'card-concentric-rings': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="1.6" opacity="0.5" />
      <circle cx="12" cy="12" r="6.4" fill="none" stroke={cream} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.8" fill="none" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.4" fill={c} />
    </>
  ),

  'card-truchet': ({ c, cream }) => (
    <>
      {/* four tiles with arcs */}
      <rect x="3" y="3.4" width="8.5" height="8.5" rx="1.2" fill={c} />
      <path d="M3 3.4 A8.5 8.5 0 0 1 11.5 11.9" fill="none" stroke={cream} strokeWidth="1.8" />
      <rect x="12.5" y="3.4" width="8.5" height="8.5" rx="1.2" fill={cream} opacity="0.85" />
      <path d="M21 3.4 A8.5 8.5 0 0 0 12.5 11.9" fill="none" stroke={c} strokeWidth="1.8" />
      <rect x="3" y="12.9" width="8.5" height="8.5" rx="1.2" fill={cream} opacity="0.7" />
      <path d="M3 21.4 A8.5 8.5 0 0 1 11.5 12.9" fill="none" stroke={c} strokeWidth="1.8" />
      <rect x="12.5" y="12.9" width="8.5" height="8.5" rx="1.2" fill={c} opacity="0.7" />
      <path d="M21 21.4 A8.5 8.5 0 0 0 12.5 12.9" fill="none" stroke={cream} strokeWidth="1.8" />
    </>
  ),

  'card-domain-warp': ({ c, cream }) => (
    <>
      <path d="M3 7 Q8 3 12 7 Q16 11 21 7 V11 Q16 15 12 11 Q8 7 3 11 Z" fill={c} />
      <path d="M3 13 Q8 9 12 13 Q16 17 21 13 V17 Q16 21 12 17 Q8 13 3 17 Z" fill={cream} opacity="0.7" />
    </>
  ),

  // ──────────────────────────────── DISTORTIONS ────────────────────────────

  'card-translate': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="10" height="10" rx="2" fill={c} opacity="0.4" />
      <rect x="10.6" y="10.6" width="10" height="10" rx="2" fill={c} />
      <path d="M8 12 L14 12 M12 10 L14 12 L12 14" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  'card-scale-uv': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="6" height="6" rx="1.4" fill={c} opacity="0.5" />
      <rect x="9.4" y="9.4" width="11.2" height="11.2" rx="2.4" fill={c} />
      <path d="M5 5 L9 9 M7 5 L9 5 L9 7" fill="none" stroke={cream} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  'card-mirror-x': ({ c, cream }) => (
    <>
      <path d="M11 3.6 L11 20.4" stroke={cream} strokeWidth="1.2" strokeDasharray="2 1.6" />
      <path d="M3.6 6 L10 6 L10 18 L3.6 18 Z" fill={c} />
      <path d="M18.4 6 L12 6 L12 18 L18.4 18 Z" fill={c} opacity="0.55" />
      <circle cx="6" cy="9" r="1.1" fill={cream} />
      <circle cx="16" cy="9" r="1.1" fill={cream} opacity="0.6" />
    </>
  ),

  'card-mirror-y': ({ c, cream }) => (
    <>
      <path d="M3.6 11 L20.4 11" stroke={cream} strokeWidth="1.2" strokeDasharray="2 1.6" />
      <path d="M6 3.6 L6 10 L18 10 L18 3.6 Z" fill={c} />
      <path d="M6 18.4 L6 12 L18 12 L18 18.4 Z" fill={c} opacity="0.55" />
      <circle cx="9" cy="6.4" r="1.1" fill={cream} />
      <circle cx="9" cy="15.6" r="1.1" fill={cream} opacity="0.6" />
    </>
  ),

  'card-polar-warp': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="7" height="7" rx="1.4" fill={c} opacity="0.45" />
      <circle cx="16" cy="15" r="5.4" fill={c} />
      <circle cx="16" cy="15" r="2.4" fill={cream} />
      <path d="M10.4 7 Q13 8 14 11" fill="none" stroke={cream} strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),

  'card-fisheye': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill={c} />
      <circle cx="12" cy="12" r="6" fill={cream} />
      <circle cx="12" cy="12" r="3" fill={c} />
      <circle cx="10.4" cy="10.4" r="1.2" fill={cream} opacity="0.85" />
    </>
  ),

  'card-skew': ({ c, cream }) => (
    <>
      <path d="M6 5 L20 5 L18 19 L4 19 Z" fill={c} />
      <path d="M8 7 L17 7 L16 12 L7 12 Z" fill={cream} opacity="0.6" transform="skewX(-6)" />
    </>
  ),

  'card-noise-warp': ({ c, cream }) => (
    <>
      <path d="M4 7 Q8 4 12 7 Q16 10 20 7 V11 Q16 14 12 11 Q8 8 4 11 Z" fill={c} />
      <circle cx="7" cy="15" r="1.4" fill={cream} />
      <circle cx="12" cy="16.4" r="1.1" fill={c} opacity="0.65" />
      <circle cx="16" cy="14.8" r="1.2" fill={cream} opacity="0.7" />
      <circle cx="10" cy="18.6" r="0.9" fill={c} opacity="0.5" />
    </>
  ),

  'card-threshold-d': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={cream} />
      <path d="M3.4 3.4 H20.6 V13 Q12 16 3.4 13 Z" fill={c} />
    </>
  ),

  'card-invert-d': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={cream} />
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={c} transform="scale(1 -1) translate(0 -24)" opacity="0" />
      <path d="M3.4 3.4 H12 V20.6 H3.4 Z" fill={c} />
      <circle cx="7.4" cy="9" r="1.4" fill={cream} />
      <circle cx="16.4" cy="15" r="1.4" fill={c} />
    </>
  ),

  'card-power-curve': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.3" />
      <path d="M4 20 Q12 19 13 13 Q14 6 20 4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="4" r="1.4" fill={cream} />
    </>
  ),

  'card-bands': ({ c, cream }) => (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="3.4" rx="0.6" fill={c} />
      <rect x="3.4" y="8.4" width="17.2" height="3.4" rx="0.6" fill={cream} />
      <rect x="3.4" y="12.2" width="17.2" height="3.4" rx="0.6" fill={c} opacity="0.7" />
      <rect x="3.4" y="16" width="17.2" height="3.4" rx="0.6" fill={cream} opacity="0.55" />
    </>
  ),

  'card-contour': ({ c, cream }) => (
    <>
      <path d="M4 8 Q10 5 20 8" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 12 Q10 9 20 12" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 16 Q10 13 20 16" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M4 20 Q10 17 20 20" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />
    </>
  ),

  'card-sin-wave-d': ({ c, cream }) => (
    <>
      <path d="M3 12 Q6 5 9 12 T15 12 T21 12" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <path d="M3 16 Q6 9 9 16 T15 16 T21 16" fill="none" stroke={cream} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),

  'card-twirl': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} opacity="0.35" />
      <path d="M19 12 A7 7 0 1 1 5 12 A5 5 0 1 1 17 12 A3 3 0 1 1 9 12" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),

  'card-zoom-blur-uv': ({ c, cream }) => (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const x1 = 12 + Math.cos(r) * 4.2;
        const y1 = 12 + Math.sin(r) * 4.2;
        const x2 = 12 + Math.cos(r) * 10.4;
        const y2 = 12 + Math.sin(r) * 10.4;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2.2" strokeLinecap="round" opacity={0.45 + (i % 3) * 0.18} />;
      })}
      <circle cx="12" cy="12" r="2.6" fill={cream} />
    </>
  ),

  // ────────────────────────────────── COLORS ───────────────────────────────

  'card-cosine-palette': ({ cream }) => (
    <>
      <path d="M3 16 Q7 8 11 16 T19 16 T21 16" fill="none" stroke="#ff6e9c" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M3 13 Q7 5 11 13 T19 13 T21 13" fill="none" stroke="#6bd1ff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M3 10 Q7 2 11 10 T19 10 T21 10" fill="none" stroke={cream} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),

  'card-sunset-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#f9c54a" />
      <circle cx="12" cy="12" r="4.4" fill="#f48049" />
      <circle cx="17" cy="13" r="4.4" fill="#c8418d" />
    </>
  ),

  'card-ocean-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#bff4f0" />
      <circle cx="12" cy="12" r="4.4" fill="#4cb7d6" />
      <circle cx="17" cy="13" r="4.4" fill="#1f4e8a" />
    </>
  ),

  'card-lava-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#fde65b" />
      <circle cx="12" cy="12" r="4.4" fill="#ee4c2c" />
      <circle cx="17" cy="13" r="4.4" fill="#241010" />
    </>
  ),

  'card-ice-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#ffffff" />
      <circle cx="12" cy="12" r="4.4" fill="#bce8ff" />
      <circle cx="17" cy="13" r="4.4" fill="#6293c8" />
    </>
  ),

  'card-cyberpunk-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#ff2bd6" />
      <circle cx="12" cy="12" r="4.4" fill="#1d0938" />
      <circle cx="17" cy="13" r="4.4" fill="#3cf3ff" />
    </>
  ),

  'card-pastel-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#ffd6e0" />
      <circle cx="12" cy="12" r="4.4" fill="#c4e7ff" />
      <circle cx="17" cy="13" r="4.4" fill="#d8f5c4" />
    </>
  ),

  'card-neon-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#39ff14" />
      <circle cx="12" cy="12" r="4.4" fill="#ff14b8" />
      <circle cx="17" cy="13" r="4.4" fill="#14e0ff" />
    </>
  ),

  'card-forest-palette': () => (
    <>
      <circle cx="7" cy="11" r="4.4" fill="#cfe690" />
      <circle cx="12" cy="12" r="4.4" fill="#4d9a3f" />
      <circle cx="17" cy="13" r="4.4" fill="#1f4624" />
    </>
  ),

  'card-palette-themed': () => (
    <>
      {/* three thumb chips suggesting preset gallery */}
      <rect x="3.2" y="6" width="5.4" height="12" rx="1.4" fill="#f48049" />
      <rect x="9.3" y="6" width="5.4" height="12" rx="1.4" fill="#4cb7d6" />
      <rect x="15.4" y="6" width="5.4" height="12" rx="1.4" fill="#9d4eea" />
      <circle cx="5.9" cy="9.4" r="0.9" fill="#ffe9c2" opacity="0.85" />
      <circle cx="12.0" cy="9.4" r="0.9" fill="#ffe9c2" opacity="0.85" />
      <circle cx="18.1" cy="9.4" r="0.9" fill="#ffe9c2" opacity="0.85" />
    </>
  ),

  'card-four-gradient': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="8.6" height="8.6" rx="1.6" fill={c} />
      <rect x="12" y="3.4" width="8.6" height="8.6" rx="1.6" fill={cream} />
      <rect x="3.4" y="12" width="8.6" height="8.6" rx="1.6" fill={cream} opacity="0.55" />
      <rect x="12" y="12" width="8.6" height="8.6" rx="1.6" fill={c} opacity="0.6" />
    </>
  ),

  'card-duotone': ({ c, cream }) => (
    <>
      <circle cx="9" cy="12" r="6.4" fill={c} />
      <circle cx="15" cy="12" r="6.4" fill={cream} opacity="0.88" />
      <circle cx="12" cy="12" r="2.4" fill={c} opacity="0.6" />
    </>
  ),

  'card-solid-color': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={c} />
      <circle cx="8" cy="8" r="1.6" fill={cream} opacity="0.5" />
    </>
  ),

  'card-d-as-rgb': () => (
    <>
      <rect x="3" y="6" width="6" height="12" rx="1.4" fill="#ff5a5a" />
      <rect x="9" y="6" width="6" height="12" rx="1.4" fill="#5ad06a" />
      <rect x="15" y="6" width="6" height="12" rx="1.4" fill="#5a9eff" />
    </>
  ),

  'card-tritone': ({ c, cream }) => (
    <>
      <path d="M12 3 L20.4 18 L3.6 18 Z" fill={cream} />
      <path d="M12 7 L17 17 L7 17 Z" fill={c} />
      <circle cx="12" cy="14" r="1.6" fill={cream} />
    </>
  ),

  'card-hue-shift': ({ cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill="#5a9eff" />
      <path d="M12 3.6 A8.4 8.4 0 0 1 20.4 12 L12 12 Z" fill="#ff5a5a" />
      <path d="M3.6 12 A8.4 8.4 0 0 1 12 3.6 L12 12 Z" fill="#5ad06a" />
      <path d="M12 12 L20.4 12 A8.4 8.4 0 0 1 12 20.4 Z" fill="#f9c54a" />
      <circle cx="12" cy="12" r="2.2" fill={cream} />
    </>
  ),

  'card-saturate': ({ c, cream }) => (
    <>
      <circle cx="8" cy="12" r="5" fill={c} opacity="0.35" />
      <circle cx="16" cy="12" r="5" fill={c} />
      <circle cx="16" cy="11" r="1.6" fill={cream} opacity="0.7" />
    </>
  ),

  'card-grayscale': ({ cream }) => (
    <>
      <circle cx="8" cy="12" r="5" fill="#bdbdbd" />
      <circle cx="16" cy="12" r="5" fill="#555" />
      <circle cx="6.6" cy="10.6" r="1.4" fill={cream} opacity="0.7" />
    </>
  ),

  'card-sepia': ({ cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill="#c2884a" />
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill="#5a3815" opacity="0.35" />
      <circle cx="8.4" cy="8.4" r="1.6" fill={cream} opacity="0.6" />
    </>
  ),

  'card-rainbow-d': () => (
    <>
      <path d="M3 20 A9 9 0 0 1 21 20" fill="none" stroke="#ff5a5a" strokeWidth="2.4" />
      <path d="M5 20 A7 7 0 0 1 19 20" fill="none" stroke="#f9c54a" strokeWidth="2.4" />
      <path d="M7 20 A5 5 0 0 1 17 20" fill="none" stroke="#5ad06a" strokeWidth="2.4" />
      <path d="M9 20 A3 3 0 0 1 15 20" fill="none" stroke="#5a9eff" strokeWidth="2.4" />
    </>
  ),

  'card-split-tone': ({ cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill="#f48049" />
      <path d="M3.4 12 H20.6 V20.6 H3.4 Z" fill="#1f4e8a" />
      <circle cx="8" cy="8" r="1.4" fill={cream} opacity="0.7" />
      <circle cx="16" cy="16.4" r="1.4" fill={cream} opacity="0.55" />
    </>
  ),

  // ────────────────────────────────── EFFECTS ──────────────────────────────

  'card-ascii': ({ c, cream }) => (
    <>
      {[[5,6],[10,6],[15,6],[20,6],[5,11],[10,11],[15,11],[20,11],[5,16],[10,16],[15,16],[20,16],[5,20.4],[10,20.4],[15,20.4],[20,20.4]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2 + ((i * 7) % 5) * 0.18} fill={i % 3 === 0 ? cream : c} opacity={0.6 + ((i * 3) % 4) * 0.1} />
      ))}
    </>
  ),

  'card-bloom': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="10" fill={c} opacity="0.22" />
      <circle cx="12" cy="12" r="7.2" fill={c} opacity="0.55" />
      <circle cx="12" cy="12" r="4.4" fill={cream} />
      <circle cx="13" cy="11" r="1.4" fill={c} />
    </>
  ),

  'card-chromatic-aberration': ({ cream }) => (
    <>
      <circle cx="9.6" cy="12" r="6.4" fill="#ff3b3b" opacity="0.7" />
      <circle cx="14.4" cy="12" r="6.4" fill="#3bbfff" opacity="0.7" />
      <circle cx="12" cy="12" r="6.4" fill={cream} opacity="0.5" />
    </>
  ),

  'card-contrast': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={cream} />
      <path d="M12 3.6 A8.4 8.4 0 0 1 12 20.4 Z" fill={c} />
      <circle cx="9" cy="9" r="1.2" fill={c} opacity="0.4" />
    </>
  ),

  'card-crt-curvature': ({ c, cream }) => (
    <>
      <path d="M3.6 6.4 Q12 4 20.4 6.4 V17.6 Q12 20 3.6 17.6 Z" fill={c} />
      <path d="M5 8 Q12 6.4 19 8 V11 Q12 9.6 5 11 Z" fill={cream} opacity="0.55" />
      <rect x="5" y="14" width="14" height="0.9" rx="0.4" fill={cream} opacity="0.35" />
      <rect x="5" y="16" width="14" height="0.9" rx="0.4" fill={cream} opacity="0.3" />
    </>
  ),

  'card-dim': ({ c }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} opacity="0.5" />
      <circle cx="12" cy="12" r="5.4" fill={c} opacity="0.35" />
      <circle cx="12" cy="12" r="2.4" fill={c} opacity="0.2" />
    </>
  ),

  'card-dither': ({ c, cream }) => (
    <>
      {[[5,6],[9,6],[13,6],[17,6],[7,9],[11,9],[15,9],[19,9],[5,12],[9,12],[13,12],[17,12],[7,15],[11,15],[15,15],[19,15],[5,18],[9,18],[13,18],[17,18]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="1.1" fill={i % 2 === 0 ? c : cream} opacity={i % 2 === 0 ? 0.95 : 0.4} />
      ))}
    </>
  ),

  'card-edge-detect': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={cream} opacity="0.18" />
      <path d="M6 6 L14 6 L18 12 L14 18 L6 18 Z" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="14" cy="12" r="1.4" fill={c} />
    </>
  ),

  'card-exposure': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="4.6" fill={c} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const x1 = 12 + Math.cos(r) * 6.8;
        const y1 = 12 + Math.sin(r) * 6.8;
        const x2 = 12 + Math.cos(r) * 10;
        const y2 = 12 + Math.sin(r) * 10;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" strokeLinecap="round" />;
      })}
      <circle cx="10.8" cy="10.8" r="1.4" fill={cream} />
    </>
  ),

  'card-film-grain-color': ({ c, cream }) => (
    <>
      {[[5,6,1.1],[8,5,0.9],[11,8,1.3],[14,6,1.0],[17,8,1.2],[19,11,1.0],[6,11,1.2],[10,10,0.9],[14,12,1.1],[18,14,1.0],[5,15,0.9],[9,16,1.2],[13,15,1.0],[17,17,1.1],[10,19,1.0],[15,19,0.9],[7,18,0.9]].map(([x,y,r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 5 === 0 ? '#ff6e6e' : i % 5 === 1 ? '#6effb0' : i % 5 === 2 ? '#6e9eff' : i % 5 === 3 ? cream : c} opacity={0.7 + (i % 3) * 0.1} />
      ))}
    </>
  ),

  'card-fog': ({ c, cream }) => (
    <>
      <ellipse cx="12" cy="9" rx="8.2" ry="2.4" fill={cream} opacity="0.7" />
      <ellipse cx="10" cy="13" rx="7.2" ry="2.2" fill={c} opacity="0.5" />
      <ellipse cx="14" cy="17" rx="6.6" ry="2" fill={cream} opacity="0.55" />
    </>
  ),

  'card-gamma': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.25" />
      <path d="M4 20 Q12 19 14 12 Q16 5 20 4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 20 L20 4" stroke={cream} strokeWidth="1.2" strokeDasharray="2 1.4" />
    </>
  ),

  'card-god-rays': ({ c, cream }) => (
    <>
      <circle cx="12" cy="6" r="3" fill={cream} />
      {[-25, -10, 5, 20, 35].map((a, i) => (
        <path key={i} d={`M12 7 L${12 + Math.tan((a * Math.PI) / 180) * 16} 22 L${12 + Math.tan(((a + 6) * Math.PI) / 180) * 16} 22 Z`} fill={c} opacity={0.35 + (i % 2) * 0.2} />
      ))}
    </>
  ),

  'card-halftone': ({ c }) => (
    <>
      {[[6,6,2.4],[12,6,1.8],[18,6,1.2],[6,12,1.8],[12,12,1.2],[18,12,0.8],[6,18,1.2],[12,18,0.8],[18,18,0.5]].map(([x,y,r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c} />
      ))}
    </>
  ),

  'card-overlay-noise': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={c} opacity="0.55" />
      {[[6,7,0.8],[10,5,0.7],[14,7,0.9],[17,9,0.8],[7,11,0.7],[12,12,0.9],[16,13,0.7],[8,15,0.8],[13,16,0.7],[17,17,0.9],[6,18,0.6],[11,18,0.7]].map(([x,y,r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 2 === 0 ? cream : '#000'} opacity={0.55} />
      ))}
    </>
  ),

  'card-pulse-brightness': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill={c} opacity="0.2" />
      <circle cx="12" cy="12" r="6.4" fill={c} opacity="0.55" />
      <circle cx="12" cy="12" r="3.4" fill={cream} />
      <path d="M2 12 L4 12 M20 12 L22 12" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),

  'card-pulse-hue': () => (
    <>
      <circle cx="7" cy="12" r="4.6" fill="#ff5a5a" opacity="0.85" />
      <circle cx="12" cy="12" r="4.6" fill="#5ad06a" opacity="0.85" />
      <circle cx="17" cy="12" r="4.6" fill="#5a9eff" opacity="0.85" />
    </>
  ),

  'card-radial-blur-fake': ({ c, cream }) => (
    <>
      {[10, 7.6, 5.2, 2.8].map((r, i) => (
        <circle key={i} cx="12" cy="12" r={r} fill="none" stroke={c} strokeWidth="1.4" opacity={0.3 + i * 0.18} />
      ))}
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),

  'card-sketch': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={cream} opacity="0.25" />
      <path d="M5 8 L19 8" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 11 L18 11" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <path d="M5 14 L17 14" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M7 17 L19 17" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
    </>
  ),

  'card-tint': ({ c, cream }) => (
    <>
      <path d="M12 3.6 Q19 12 16 17.6 Q12 21 8 17.6 Q5 12 12 3.6 Z" fill={c} />
      <path d="M11 7 Q14 11 13 14" fill="none" stroke={cream} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    </>
  ),

  'card-vhs-glitch': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.45" />
      <rect x="3.4" y="7.4" width="17.2" height="2.4" rx="0.4" fill="#ff3bbf" opacity="0.8" />
      <rect x="3.4" y="11.6" width="17.2" height="1.8" rx="0.4" fill="#3bbfff" opacity="0.7" />
      <rect x="3.4" y="15.6" width="14" height="2.2" rx="0.4" fill={cream} opacity="0.55" />
    </>
  ),

  // ──────────────────────── EXTRA SDFs (Part 2 set 1) ──────────────────────

  'card-vesica': ({ c, cream }) => (
    <>
      <circle cx="9" cy="12" r="6.4" fill={c} opacity="0.55" />
      <circle cx="15" cy="12" r="6.4" fill={c} opacity="0.55" />
      <path d="M12 6 Q15 12 12 18 Q9 12 12 6 Z" fill={cream} />
    </>
  ),

  'card-pie-slice': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={cream} opacity="0.35" />
      <path d="M12 12 L12 3.6 A8.4 8.4 0 0 1 19.4 16.4 Z" fill={c} />
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),

  'card-trapezoid': ({ c, cream }) => (
    <>
      <path d="M5 18 L19 18 L16 6.4 L8 6.4 Z" fill={c} />
      <path d="M9 9 L15 9 L14 14 L10 14 Z" fill={cream} opacity="0.6" />
    </>
  ),

  'card-parallelogram': ({ c, cream }) => (
    <>
      <path d="M6 6.6 L20 6.6 L18 17.4 L4 17.4 Z" fill={c} />
      <path d="M8 9 L17 9 L16 14 L7 14 Z" fill={cream} opacity="0.6" />
    </>
  ),

  'card-horseshoe': ({ c, cream }) => (
    <>
      <path d="M5.4 19 L5.4 12 A6.6 6.6 0 0 1 18.6 12 L18.6 19 L15.6 19 L15.6 12 A3.6 3.6 0 0 0 8.4 12 L8.4 19 Z" fill={c} />
      <circle cx="7" cy="17.6" r="0.9" fill={cream} opacity="0.7" />
      <circle cx="17" cy="17.6" r="0.9" fill={cream} opacity="0.7" />
    </>
  ),

  // ─────────────────────────── TONEMAPPING ─────────────────────────────────

  'card-aces-tonemap': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.22" />
      <path d="M4 20 Q9 19 12 14 Q15 9 20 6" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4 20 L20 4" stroke={cream} strokeWidth="1.1" strokeDasharray="1.8 1.4" opacity="0.6" />
      <circle cx="4" cy="20" r="1.2" fill={cream} />
      <circle cx="20" cy="6" r="1.2" fill={cream} />
    </>
  ),

  'card-filmic-tonemap': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.22" />
      <path d="M4 20 Q7 19.5 9 17 Q12 11 15 8 Q18 5.6 20 5" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      {/* film perforations */}
      <rect x="2.4" y="6" width="1.4" height="1.4" rx="0.3" fill={cream} />
      <rect x="2.4" y="11" width="1.4" height="1.4" rx="0.3" fill={cream} />
      <rect x="2.4" y="16" width="1.4" height="1.4" rx="0.3" fill={cream} />
      <rect x="20.2" y="6" width="1.4" height="1.4" rx="0.3" fill={cream} />
      <rect x="20.2" y="11" width="1.4" height="1.4" rx="0.3" fill={cream} />
      <rect x="20.2" y="16" width="1.4" height="1.4" rx="0.3" fill={cream} />
    </>
  ),

  'card-linear-to-srgb': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="8.6" height="17.2" rx="2.4" fill={c} opacity="0.45" />
      <rect x="12" y="3.4" width="8.6" height="17.2" rx="2.4" fill={c} />
      <text x="7.3" y="14" fill={cream} fontSize="5" fontFamily="ui-monospace, monospace" fontWeight="700">L</text>
      <text x="15.4" y="14" fill={cream} fontSize="5" fontFamily="ui-monospace, monospace" fontWeight="700">γ</text>
    </>
  ),

  'card-reinhard-tonemap': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.22" />
      <path d="M4 20 Q10 18 14 12 Q17 7 20 7" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="7" r="1.2" fill={cream} />
      <path d="M4 7 L20 7" stroke={cream} strokeWidth="0.9" strokeDasharray="1.4 1.4" opacity="0.55" />
    </>
  ),

  // ─────────────────────────── LIGHTING ────────────────────────────────────

  'card-fresnel': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} opacity="0.25" />
      <circle cx="12" cy="12" r="8.4" fill="none" stroke={cream} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="5" fill={c} opacity="0.7" />
      <circle cx="10.8" cy="10.6" r="1.4" fill={cream} opacity="0.8" />
    </>
  ),

  'card-blinn-phong': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <ellipse cx="9.4" cy="9.2" rx="3" ry="2" fill={cream} opacity="0.9" />
      <ellipse cx="14.6" cy="15.2" rx="1.4" ry="0.9" fill={cream} opacity="0.55" />
    </>
  ),

  'card-ambient-occlusion': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={cream} opacity="0.55" />
      <circle cx="8" cy="8" r="4" fill="#000" opacity="0.35" />
      <circle cx="16" cy="16" r="4" fill="#000" opacity="0.35" />
      <circle cx="8" cy="8" r="2.8" fill={c} />
      <circle cx="16" cy="16" r="2.8" fill={c} />
    </>
  ),

  'card-soft-shadow': ({ c, cream }) => (
    <>
      <circle cx="9" cy="9" r="4.4" fill={c} />
      <path d="M11.4 11.4 Q18 12 19.6 18 Q16 19 12.8 17.4 Q10 14.4 11.4 11.4 Z" fill="#000" opacity="0.45" />
      <circle cx="7.8" cy="7.8" r="1.4" fill={cream} opacity="0.7" />
    </>
  ),

  // ─────────────────── DISTORTIONS / TECHNIQUES ────────────────────────────

  'card-onion': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <circle cx="12" cy="12" r="6.4" fill={cream} />
      <circle cx="12" cy="12" r="4.4" fill={c} opacity="0.85" />
      <circle cx="12" cy="12" r="2.4" fill={cream} />
      <circle cx="12" cy="12" r="0.8" fill={c} />
    </>
  ),

  'card-smooth-intersection': ({ c, cream }) => (
    <>
      <circle cx="9" cy="12" r="6.4" fill={c} opacity="0.55" />
      <circle cx="15" cy="12" r="6.4" fill={c} opacity="0.55" />
      <path d="M12 6.2 Q15.2 9 15.2 12 Q15.2 15 12 17.8 Q8.8 15 8.8 12 Q8.8 9 12 6.2 Z" fill={cream} />
    </>
  ),

  'card-antialiased-step': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" fill={cream} />
      <path d="M3.4 20.6 L11 20.6 L13 3.4 L20.6 3.4 L20.6 20.6 Z" fill={c} />
      <path d="M11 20.6 L13 3.4" stroke={cream} strokeWidth="1.2" opacity="0.45" />
    </>
  ),

  'card-mirror-repeat': ({ c, cream }) => (
    <>
      <path d="M8 3.6 L8 20.4" stroke={cream} strokeWidth="0.9" strokeDasharray="1.6 1.4" opacity="0.55" />
      <path d="M16 3.6 L16 20.4" stroke={cream} strokeWidth="0.9" strokeDasharray="1.6 1.4" opacity="0.55" />
      <path d="M3.6 7 L7.6 7 L7.6 17 L3.6 17 Z" fill={c} />
      <path d="M8.4 7 L15.6 7 L15.6 17 L8.4 17 Z" fill={c} opacity="0.6" transform="scale(-1 1) translate(-24 0)" />
      <path d="M16.4 7 L20.4 7 L20.4 17 L16.4 17 Z" fill={c} />
      <circle cx="5.6" cy="9.6" r="1" fill={cream} />
      <circle cx="18.4" cy="9.6" r="1" fill={cream} />
    </>
  ),

  // ─────────────────────────── REMAPS ──────────────────────────────────────

  'card-remap': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.25" />
      <rect x="4.4" y="8" width="6.4" height="2.6" rx="0.6" fill={cream} />
      <rect x="13.2" y="13.4" width="6.4" height="2.6" rx="0.6" fill={c} />
      <path d="M10.8 9.4 L13.2 14.6" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="13.2" cy="14.6" r="1.2" fill={cream} />
    </>
  ),

  'card-cubic-smoothstep': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.22" />
      <path d="M4 20 L8 20 Q12 20 12 12 Q12 4 16 4 L20 4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),

  'card-sigmoid-curve': ({ c, cream }) => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.4" fill={c} opacity="0.22" />
      <path d="M4 20 Q10 20 11.6 14 Q13.2 8 19 4 L20 4" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1.6" fill={cream} />
    </>
  ),
};
