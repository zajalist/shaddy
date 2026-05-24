// Hand-coded SVG icon set — "charismatic, slightly wonky, playground brutalism".
//
// Rules: 24×24 viewBox, 2.2px stroke, rounded caps & joins, currentColor.
// Solid fills (using fill="currentColor") are allowed for chunkier marks.
// Every icon has at least one piece of intentional personality — a tilt,
// a wobble, a little face, a heavy corner. They should feel hand-cut, not
// generated.

import type { CardCategory } from '../types';

type IconProps = { size?: number; className?: string };

const base = (p: IconProps) => ({
  width: p.size ?? 18,
  height: p.size ?? 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: p.className,
});

// ── Shape ──────────────────────────────────────────────────────────────
const IconRing = (p: IconProps) => (
  <svg {...base(p)}>
    {/* Slightly tilted donut */}
    <ellipse cx="12" cy="12" rx="8.5" ry="8" transform="rotate(-6 12 12)" />
    <ellipse cx="12" cy="12" rx="3.2" ry="3" fill="currentColor" />
  </svg>
);
const IconRadialGradient = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5.5" opacity="0.6" />
    {/* Solid sun */}
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
  </svg>
);
const IconStripes = (p: IconProps) => (
  <svg {...base(p)}>
    {/* Hand-cut wavy stripes */}
    <path d="M5 3v18M11 3.5v17M17 3v18" />
    <path d="M3 7l1 1M9 6.5l1 1M15 7l1 1M21 6.5l-1 1" opacity="0.5" strokeWidth="1.6" />
  </svg>
);
const IconChecker = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="3" y="3" width="9" height="9" fill="currentColor" />
    <rect x="12" y="12" width="9" height="9" fill="currentColor" />
  </svg>
);
const IconDots = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="6" cy="6" r="1.8" fill="currentColor" />
    <circle cx="12" cy="6" r="1.5" fill="currentColor" />
    <circle cx="18" cy="6" r="1.8" fill="currentColor" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    <circle cx="6" cy="18" r="1.8" fill="currentColor" />
    <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    <circle cx="18" cy="18" r="1.8" fill="currentColor" />
  </svg>
);
const IconVoronoi = (p: IconProps) => (
  <svg {...base(p)}>
    {/* Wonky honeycomb */}
    <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" />
    <path d="M12 3v8M12 21v-8M4 7.5l8 4.5M20 7.5l-8 4.5" opacity="0.55" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
  </svg>
);
const IconTripleGradient = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="5.5" height="14" rx="1.5" fill="currentColor" opacity="0.35" />
    <rect x="9.25" y="5" width="5.5" height="14" rx="1.5" fill="currentColor" opacity="0.65" />
    <rect x="15.5" y="5" width="5.5" height="14" rx="1.5" fill="currentColor" />
  </svg>
);
const IconNoiseField = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8c2 0 2-2.5 4.5-2.5S10 8.5 12.5 8.5 15 6 17.5 6 19 8 21 8" />
    <path d="M3 14c2 0 2-2.5 4.5-2.5S10 14.5 12.5 14.5 15 12 17.5 12 19 14 21 14" opacity="0.65" />
    <path d="M3 20c2 0 2-2.5 4.5-2.5S10 20.5 12.5 20.5 15 18 17.5 18 19 20 21 20" opacity="0.4" />
  </svg>
);

// ── Distortion ─────────────────────────────────────────────────────────
const IconRipple = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <circle cx="12" cy="12" r="6" opacity="0.7" />
    <circle cx="12" cy="12" r="9.5" opacity="0.4" />
    {/* Drop hint */}
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </svg>
);
const IconWaveWarp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9c2-3.5 4 5 6 1.5s4-5 6-1.5 4 5 6 1.5" />
    <path d="M3 16c2-3.5 4 5 6 1.5s4-5 6-1.5 4 5 6 1.5" opacity="0.55" />
  </svg>
);
const IconSwirl = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-9-9c5 0 7 4 7 7s-2 5-4 5-3-2-3-3 1-2 2-2" />
    {/* Cheeky dot in the center */}
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </svg>
);
const IconSpiral = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 12a1 1 0 1 0 0.01 0M14 12c0-1.6-1-2.5-2-2.5s-3 1-3 3 1.5 4 4 4 6-2 6-6-3-7-7-7-9 3-9 8 4 9 9 9" />
  </svg>
);
const IconKaleidoscope = (p: IconProps) => (
  <svg {...base(p)}>
    <polygon points="12,3 21,8.5 21,15.5 12,21 3,15.5 3,8.5" />
    <path d="M12 3v18M3 8.5l18 7M21 8.5l-18 7" opacity="0.55" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);
