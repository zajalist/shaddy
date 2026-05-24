import type { CSSProperties, ReactNode } from 'react';
import { SHADE } from './tokens';
import { CARD_ICON_PATHS } from './card-icons';

// Flat-multicolor icon set (iconshock-style).
// Design rules:
//   - Solid filled shapes, NO outline strokes (except hairline depth marks).
//   - 2-3 colors per icon: primary (cat color or passed `c`), cream highlight,
//     darker shadow (semitransparent black) for layered depth.
//   - Slight tilts (~-3°) on inner shapes for hand-set personality.
//   - Rounded corners everywhere — no sharp points.
//   - UI icons fall back to duotone (c + cream) so they read on dark bars.

type IconRenderArgs = { c: string; cream: string; ink: string };
type IconRenderer = (args: IconRenderArgs) => ReactNode;

// Subtle layered shadow used for depth across all icons
const SHADOW = 'rgba(0,0,0,0.22)';

const ICON_PATHS: Record<string, IconRenderer> = {
  // ─── BLOCK ICONS — full flat-multicolor ────────────────────────────────
  'b-circle': ({ c, cream }) => (
    <>
      <circle cx="12.3" cy="12.6" r="8.4" fill={SHADOW} />
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <circle cx="14.4" cy="9.6" r="2.8" fill={cream} />
      <circle cx="10" cy="14.2" r="1.4" fill={cream} opacity="0.55" />
    </>
  ),
  'b-stripes': ({ c, cream }) => (
    <>
      <rect x="3" y="5.5" width="17" height="3.6" rx="1.8" fill={c} />
      <rect x="4" y="10.4" width="16" height="3.6" rx="1.8" fill={cream} />
      <rect x="3.5" y="15.3" width="15" height="3.6" rx="1.8" fill={c} opacity="0.55" />
    </>
  ),
  'b-voronoi': ({ c, cream }) => (
    <>
      <path d="M5.4 8 Q3 13 6.4 17 Q11.6 18.6 13 15.4 Q11 13 10.2 10 Q9 6.6 5.4 8 Z" fill={c} />
      <path d="M13 15.4 Q16.4 19 19.2 15.4 Q21.4 11.6 18.2 8.4 Q14.4 7.4 13 10.4 Q11 13 13 15.4 Z" fill={cream} />
      <circle cx="8.4" cy="13" r="1.3" fill={cream} />
      <circle cx="16.4" cy="12.4" r="1.3" fill={c} opacity="0.6" />
    </>
  ),
  'b-grid': ({ c, cream }) => (
    <>
      {[[6,6],[12,5.6],[18,6.4],[5.6,12],[12,12],[18,12],[6,18],[12,18.2],[18,17.8]].map(([x,y],i) => {
        const isCenter = i === 4;
        return (
          <circle
            key={i} cx={x} cy={y}
            r={isCenter ? 2.4 : 1.7 + (i%3)*0.15}
            fill={isCenter ? cream : c}
            opacity={isCenter ? 1 : (0.6 + (i%3)*0.13)}
          />
        );
      })}
    </>
  ),
  'b-noise': ({ c, cream }) => (
    <>
      {[[6,7,1.5,1],[10,5,1.1,0.7],[15,8,1.7,0.9],[18,11,1.3,0.6],[7,12,1.6,1],[13,13,1.2,0.85],[16,16,1.6,1],[9,17,1.4,0.7],[5,15,1,0.5],[20,15,1.3,0.9],[11,9,1.4,0.6],[14,11,1,0.4]].map(([x,y,r,op],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? cream : c} opacity={op} />
      ))}
    </>
  ),
  'b-ripple': ({ c, cream }) => (
    <>
      <path d="M3 7  Q6.5 3 10 7  T17 7  T21 7"  fill="none" stroke={c}     strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <path d="M3 12 Q6.5 8 10 12 T17 12 T21 12" fill="none" stroke={cream} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17 Q6.5 13 10 17 T17 17 T21 17" fill="none" stroke={c}     strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'b-swirl': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <path
        d="M12 5 A7 7 0 1 1 5 12 A5 5 0 1 1 12 7 A3.4 3.4 0 1 1 8.6 12"
        fill="none" stroke={cream} strokeWidth="2.4" strokeLinecap="round"
      />
      <circle cx="12" cy="10.6" r="1.6" fill={cream} />
    </>
  ),
  'b-kaleido': ({ c, cream }) => (
    <>
      <path d="M12 3 L20.5 17 L3.5 17 Z" fill={c} />
      <path d="M12 21 L3.5 7 L20.5 7 Z" fill={cream} opacity="0.85" />
      <circle cx="12" cy="12" r="2" fill={c} />
    </>
  ),
  'b-warp': ({ c, cream }) => (
    <>
      <path d="M2.5 6 Q8 3 12 6.5 T21.5 6.5 V9 Q16 12 12 9 T2.5 8.5 Z" fill={c} />
      <path d="M2.5 11 Q8 8 12 11.5 T21.5 11.5 V14 Q16 17 12 14 T2.5 13.5 Z" fill={cream} />
      <path d="M2.5 16 Q8 13 12 16.5 T21.5 16.5 V19 Q16 22 12 19 T2.5 18.5 Z" fill={c} opacity="0.55" />
    </>
  ),
  'b-palette': ({ c, cream }) => (
    <>
      <circle cx="8.5" cy="9" r="5.4" fill={c} />
      <circle cx="15.5" cy="10" r="5.4" fill={cream} />
      <circle cx="11" cy="15.5" r="5.4" fill={c} opacity="0.6" />
      <circle cx="11" cy="11.5" r="1.4" fill={cream} opacity="0.7" />
    </>
  ),
  'b-hue': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={c} />
      <path d="M12 3.6 A8.4 8.4 0 0 1 20.4 12 L12 12 Z" fill={cream} />
      <path d="M3.6 12 A8.4 8.4 0 0 1 12 3.6 L12 12 Z" fill={c} opacity="0.55" />
      <circle cx="12" cy="12" r="3" fill={cream} />
      <circle cx="12" cy="12" r="1.2" fill={c} />
    </>
  ),
  'b-invert': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8.4" fill={cream} />
      <path d="M12 3.6 A8.4 8.4 0 0 1 12 20.4 Z" fill={c} />
    </>
  ),
  'b-contrast': ({ c, cream }) => (
    <>
      <rect x="3.4" y="5.6" width="7.6" height="12.8" rx="2" fill={c} />
      <rect x="13" y="5.6" width="7.6" height="12.8" rx="2" fill={cream} />
      <rect x="3.4" y="5.6" width="7.6" height="3.6" rx="2" fill={cream} opacity="0.18" />
    </>
  ),
  'b-glow': ({ c, cream, ink }) => (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const r = (a * Math.PI) / 180;
        const x1 = 12 + Math.cos(r) * 7.4;
        const y1 = 12 + Math.sin(r) * 7.4;
        const x2 = 12 + Math.cos(r) * 11;
        const y2 = 12 + Math.sin(r) * 11;
        return (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i % 2 ? c : ink}
            strokeWidth="3" strokeLinecap="round"
            opacity={i % 2 ? 1 : 0.5}
          />
        );
      })}
      <circle cx="12" cy="12" r="5.2" fill={c} />
      <circle cx="13" cy="11" r="2.4" fill={cream} />
    </>
  ),
  'b-bloom': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill={c} opacity="0.32" />
      <circle cx="12" cy="12" r="6.8" fill={c} opacity="0.65" />
      <circle cx="12" cy="12" r="4.6" fill={cream} />
      <circle cx="11" cy="11" r="1.4" fill={c} />
    </>
  ),
  'b-feedback': ({ c, cream }) => (
    <>
      <rect x="2.8" y="2.8" width="18.4" height="18.4" rx="3.4" fill={c} opacity="0.35" />
      <rect x="5.8" y="5.8" width="12.4" height="12.4" rx="2.6" fill={c} opacity="0.7" />
      <rect x="8.6" y="8.6" width="6.8" height="6.8" rx="1.8" fill={cream} />
      <rect x="10.6" y="10.6" width="2.8" height="2.8" rx="0.6" fill={c} />
    </>
  ),
  'b-grain': ({ c, cream }) => (
    <>
      {[[5,7,1.3],[8,5,1.0],[12,8,1.5],[16,6,1.2],[19,9,1.4],[6,12,1.5],[10,11,1.1],[14,13,1.4],[18,12,1.2],[5,16,1.1],[9,18,1.4],[13,17,1.3],[17,18,1.4],[11,15,1.1],[15,16,1.3],[7,9,1.0],[20,15,1.2]].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 4 === 0 ? cream : c} opacity={0.65 + (i%3)*0.12} />
      ))}
    </>
  ),

  // ─── CATEGORY ICONS ────────────────────────────────────────────────────
  'cat-shape': ({ c, cream }) => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.6" fill={c} />
      <circle cx="9" cy="10" r="1.4" fill={cream} />
      <circle cx="15" cy="10" r="1.4" fill={cream} />
      <path d="M9 14 Q12 16.4 15 14" fill="none" stroke={cream} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  'cat-distort': ({ c, cream }) => (
    <>
      <path d="M3 12 Q7 5 12 12 T21 12 V15 Q17 22 12 15 T3 15 Z" fill={c} />
      <path d="M3 12 Q7 5 12 12 T21 12 L21 13 Q17 6 12 13 T3 13 Z" fill={cream} opacity="0.5" />
    </>
  ),
  'cat-color': ({ c, cream }) => (
    <>
      <circle cx="9" cy="10" r="5.4" fill={c} />
      <circle cx="15" cy="13" r="5.4" fill={cream} />
      <circle cx="11" cy="11.5" r="1.4" fill={c} opacity="0.5" />
    </>
  ),
  'cat-effect': ({ c, cream }) => (
    <>
      <path d="M12 2.8 L13.6 10 L20.8 11.6 L13.6 13.2 L12 20.4 L10.4 13.2 L3.2 11.6 L10.4 10 Z" fill={c} />
      <path d="M12 6 L12.8 10.4 L17.2 11.6 L12.8 12.8 L12 17.2 L11.2 12.8 L6.8 11.6 L11.2 10.4 Z" fill={cream} />
    </>
  ),

  // ─── UI ICONS — solid duotone so they read on any bar ──────────────────
  'metro': ({ c, cream }) => (
    <>
      <path d="M7.6 4.6 L16.4 4.6 L19.4 20.4 L4.6 20.4 Z" fill={c} />
      <path d="M7.6 4.6 L16.4 4.6 L17 8 L7 8 Z" fill={cream} opacity="0.35" />
      <path d="M11 12 L17 5 L17.6 5.8 L11.6 13 Z" fill={cream} />
      <circle cx="11.3" cy="12.6" r="2.2" fill={cream} />
    </>
  ),
  'camera': ({ c, cream }) => (
    <>
      <path d="M7.6 5.4 L9 3.6 L15 3.6 L16.4 5.4 Z" fill={c} />
      <rect x="2.6" y="5.4" width="18.8" height="14.4" rx="2.8" fill={c} />
      <circle cx="12" cy="13" r="4.6" fill={cream} />
      <circle cx="12" cy="13" r="2.4" fill={c} />
      <circle cx="18.2" cy="8.8" r="1.2" fill={cream} />
    </>
  ),
  'code': ({ c, cream }) => (
    <>
      <path d="M9.4 5.6 L4 12 L9.4 18.4 L11 16.8 L7 12 L11 7.2 Z" fill={c} />
      <path d="M14.6 5.6 L20 12 L14.6 18.4 L13 16.8 L17 12 L13 7.2 Z" fill={c} />
      <circle cx="12" cy="12" r="1.4" fill={cream} />
    </>
  ),
  'share': ({ c, cream }) => (
    <>
      <path d="M4.4 11.6 H8 V19.4 A1.4 1.4 0 0 0 9.4 20.8 H14.6 A1.4 1.4 0 0 0 16 19.4 V11.6 H19.6 L12 3.4 Z" fill={c} />
      <path d="M9.6 11.6 V18.8 H14.4 V11.6 H16.8 L12 6.4 L7.2 11.6 Z" fill={cream} opacity="0.35" />
    </>
  ),
  'dots': ({ c }) => (
    <>
      <circle cx="5"  cy="12" r="2.2" fill={c} />
      <circle cx="12" cy="12" r="2.2" fill={c} />
      <circle cx="19" cy="12" r="2.2" fill={c} />
    </>
  ),
  'menu': ({ c }) => (
    <>
      <rect x="3.4" y="5.6" width="17.2" height="2.8" rx="1.4" fill={c} />
      <rect x="3.4" y="10.6" width="14"   height="2.8" rx="1.4" fill={c} />
      <rect x="3.4" y="15.6" width="11"   height="2.8" rx="1.4" fill={c} />
    </>
  ),
  'plus': ({ c }) => (
    <>
      <rect x="10.6" y="3.6" width="2.8" height="16.8" rx="1.4" fill={c} />
      <rect x="3.6" y="10.6" width="16.8" height="2.8" rx="1.4" fill={c} />
    </>
  ),
  'close': ({ c }) => (
    <>
      <rect x="11" y="3.6" width="2" height="16.8" rx="1" fill={c} transform="rotate(45 12 12)" />
      <rect x="11" y="3.6" width="2" height="16.8" rx="1" fill={c} transform="rotate(-45 12 12)" />
    </>
  ),
  'chevron': ({ c }) => (
    <>
      <rect x="3.4" y="10.6" width="11" height="2.8" rx="1.4" fill={c} transform="rotate(45 9 12)" />
      <rect x="9.6" y="10.6" width="11" height="2.8" rx="1.4" fill={c} transform="rotate(-45 15 12)" />
    </>
  ),
  'search': ({ c, cream }) => (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" fill={c} />
      <circle cx="10.8" cy="10.8" r="4" fill={cream} />
      <rect x="14.6" y="14.4" width="8" height="2.8" rx="1.4" fill={c} transform="rotate(45 14.6 14.4)" />
      <circle cx="9.2" cy="9.2" r="1.2" fill={c} opacity="0.4" />
    </>
  ),
  'play': ({ c, cream }) => (
    <>
      <path d="M6.6 4.4 L20.4 12 L6.6 19.6 Z" fill={c} />
      <path d="M6.6 4.4 L13 8 L6.6 12 Z" fill={cream} opacity="0.35" />
    </>
  ),
  'record': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9.4" fill={c} opacity="0.35" />
      <circle cx="12" cy="12" r="5.6" fill={c} />
      <circle cx="10.6" cy="10.6" r="1.6" fill={cream} opacity="0.7" />
    </>
  ),
  'trash': ({ c, cream }) => (
    <>
      <rect x="3.6" y="6" width="16.8" height="3.2" rx="1.6" fill={c} />
      <path d="M5.6 9.2 L6.8 20.4 A1.2 1.2 0 0 0 8 21.4 H16 A1.2 1.2 0 0 0 17.2 20.4 L18.4 9.2 Z" fill={c} />
      <path d="M7 12 L7.8 19.6 H16.2 L17 12 Z" fill={cream} opacity="0.3" />
      <rect x="9.2" y="3.4" width="5.6" height="2.6" rx="1" fill={c} />
      <rect x="9.4" y="12" width="1.4" height="6.4" rx="0.6" fill={cream} opacity="0.55" />
      <rect x="13.2" y="12" width="1.4" height="6.4" rx="0.6" fill={cream} opacity="0.55" />
    </>
  ),
  'sparkle': ({ c, cream }) => (
    <>
      <path d="M12 2.6 L13.6 10 L20.8 11.6 L13.6 13.2 L12 20.4 L10.4 13.2 L3.2 11.6 L10.4 10 Z" fill={c} />
      <path d="M12 6 L12.8 10.4 L17.2 11.6 L12.8 12.8 L12 17.2 L11.2 12.8 L6.8 11.6 L11.2 10.4 Z" fill={cream} />
    </>
  ),
  'lock': ({ c, cream }) => (
    <>
      <path d="M7.4 11 V8 A4.6 4.6 0 0 1 16.6 8 V11 H14.2 V8 A2.2 2.2 0 0 0 9.8 8 V11 Z" fill={c} />
      <rect x="3.6" y="10.6" width="16.8" height="10" rx="2.4" fill={c} />
      <rect x="3.6" y="10.6" width="16.8" height="3.2" rx="2.4" fill={cream} opacity="0.22" />
      <circle cx="12" cy="14.8" r="1.8" fill={cream} />
      <rect x="11" y="14.8" width="2" height="3.6" rx="0.8" fill={cream} />
    </>
  ),
  'arrow-down-right': ({ c, cream }) => (
    <>
      <path d="M3.6 3.6 H6.4 V12 A2.6 2.6 0 0 0 9 14.6 H19 V17.4 H9 A5.4 5.4 0 0 1 3.6 12 Z" fill={c} />
      <path d="M14.4 10.8 L20.4 16 L14.4 21.2 Z" fill={c} />
      <path d="M14.4 12.4 L18.8 16 L14.4 19.6 Z" fill={cream} opacity="0.35" />
    </>
  ),
  'arrow-up-left': ({ c, cream }) => (
    <>
      <path d="M20.4 3.6 H17.6 V12 A2.6 2.6 0 0 1 15 14.6 H5 V17.4 H15 A5.4 5.4 0 0 0 20.4 12 Z" fill={c} />
      <path d="M9.6 10.8 L3.6 16 L9.6 21.2 Z" fill={c} />
      <path d="M9.6 12.4 L5.2 16 L9.6 19.6 Z" fill={cream} opacity="0.35" />
    </>
  ),

  // GitHub Octocat-style mark — flat duotone, chunky body + tentacles +
  // two visible eyes. Same shadow-and-highlight idiom as the rest of the set.
  'github-octocat': ({ c, cream }) => (
    <>
      {/* shadow drop */}
      <path
        d="M12.3 3.4 C7.2 3.4 3.1 7.5 3.1 12.6 c0 4.05 2.62 7.48 6.26 8.7 0.46 0.08 0.62 -0.2 0.62 -0.44 v-1.55 c-2.55 0.55 -3.08 -1.22 -3.08 -1.22 -0.42 -1.06 -1.02 -1.34 -1.02 -1.34 -0.84 -0.57 0.06 -0.56 0.06 -0.56 0.92 0.07 1.4 0.95 1.4 0.95 0.82 1.4 2.15 1 2.68 0.76 0.08 -0.6 0.32 -1 0.58 -1.23 -2.04 -0.23 -4.18 -1.02 -4.18 -4.55 0 -1 0.36 -1.82 0.94 -2.46 -0.1 -0.23 -0.41 -1.17 0.09 -2.44 0 0 0.77 -0.25 2.52 0.94 0.73 -0.2 1.51 -0.3 2.3 -0.3 0.78 0 1.57 0.1 2.3 0.3 1.74 -1.19 2.5 -0.94 2.5 -0.94 0.5 1.27 0.19 2.21 0.1 2.44 0.58 0.64 0.94 1.46 0.94 2.46 0 3.54 -2.14 4.31 -4.19 4.54 0.33 0.29 0.62 0.85 0.62 1.72 v2.55 c0 0.25 0.16 0.54 0.62 0.44 3.64 -1.22 6.25 -4.66 6.25 -8.7 0 -5.1 -4.13 -9.2 -9.2 -9.2 Z"
        fill={SHADOW}
      />
      {/* main body */}
      <path
        d="M12 3 C6.9 3 2.8 7.1 2.8 12.2 c0 4.05 2.62 7.48 6.26 8.7 0.46 0.08 0.62 -0.2 0.62 -0.44 v-1.55 c-2.55 0.55 -3.08 -1.22 -3.08 -1.22 -0.42 -1.06 -1.02 -1.34 -1.02 -1.34 -0.84 -0.57 0.06 -0.56 0.06 -0.56 0.92 0.07 1.4 0.95 1.4 0.95 0.82 1.4 2.15 1 2.68 0.76 0.08 -0.6 0.32 -1 0.58 -1.23 -2.04 -0.23 -4.18 -1.02 -4.18 -4.55 0 -1 0.36 -1.82 0.94 -2.46 -0.1 -0.23 -0.41 -1.17 0.09 -2.44 0 0 0.77 -0.25 2.52 0.94 0.73 -0.2 1.51 -0.3 2.3 -0.3 0.78 0 1.57 0.1 2.3 0.3 1.74 -1.19 2.5 -0.94 2.5 -0.94 0.5 1.27 0.19 2.21 0.1 2.44 0.58 0.64 0.94 1.46 0.94 2.46 0 3.54 -2.14 4.31 -4.19 4.54 0.33 0.29 0.62 0.85 0.62 1.72 v2.55 c0 0.25 0.16 0.54 0.62 0.44 3.64 -1.22 6.25 -4.66 6.25 -8.7 0 -5.1 -4.13 -9.2 -9.2 -9.2 Z"
        fill={c}
      />
      {/* eyes — these animate via the `oct-eye` class hooked by Landing */}
      <g className="oct-eyes">
        <ellipse className="oct-eye oct-eye-l" cx="9.1"  cy="11.6" rx="1.05" ry="1.25" fill={cream} />
        <ellipse className="oct-eye oct-eye-r" cx="14.9" cy="11.6" rx="1.05" ry="1.25" fill={cream} />
        <circle  cx="9.1"  cy="11.9" r="0.5" fill={c} />
        <circle  cx="14.9" cy="11.9" r="0.5" fill={c} />
      </g>
      {/* cheeky little smirk */}
      <path d="M10.4 14.4 Q12 15.4 13.6 14.4" fill="none" stroke={cream} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
    </>
  ),

  // ─── TOPBAR — minimal cartoony icon-only buttons ───────────────────────
  // "Photo → blocks" — chunky camera body with a DOMINANT round lens that
  // reads as PHOTO even at 14px. Lens fills ~60% of the canvas; tiny flash
  // dot top-right and a film-strip motif along the bottom edge sell it.
  'tb-photo': ({ c, cream }) => (
    <>
      {/* drop shadow for camera body */}
      <rect x="2.6" y="5.8" width="19" height="14" rx="3" fill={SHADOW} />
      {/* small viewfinder hump on top, slightly off-center for charisma */}
      <rect x="7.6" y="3.2" width="6.4" height="3" rx="0.9" fill={c} transform="rotate(-3 10.8 4.7)" />
      {/* main body — chunky rounded rectangle */}
      <rect x="2.2" y="5.4" width="19" height="14" rx="3" fill={c} />
      {/* highlight slab across the top for material depth */}
      <rect x="2.2" y="5.4" width="19" height="3" rx="3" fill={cream} opacity="0.22" />

      {/* LENS — dominant element. Outer cream ring, dark inner well, crescent glint */}
      <circle cx="11.6" cy="13" r="5.4" fill={SHADOW} />
      <circle cx="11.6" cy="13" r="5.4" fill={cream} />
      <circle cx="11.6" cy="13" r="3.8" fill={c} />
      {/* dark inner pupil so the lens reads as "glass" */}
      <circle cx="11.6" cy="13" r="2.4" fill="#000" opacity="0.55" />
      {/* crescent highlight on the lens — the readable "shine" */}
      <path d="M9.2 11 A3.6 3.6 0 0 1 12.6 9.8 A3 3 0 0 0 9.2 11 Z" fill={cream} opacity="0.85" />

      {/* tiny chunky FLASH dot in the upper-right corner */}
      <rect x="17.4" y="7.6" width="2.4" height="2.4" rx="0.6" fill={cream} />
      <rect x="17.7" y="7.9" width="1"   height="1"   rx="0.3" fill={c} opacity="0.6" />

      {/* FILM STRIP motif along the bottom edge — 4 tiny dark squares */}
      <rect x="3.6"  y="17.4" width="1.8" height="1.6" rx="0.3" fill="#000" opacity="0.55" />
      <rect x="6.2"  y="17.4" width="1.8" height="1.6" rx="0.3" fill="#000" opacity="0.55" />
      <rect x="15.2" y="17.4" width="1.8" height="1.6" rx="0.3" fill="#000" opacity="0.55" />
      <rect x="17.8" y="17.4" width="1.8" height="1.6" rx="0.3" fill="#000" opacity="0.55" />
    </>
  ),

  // "Paste GLSL" — chunky clipboard with a DOMINANT </> glyph at its center
  // and two wavy "code lines" below. The </> is what users read first, so it
  // sells the "paste CODE" intent immediately even at 14px.
  'tb-paste': ({ c, cream }) => (
    <>
      {/* drop shadow */}
      <rect x="4.6" y="4.8" width="15" height="15.4" rx="2.4" fill={SHADOW} />
      {/* clipboard body */}
      <rect x="4.2" y="4.2" width="15" height="15.4" rx="2.4" fill={c} />
      {/* highlight slab top */}
      <rect x="4.2" y="4.2" width="15" height="3.4" rx="2.4" fill={cream} opacity="0.2" />

      {/* fat clip strip at the top — chunky and centered */}
      <rect x="7.8" y="2.4" width="7.6" height="3.8" rx="1.2" fill={c} />
      <rect x="8.4" y="3"   width="6.4" height="1.4" rx="0.6" fill={cream} opacity="0.6" />

      {/* DOMINANT </> glyph in the middle — chunky chevrons + slash */}
      {/* left chevron < */}
      <path d="M9.4 9.6 L6.6 12.4 L9.4 15.2"
        fill="none" stroke={cream} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* right chevron > */}
      <path d="M14 9.6 L16.8 12.4 L14 15.2"
        fill="none" stroke={cream} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* slash through the middle */}
      <path d="M13 8.6 L10.4 16.2"
        stroke={cream} strokeWidth="2"
        strokeLinecap="round" />

      {/* two wavy "code lines" below the </> glyph */}
      <path d="M6.4 17.4 Q9 16.8 11.6 17.4 T16.8 17.4"
        fill="none" stroke={cream} strokeWidth="1.2"
        strokeLinecap="round" opacity="0.6" />
      <path d="M6.4 18.8 Q9 18.2 11.6 18.8 T14.8 18.8"
        fill="none" stroke={cream} strokeWidth="1.2"
        strokeLinecap="round" opacity="0.45" />
    </>
  ),

  // "Share recipe" — stylized share-arrow punching out of a square's side.
  // Reads as "send out" — chunky filled square + arrow with a tiny tilt.
  'tb-share': ({ c, cream }) => (
    <>
      {/* square shadow */}
      <rect x="3.6" y="6.6" width="11.4" height="13" rx="2.2" fill={SHADOW} />
      {/* square body */}
      <rect x="3.2" y="6.2" width="11.4" height="13" rx="2.2" fill={c} />
      {/* highlight slab */}
      <rect x="3.2" y="6.2" width="11.4" height="3" rx="2.2" fill={cream} opacity="0.22" />
      {/* arrow shaft punching out the right side, with slight tilt */}
      <g transform="rotate(-6 16 11)">
        <rect x="8.6" y="10.2" width="10.6" height="3" rx="1.2" fill={c} />
        <rect x="8.6" y="10.2" width="10.6" height="1.1" rx="0.6" fill={cream} opacity="0.5" />
      </g>
      {/* arrowhead — chunky triangle */}
      <path d="M17.4 7.4 L22.4 11.7 L17.4 16.0 Z" fill={c} />
      <path d="M18.4 9.2 L21 11.7 L18.4 14.2 Z" fill={cream} opacity="0.4" />
    </>
  ),

  // "Sign in" — outlined cartoony silhouette: chunky round head + shoulders.
  // Duotone (c body + cream highlight) so it reads on the dark topbar.
  'tb-signin': ({ c, cream }) => (
    <>
      {/* head shadow */}
      <circle cx="12.3" cy="8.6" r="3.7" fill={SHADOW} />
      {/* head */}
      <circle cx="12" cy="8.4" r="3.7" fill={c} />
      {/* cheek highlight */}
      <circle cx="13.2" cy="7.5" r="1.3" fill={cream} opacity="0.55" />
      {/* shoulders / torso — rounded "U" silhouette */}
      <path
        d="M4.2 20.4 C4.2 15.8 7.6 13.4 12 13.4 C16.4 13.4 19.8 15.8 19.8 20.4 Z"
        fill={SHADOW}
        transform="translate(0.3 0.4)"
      />
      <path
        d="M4 20 C4 15.4 7.4 13 12 13 C16.6 13 20 15.4 20 20 Z"
        fill={c}
      />
      {/* collar highlight slab across the top of the shoulders */}
      <path
        d="M6.6 16 C8.4 14.6 10 14.2 12 14.2 C14 14.2 15.6 14.6 17.4 16 L17 17.4 C15.4 16.2 13.8 15.8 12 15.8 C10.2 15.8 8.6 16.2 7 17.4 Z"
        fill={cream}
        opacity="0.35"
      />
    </>
  ),

  // "Ask Claude" — minimal AI glyph. A chunky cartoony chat bubble with a
  // sparkle inside, suggesting "AI thought". Duotone, reads at 14-18px.
  'ai-spark': ({ c, cream }) => (
    <>
      {/* bubble shadow */}
      <path
        d="M4.5 5.4 H19.5 A2.6 2.6 0 0 1 22.1 8 V15 A2.6 2.6 0 0 1 19.5 17.6 H11.2 L7.3 21.0 V17.6 H4.5 A2.6 2.6 0 0 1 1.9 15 V8 A2.6 2.6 0 0 1 4.5 5.4 Z"
        fill={SHADOW}
      />
      {/* bubble body */}
      <path
        d="M4 5 H19 A2.6 2.6 0 0 1 21.6 7.6 V14.6 A2.6 2.6 0 0 1 19 17.2 H10.7 L6.8 20.6 V17.2 H4 A2.6 2.6 0 0 1 1.4 14.6 V7.6 A2.6 2.6 0 0 1 4 5 Z"
        fill={c}
      />
      {/* highlight slab at the top */}
      <path d="M4 5 H19 A2.6 2.6 0 0 1 21.6 7.6 V8.6 H1.4 V7.6 A2.6 2.6 0 0 1 4 5 Z" fill={cream} opacity="0.22" />
      {/* big sparkle — 4-pointed star */}
      <path
        d="M11.5 7.4 L12.4 10.4 L15.4 11.1 L12.4 11.8 L11.5 14.8 L10.6 11.8 L7.6 11.1 L10.6 10.4 Z"
        fill={cream}
      />
      {/* tiny sparkle to the upper right for cluster-of-thought */}
      <path
        d="M16.6 9 L17 10.4 L18.4 10.8 L17 11.2 L16.6 12.6 L16.2 11.2 L14.8 10.8 L16.2 10.4 Z"
        fill={cream}
        opacity="0.7"
      />
    </>
  ),

  // Composer icon — TWO chunky puzzle pieces interlocking horizontally
  // with a clear tab-in-notch joint at the centre. At small navbar size the
  // previous three-stacked-tiles design collapsed visually into two
  // horizontal bars; this version reads as "puzzle pieces snapping" from
  // 16px upward. Sparkle in the top-right for charisma.
  'composer-blocks': ({ c, cream }) => (
    <>
      {/* soft drop shadow */}
      <g transform="translate(0.6 0.9)" opacity="0.32">
        <path d="M4 6 H10 V9 A1 1 0 0 0 11 10 A1 1 0 0 0 12 9 V6 H20 V18 H4 Z" fill={SHADOW} />
      </g>

      {/* LEFT piece — solid square with a TAB poking right at mid-height.
          Slightly tilted left for hand-drawn personality. */}
      <g transform="rotate(-2.5 7.2 12)">
        <path
          d="M3.2 5.2 H10.2 V10.4 A1.1 1.1 0 0 0 11.3 11.5 H12.3 A1.1 1.1 0 0 0 13.4 12.6 V13.4 A1.1 1.1 0 0 0 12.3 14.5 H11.3 A1.1 1.1 0 0 0 10.2 15.6 V18.6 H3.2 Z"
          fill={c}
        />
        <rect x="3.2" y="5.2" width="7" height="1.6" rx="0.7" fill={cream} opacity="0.4" />
      </g>

      {/* RIGHT piece — solid square with a NOTCH cut into its left at
          mid-height that exactly meets the left piece's tab. Tilted right. */}
      <g transform="rotate(2.5 16.8 12)">
        <path
          d="M20.8 5.2 H13.8 V10.4 A1.1 1.1 0 0 1 12.7 11.5 H11.7 A1.1 1.1 0 0 1 10.6 12.6 V13.4 A1.1 1.1 0 0 1 11.7 14.5 H12.7 A1.1 1.1 0 0 1 13.8 15.6 V18.6 H20.8 Z"
          fill={c} opacity="0.92"
        />
        <rect x="14" y="5.2" width="6.8" height="1.6" rx="0.7" fill={cream} opacity="0.36" />
      </g>

      {/* charisma sparkle top-right */}
      <path
        d="M20 3.6 L20.5 5.2 L22 5.6 L20.5 6 L20 7.6 L19.5 6 L18 5.6 L19.5 5.2 Z"
        fill={cream}
      />
    </>
  ),
};

