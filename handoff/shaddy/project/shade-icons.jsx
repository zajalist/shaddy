// shade-icons.jsx — Custom cartoony SVG icon set.
// Shape language pulled from the Shade mascot: rounded everything, slight
// imperfection, occasional cream-filled "eye" inside a gold stroke. All icons
// share a 24×24 viewBox, stroke-width 2, round caps/joins. Inner cream fills
// echo the mascot's eyeballs and the logo's negative-space cutout.
//
// Usage: <Icon name="b-ripple" size={16} color={SHADE.catDistort} />

const ICON_PATHS = {
  // ─── Block icons ────────────────────────────────────────────────────────
  // Shapes
  'b-circle': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="3" fill={cream} stroke={c} strokeWidth="2"/>
    </>
  ),
  'b-stripes': ({ c }) => (
    <>
      <rect x="4"  y="6"  width="16" height="3" rx="1.5" fill={c}/>
      <rect x="4"  y="11" width="16" height="3" rx="1.5" fill={c} opacity="0.55"/>
      <rect x="4"  y="16" width="16" height="3" rx="1.5" fill={c} opacity="0.3"/>
    </>
  ),
  'b-voronoi': ({ c }) => (
    <>
      <path d="M5 8 Q3 13 6 17 Q11 19 13 16 Q11 13 10 10 Q9 7 5 8 Z" fill="none" stroke={c} strokeWidth="2"/>
      <path d="M13 16 Q16 19 19 16 Q21 12 18 8 Q14 7 13 10 Q11 13 13 16 Z" fill="none" stroke={c} strokeWidth="2"/>
      <circle cx="9" cy="13" r="1.2" fill={c}/>
      <circle cx="16" cy="12" r="1.2" fill={c}/>
    </>
  ),
  'b-grid': ({ c }) => (
    <>
      {[6,12,18].map((y,i) => [6,12,18].map((x,j) => (
        <circle key={`${i}-${j}`} cx={x} cy={y} r="1.6" fill={c} opacity={(i+j)%2 ? 0.6 : 1}/>
      )))}
    </>
  ),
  'b-noise': ({ c }) => (
    <>
      {[[6,7],[10,5],[15,8],[18,11],[7,12],[13,13],[16,16],[9,17],[5,15],[20,15],[11,9],[14,11]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={1.1 + (i%3)*0.3} fill={c} opacity={0.55 + (i%3)*0.15}/>
      ))}
    </>
  ),
  // Distortions
  'b-ripple': ({ c }) => (
    <>
      <path d="M3 12 Q6 8 9 12 T15 12 T21 12" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M3 16 Q6 12 9 16 T15 16 T21 16" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" opacity="0.55"/>
      <path d="M3 8  Q6 4 9 8 T15 8 T21 8"   fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" opacity="0.3"/>
    </>
  ),
  'b-swirl': ({ c, cream }) => (
    <>
      <path d="M12 4 A8 8 0 1 1 4 12 A6 6 0 1 1 12 6 A4 4 0 1 1 8 12 A2 2 0 1 1 12 10"
        fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="10" r="1.2" fill={cream} stroke={c} strokeWidth="1"/>
    </>
  ),
  'b-kaleido': ({ c, cream }) => (
    <>
      <path d="M12 4 L18.9 16 L5.1 16 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12 20 L5.1 8 L18.9 8 Z" fill={cream} opacity="0.55" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    </>
  ),
  'b-warp': ({ c }) => (
    <>
      <path d="M3 7 Q9 4 12 7 T21 7" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 12 Q9 9 12 12 T21 12" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <path d="M3 17 Q9 14 12 17 T21 17" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
    </>
  ),
  // Colors
  'b-palette': ({ c, cream }) => (
    <>
      <circle cx="9"  cy="9"  r="4.5" fill={c} opacity="0.85"/>
      <circle cx="15" cy="10" r="4.5" fill={cream} opacity="0.9"/>
      <circle cx="11" cy="15" r="4.5" fill={c} opacity="0.55"/>
      <circle cx="9"  cy="9"  r="4.5" fill="none" stroke={c} strokeWidth="1.5"/>
      <circle cx="15" cy="10" r="4.5" fill="none" stroke={c} strokeWidth="1.5"/>
      <circle cx="11" cy="15" r="4.5" fill="none" stroke={c} strokeWidth="1.5"/>
    </>
  ),
  'b-hue': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke={c} strokeWidth="2"/>
      <path d="M12 4.5 A7.5 7.5 0 0 1 19.5 12 L17 12 L19 14 L21 12" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2.2" fill={cream} stroke={c} strokeWidth="1.5"/>
    </>
  ),
  'b-invert': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="2"/>
      <path d="M12 4 A8 8 0 0 1 12 20 Z" fill={cream}/>
      <path d="M12 4 A8 8 0 0 1 12 20 Z" fill="none" stroke={c} strokeWidth="2"/>
    </>
  ),
  'b-contrast': ({ c, cream }) => (
    <>
      <rect x="4" y="6" width="7" height="12" rx="1.6" fill={c}/>
      <rect x="13" y="6" width="7" height="12" rx="1.6" fill={cream} stroke={c} strokeWidth="2"/>
    </>
  ),
  // Effects
  'b-glow': ({ c, cream }) => (
    <>
      {[0,45,90,135,180,225,270,315].map((a,i) => {
        const r = a * Math.PI / 180;
        const x1 = 12 + Math.cos(r) * 7, y1 = 12 + Math.sin(r) * 7;
        const x2 = 12 + Math.cos(r) * 10.5, y2 = 12 + Math.sin(r) * 10.5;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2" strokeLinecap="round"/>;
      })}
      <circle cx="12" cy="12" r="4" fill={cream} stroke={c} strokeWidth="2"/>
    </>
  ),
  'b-bloom': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke={c} strokeWidth="1.5" opacity="0.3"/>
      <circle cx="12" cy="12" r="7"   fill="none" stroke={c} strokeWidth="1.5" opacity="0.55"/>
      <circle cx="12" cy="12" r="4.5" fill={cream} stroke={c} strokeWidth="2"/>
    </>
  ),
  'b-feedback': ({ c }) => (
    <>
      <rect x="3.5"  y="3.5"  width="17" height="17" rx="3" fill="none" stroke={c} strokeWidth="2" opacity="0.35"/>
      <rect x="6.5"  y="6.5"  width="11" height="11" rx="2.5" fill="none" stroke={c} strokeWidth="2" opacity="0.6"/>
      <rect x="9"    y="9"    width="6"  height="6"  rx="1.8" fill={c}/>
    </>
  ),
  'b-grain': ({ c }) => (
    <>
      {[[5,7],[8,5],[12,8],[16,6],[19,9],[6,12],[10,11],[14,13],[18,12],[5,16],[9,18],[13,17],[17,18],[11,15],[15,16]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1" fill={c} opacity={0.55 + (i%3)*0.15}/>
      ))}
    </>
  ),

  // ─── Category icons (for palette headers) ──────────────────────────────
  'cat-shape':   ({ c }) => <><rect x="5" y="5" width="14" height="14" rx="3" fill={c} opacity="0.25" stroke={c} strokeWidth="1.8"/></>,
  'cat-distort': ({ c }) => <><path d="M4 12 Q8 6 12 12 T20 12" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"/></>,
  'cat-color':   ({ c }) => <><circle cx="9" cy="10" r="4" fill={c} opacity="0.6"/><circle cx="15" cy="13" r="4" fill={c}/></>,
  'cat-effect':  ({ c }) => <><circle cx="12" cy="12" r="2.5" fill={c}/>{[0,72,144,216,288].map((a,i) => { const r = a*Math.PI/180; const x = 12+Math.cos(r)*7, y = 12+Math.sin(r)*7; return <circle key={i} cx={x} cy={y} r="1.2" fill={c}/>; })}</>,

  // ─── UI icons (chunky, rounded, friendly) ──────────────────────────────
  'metro': ({ c, cream }) => (
    <>
      <path d="M8 4 L16 4 L19 20 L5 20 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
      <line x1="12" y1="12" x2="16" y2="6" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="1.4" fill={cream}/>
    </>
  ),
  'camera': ({ c, cream }) => (
    <>
      <path d="M8 6 L9.5 4 L14.5 4 L16 6" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="3" y="6" width="18" height="14" rx="2.5" fill="none" stroke={c} strokeWidth="2"/>
      <circle cx="12" cy="13" r="3.5" fill="none" stroke={c} strokeWidth="2"/>
      <circle cx="12" cy="13" r="1.2" fill={cream}/>
    </>
  ),
  'code': ({ c }) => (
    <>
      <path d="M9 7 L4 12 L9 17" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 7 L20 12 L15 17" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  'share': ({ c }) => (
    <>
      <path d="M5 12 V19 A1 1 0 0 0 6 20 H18 A1 1 0 0 0 19 19 V12" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3 V14" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 7 L12 3 L16 7" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  'dots': ({ c }) => (
    <>
      <circle cx="5" cy="12"  r="1.8" fill={c}/>
      <circle cx="12" cy="12" r="1.8" fill={c}/>
      <circle cx="19" cy="12" r="1.8" fill={c}/>
    </>
  ),
  'menu': ({ c }) => (
    <>
      <line x1="4" y1="7"  x2="20" y2="7"  stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="4" y1="12" x2="20" y2="12" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="4" y1="17" x2="14" y2="17" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    </>
  ),
  'plus': ({ c }) => (
    <>
      <line x1="12" y1="5" x2="12" y2="19" stroke={c} strokeWidth="2.4" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth="2.4" strokeLinecap="round"/>
    </>
  ),
  'close': ({ c }) => (
    <>
      <line x1="6" y1="6" x2="18" y2="18" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="18" y1="6" x2="6" y2="18" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    </>
  ),
  'chevron': ({ c }) => (
    <>
      <path d="M6 9 L12 15 L18 9" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  'search': ({ c }) => (
    <>
      <circle cx="11" cy="11" r="6.5" fill="none" stroke={c} strokeWidth="2"/>
      <line x1="16" y1="16" x2="21" y2="21" stroke={c} strokeWidth="2.2" strokeLinecap="round"/>
    </>
  ),
  'play': ({ c }) => (
    <>
      <path d="M7 5 L19 12 L7 19 Z" fill={c} stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    </>
  ),
  'record': ({ c, cream }) => (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" fill={c}/>
    </>
  ),
  'trash': ({ c }) => (
    <>
      <path d="M4 7 H20" stroke={c} strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 7 V4.5 A1 1 0 0 1 10 3.5 H14 A1 1 0 0 1 15 4.5 V7" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M6 7 L7 20 A1.2 1.2 0 0 0 8.2 21 H15.8 A1.2 1.2 0 0 0 17 20 L18 7" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    </>
  ),
  'sparkle': ({ c, cream }) => (
    <>
      <path d="M12 3 L13.6 9.8 L20.4 11.4 L13.6 13 L12 19.8 L10.4 13 L3.6 11.4 L10.4 9.8 Z"
        fill={cream} stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    </>
  ),
  'lock': ({ c, cream }) => (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" fill="none" stroke={c} strokeWidth="2"/>
      <path d="M7.5 11 V8 A4.5 4.5 0 0 1 16.5 8 V11" fill="none" stroke={c} strokeWidth="2"/>
      <circle cx="12" cy="15" r="1.5" fill={cream}/>
    </>
  ),
  'arrow-down-right': ({ c }) => (
    <>
      <path d="M5 5 V11 A4 4 0 0 0 9 15 H19" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 11 L19 15 L15 19" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  'arrow-up-left': ({ c }) => (
    <>
      <path d="M19 5 V11 A4 4 0 0 1 15 15 H5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 11 L5 15 L9 19" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
};

const Icon = ({ name, size = 20, color, cream, style, className, rotate }) => {
  const c = color || 'currentColor';
  const k = cream || SHADE.cream;
  const renderer = ICON_PATHS[name];
  if (!renderer) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={style} className={className}>
        <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke={c} strokeWidth="2"/>
      </svg>
    );
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      style={{ display:'block', transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
      className={className}
    >
      {renderer({ c, cream: k })}
    </svg>
  );
};

// ─── Shade brand logo (extracted Subtract.svg shape, recoloured) ──────────
const ShadeLogo = ({ size = 22, gradient = true }) => (
  <svg width={size} height={size * (604/707)} viewBox="0 0 707 604" style={{ display:'block' }}>
    {gradient && (
      <defs>
        <linearGradient id="shadeLogoGrad" x1="353" y1="0" x2="353" y2="604" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCB427"/>
          <stop offset="1" stopColor="#966B17"/>
        </linearGradient>
      </defs>
    )}
    <path
      d="M353.184 0C548.242 0 706.367 158.126 706.367 353.184C706.367 436.46 677.545 513.005 629.333 573.387C612.878 593.996 587.042 604 560.669 604H145.698C119.326 604 93.4897 593.996 77.0342 573.387C28.8218 513.005 0 436.46 0 353.184C0 158.126 158.126 0 353.184 0ZM351.635 300.516C272.072 300.516 207.573 365.015 207.573 444.578C207.573 524.141 272.072 588.64 351.635 588.64C431.198 588.64 495.696 524.141 495.696 444.578C495.696 365.015 431.198 300.516 351.635 300.516Z"
      fill={gradient ? 'url(#shadeLogoGrad)' : SHADE.gold}
    />
  </svg>
);

// ─── Shade mascot (extracted from mascot.svg) ─────────────────────────────
const ShadeMascot = ({ size = 140 }) => (
  <svg width={size} height={size * (700/1059)} viewBox="0 0 1059 700" style={{ display:'block' }}>
    <defs>
      <linearGradient id="mascotGrad" x1="529.5" y1="0" x2="529.5" y2="700" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FCB427"/>
        <stop offset="1" stopColor="#966B17"/>
      </linearGradient>
    </defs>
    <path
      d="M341.523 0C370.459 0 393.635 24.757 398.917 53.206C408.236 103.4 437.886 171 530 171C622.114 171 651.764 103.4 661.083 53.206C666.365 24.757 689.541 0 718.477 0H830C857.614 0 880 22.386 880 50V246.349C897.616 235.957 918.118 230 940 230C1005.72 230 1059 283.726 1059 350C1059 416.274 1005.72 470 940 470C918.118 470 897.616 464.042 880 453.65V650C880 677.614 857.614 700 830 700H230C202.386 700 180 677.614 180 650V453.054C162.162 463.814 141.298 470 119 470C53.278 470 0 416.274 0 350C0 283.726 53.278 230 119 230C141.297 230 162.162 236.185 180 246.945V50C180 22.386 202.386 0 230 0H341.523Z"
      fill="url(#mascotGrad)"
    />
    {/* smile */}
    <path d="M612.052 495.998C625.31 495.998 634.86 508.78 628.411 520.365C608.943 555.338 571.603 578.998 528.737 578.998C485.87 578.998 448.53 555.338 429.062 520.365C422.613 508.78 432.163 495.998 445.422 495.998H612.052Z" fill="#FEE7C7" fillOpacity="0.55"/>
    {/* left eye */}
    <path d="M395.004 251.998C457.964 251.998 509.004 303.038 509.004 365.998C509.004 382.94 505.308 399.019 498.678 413.473C487.69 437.427 460.435 446.998 434.081 446.998H355.927C329.573 446.998 302.318 437.427 291.33 413.473C284.7 399.019 281.004 382.94 281.004 365.998C281.004 303.038 332.043 251.998 395.004 251.998ZM394.504 349.998C368.823 349.998 348.004 370.817 348.004 396.498C348.004 422.179 368.823 442.998 394.504 442.998C420.185 442.998 441.004 422.179 441.004 396.498C441.004 370.817 420.185 349.998 394.504 349.998Z" fill="#FEE7C7" fillOpacity="0.6"/>
    {/* right eye */}
    <path d="M662.004 252.998C724.964 252.998 776.004 304.038 776.004 366.998C776.004 383.908 772.322 399.959 765.716 414.391C754.739 438.37 727.466 447.956 701.094 447.956H622.914C596.542 447.956 569.268 438.37 558.292 414.391C551.686 399.959 548.004 383.908 548.004 366.998C548.004 304.038 599.043 252.998 662.004 252.998ZM661.504 349.998C635.823 349.998 615.004 370.817 615.004 396.498C615.004 422.179 635.823 442.998 661.504 442.998C687.185 442.998 708.004 422.179 708.004 396.498C708.004 370.817 687.185 349.998 661.504 349.998Z" fill="#FEE7C7" fillOpacity="0.6"/>
  </svg>
);

window.Icon = Icon;
window.ShadeLogo = ShadeLogo;
window.ShadeMascot = ShadeMascot;