const IconRotate = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-3.2-6.4" />
    <path d="M20 4v5h-5" />
    {/* Little arrow head emphasis */}
    <circle cx="20" cy="4.5" r="0.8" fill="currentColor" />
  </svg>
);
const IconRepeat = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" opacity="0.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" opacity="0.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
  </svg>
);
const IconPixelate = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="5.5" height="5.5" fill="currentColor" />
    <rect x="9.25" y="3" width="5.5" height="5.5" opacity="0.4" fill="currentColor" />
    <rect x="15.5" y="3" width="5.5" height="5.5" fill="currentColor" />
    <rect x="3" y="9.25" width="5.5" height="5.5" opacity="0.4" fill="currentColor" />
    <rect x="9.25" y="9.25" width="5.5" height="5.5" fill="currentColor" />
    <rect x="15.5" y="9.25" width="5.5" height="5.5" opacity="0.4" fill="currentColor" />
    <rect x="3" y="15.5" width="5.5" height="5.5" fill="currentColor" />
    <rect x="9.25" y="15.5" width="5.5" height="5.5" opacity="0.4" fill="currentColor" />
    <rect x="15.5" y="15.5" width="5.5" height="5.5" fill="currentColor" />
  </svg>
);

// ── Color ──────────────────────────────────────────────────────────────
const IconPalette = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3a9 9 0 0 0 0 18 2 2 0 0 0 1.6-3.2 1.6 1.6 0 0 1 1.3-2.6h2.6A3.5 3.5 0 0 0 21 11.7C20.6 6.8 16.8 3 12 3z" />
    <circle cx="7.5" cy="11" r="1.4" fill="currentColor" />
    <circle cx="10.5" cy="7" r="1.4" fill="currentColor" />
    <circle cx="15" cy="8" r="1.4" fill="currentColor" />
  </svg>
);
const IconHueCycle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17M3.5 12h17" opacity="0.45" />
    <path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" opacity="0.45" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
const IconInvert = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" />
  </svg>
);
const IconBrightnessContrast = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4.8" />
    <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);
const IconPosterize = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="8" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.7" />
    <rect x="13" y="4" width="4" height="16" rx="1" fill="currentColor" opacity="0.4" />
    <rect x="18" y="4" width="3" height="16" rx="1" fill="currentColor" opacity="0.18" />
  </svg>
);