export type IconProps = {
  name: string;
  size?: number;
  color?: string;
  cream?: string;
  style?: CSSProperties;
  className?: string;
  rotate?: number;
};

// Icons whose `name` doesn't match a known ICON_PATHS entry render as either
// an emoji glyph (when the name is a non-letter unicode codepoint, e.g. the
// emoji icons used by the real CardDef library) or a square placeholder.
function isLikelyEmoji(name: string): boolean {
  if (!name) return false;
  // Quick check: any character outside ASCII letters/digits/dashes that isn't
  // a known design-system slug (which all start with letters).
  const first = name.codePointAt(0) ?? 0;
  if (first <= 0x7f) return false; // ASCII
  return true;
}

// Combined registry: built-in design icons + per-card SVGs from card-icons.tsx.
// Card icons are looked up under the `card-<kebab-type>` namespace.
const ALL_ICONS: Record<string, IconRenderer> = { ...ICON_PATHS, ...CARD_ICON_PATHS };

export const Icon = ({ name, size = 20, color, cream, style, className, rotate }: IconProps) => {
  const c = color ?? 'currentColor';
  const k = cream ?? SHADE.cream;
  const renderer = ALL_ICONS[name];
  const baseStyle: CSSProperties = {
    display: 'block',
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
    ...style,
  };
  if (!renderer) {
    if (isLikelyEmoji(name)) {
      const emojiStyle: CSSProperties = {
        ...baseStyle,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.95),
        lineHeight: `${size}px`,
        textAlign: 'center',
        // Emoji rendering ignores `color`, but the box hue benefits from being
        // tied to the surrounding cat color via filter — too aggressive for
        // colour faithfulness, so leave the glyph alone.
      };
      return (
        <span style={emojiStyle} className={className} aria-hidden>
          {name}
        </span>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={baseStyle} className={className}>
        <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3.6" fill={c} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={baseStyle} className={className}>
      {renderer({ c, cream: k, ink: SHADE.inkLine })}
    </svg>
  );
};

export const ShadeLogo = ({ size = 22, gradient = true }: { size?: number; gradient?: boolean }) => (
  <svg width={size} height={size * (604 / 707)} viewBox="0 0 707 604" style={{ display: 'block' }}>
    {gradient && (
      <defs>
        <linearGradient id="shadeLogoGrad" x1="353" y1="0" x2="353" y2="604" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCB427" />
          <stop offset="1" stopColor="#966B17" />
        </linearGradient>
      </defs>
    )}
    <path
      d="M353.184 0C548.242 0 706.367 158.126 706.367 353.184C706.367 436.46 677.545 513.005 629.333 573.387C612.878 593.996 587.042 604 560.669 604H145.698C119.326 604 93.4897 593.996 77.0342 573.387C28.8218 513.005 0 436.46 0 353.184C0 158.126 158.126 0 353.184 0ZM351.635 300.516C272.072 300.516 207.573 365.015 207.573 444.578C207.573 524.141 272.072 588.64 351.635 588.64C431.198 588.64 495.696 524.141 495.696 444.578C495.696 365.015 431.198 300.516 351.635 300.516Z"
      fill={gradient ? 'url(#shadeLogoGrad)' : SHADE.gold}
    />
  </svg>
);

export const ShadeMascot = ({ size = 140 }: { size?: number }) => (
  <svg width={size} height={size * (700 / 1059)} viewBox="0 0 1059 700" style={{ display: 'block' }}>
    <defs>
      <linearGradient id="mascotGrad" x1="529.5" y1="0" x2="529.5" y2="700" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FCB427" />
        <stop offset="1" stopColor="#966B17" />
      </linearGradient>
    </defs>
    <path
      d="M341.523 0C370.459 0 393.635 24.757 398.917 53.206C408.236 103.4 437.886 171 530 171C622.114 171 651.764 103.4 661.083 53.206C666.365 24.757 689.541 0 718.477 0H830C857.614 0 880 22.386 880 50V246.349C897.616 235.957 918.118 230 940 230C1005.72 230 1059 283.726 1059 350C1059 416.274 1005.72 470 940 470C918.118 470 897.616 464.042 880 453.65V650C880 677.614 857.614 700 830 700H230C202.386 700 180 677.614 180 650V453.054C162.162 463.814 141.298 470 119 470C53.278 470 0 416.274 0 350C0 283.726 53.278 230 119 230C141.297 230 162.162 236.185 180 246.945V50C180 22.386 202.386 0 230 0H341.523Z"
      fill="url(#mascotGrad)"
    />
    <path d="M612.052 495.998C625.31 495.998 634.86 508.78 628.411 520.365C608.943 555.338 571.603 578.998 528.737 578.998C485.87 578.998 448.53 555.338 429.062 520.365C422.613 508.78 432.163 495.998 445.422 495.998H612.052Z" fill="#FEE7C7" fillOpacity="0.55" />
    <path d="M395.004 251.998C457.964 251.998 509.004 303.038 509.004 365.998C509.004 382.94 505.308 399.019 498.678 413.473C487.69 437.427 460.435 446.998 434.081 446.998H355.927C329.573 446.998 302.318 437.427 291.33 413.473C284.7 399.019 281.004 382.94 281.004 365.998C281.004 303.038 332.043 251.998 395.004 251.998ZM394.504 349.998C368.823 349.998 348.004 370.817 348.004 396.498C348.004 422.179 368.823 442.998 394.504 442.998C420.185 442.998 441.004 422.179 441.004 396.498C441.004 370.817 420.185 349.998 394.504 349.998Z" fill="#FEE7C7" fillOpacity="0.6" />
    <path d="M662.004 252.998C724.964 252.998 776.004 304.038 776.004 366.998C776.004 383.908 772.322 399.959 765.716 414.391C754.739 438.37 727.466 447.956 701.094 447.956H622.914C596.542 447.956 569.268 438.37 558.292 414.391C551.686 399.959 548.004 383.908 548.004 366.998C548.004 304.038 599.043 252.998 662.004 252.998ZM661.504 349.998C635.823 349.998 615.004 370.817 615.004 396.498C615.004 422.179 635.823 442.998 661.504 442.998C687.185 442.998 708.004 422.179 708.004 396.498C708.004 370.817 687.185 349.998 661.504 349.998Z" fill="#FEE7C7" fillOpacity="0.6" />
  </svg>
);