// ── Effect ─────────────────────────────────────────────────────────────
const IconGlow = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1" />
  </svg>
);
const IconGrain = (p: IconProps) => (
  <svg {...base(p)}>
    {/* Scatter of dots, irregular */}
    <circle cx="5" cy="6" r="1" fill="currentColor" />
    <circle cx="10" cy="4" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="15" cy="7" r="0.9" fill="currentColor" />
    <circle cx="19" cy="5" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="4" cy="11" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
    <circle cx="14" cy="12" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="20" cy="11" r="0.9" fill="currentColor" />
    <circle cx="6" cy="16" r="0.9" fill="currentColor" />
    <circle cx="11" cy="18" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="16" cy="15" r="1" fill="currentColor" />
    <circle cx="19" cy="19" r="0.7" fill="currentColor" opacity="0.7" />
    <circle cx="3" cy="19" r="0.6" fill="currentColor" opacity="0.7" />
    <circle cx="13" cy="20" r="0.7" fill="currentColor" />
  </svg>
);
const IconScanlines = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 10h18M3 14h18M3 18h18" />
    {/* Tiny accent block on one line */}
    <rect x="14" y="9.4" width="2.5" height="1.2" fill="currentColor" />
  </svg>
);
const IconVignette = (p: IconProps) => (
  <svg {...base(p)}>
    {/* Picture-frame */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="6" y="6" width="12" height="12" rx="1.5" opacity="0.55" />
    {/* Light center */}
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

// ── Category fallbacks ─────────────────────────────────────────────────
const IconShape = IconRing;
const IconDistortion = IconWaveWarp;
const IconColor = IconPalette;
const IconEffect = IconGlow;

const ICON_FOR_TYPE: Record<string, (p: IconProps) => React.JSX.Element> = {
  ring: IconRing,
  radial_gradient: IconRadialGradient,
  stripes: IconStripes,
  checker: IconChecker,
  dots: IconDots,
  voronoi_cells: IconVoronoi,
  triple_gradient: IconTripleGradient,
  noise_field: IconNoiseField,

  ripple: IconRipple,
  wave_warp: IconWaveWarp,
  swirl: IconSwirl,
  spiral: IconSpiral,
  kaleidoscope: IconKaleidoscope,
  rotate: IconRotate,
  repeat: IconRepeat,
  pixelate: IconPixelate,

  palette: IconPalette,
  hue_cycle: IconHueCycle,
  invert: IconInvert,
  brightness_contrast: IconBrightnessContrast,
  posterize: IconPosterize,

  glow: IconGlow,
  grain: IconGrain,
  scanlines: IconScanlines,
  vignette: IconVignette,
};

export function CardIcon(props: { type: string; size?: number; className?: string }) {
  const Comp = ICON_FOR_TYPE[props.type];
  if (Comp) return <Comp size={props.size} className={props.className} />;
  return (
    <svg {...base({ size: props.size, className: props.className })}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

const CAT_ICON: Record<CardCategory, (p: IconProps) => React.JSX.Element> = {
  shape: IconShape,
  distortion: IconDistortion,
  color: IconColor,
  effect: IconEffect,
};
export function CategoryIcon(props: { category: CardCategory; size?: number; className?: string }) {
  const Comp = CAT_ICON[props.category];
  return <Comp size={props.size} className={props.className} />;
}

// ── Standalone glyphs used in app chrome ───────────────────────────────
// Same charismatic principles — thicker, friendlier, with a little personality.

export const Glyph = {
  Code: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 8l-5 4 5 4M15 8l5 4-5 4" />
      <path d="M13.5 5l-3 14" opacity="0.55" />
    </svg>
  ),
  ChevronDown: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  ChevronUp: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 15l6-6 6 6" />
    </svg>
  ),
  ChevronRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  ArrowDown: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  ),
  ArrowRight: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  X: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Eye: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M2 12s4-7.5 10-7.5 10 7.5 10 7.5-4 7.5-10 7.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  ),
  EyeOff: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.7 4.6M6.5 6.6C3.4 8.4 2 12 2 12s4 7 10 7c1.6 0 3-.3 4.4-.9" />
    </svg>
  ),
  ArrowUpSmall: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 14l5-5 5 5" />
    </svg>
  ),
  ArrowDownSmall: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 10l5 5 5-5" />
    </svg>
  ),
  Brackets: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3M16 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 12h4" opacity="0.55" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l1.8 5L19 9.8l-5.2 1.8L12 17l-1.8-5.4L5 9.8 10.2 8z" fill="currentColor" />
      <circle cx="19" cy="5" r="1.2" fill="currentColor" />
      <circle cx="4" cy="19" r="1" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  Wave: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 12c3-5 6 5 9 0s6-5 9 0" />
    </svg>
  ),
  Play: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M7 4l13 8-13 8z" fill="currentColor" />
    </svg>
  ),
  Disc: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  Warn: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.7" fill="currentColor" />
    </svg>
  ),
  /** Logo squiggle — used in the wordmark chip. */
  Squiggle: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.0" />
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4 13c2.5-4 5 4 8 0s5-4 8 0" strokeWidth="2.6" />
      <circle cx="9" cy="9" r="0.9" fill="currentColor" />
      <circle cx="15" cy="9" r="0.9" fill="currentColor" />
    </svg>
  ),
} as const;
