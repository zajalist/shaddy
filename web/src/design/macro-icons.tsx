// Curated macro icon set — 50 flat, single-weight line glyphs rendered in the
// macro purple. Users pick one in the macro editor to give a saved macro a
// recognizable face in the palette / on the canvas / in the inspector. Keep
// them stroke-only and consistent (viewBox 0 0 24, no fills, no glow).

import type { ReactNode } from 'react';

// The default glyph (the legacy ▣ "macro" mark) — used when a macro has no icon.
const DEFAULT_KEY = 'macro';

// Insertion order IS the palette grid order. Grouped loosely: marks → shapes →
// motion → nature → sky → tech → symbols → objects.
const GLYPHS: Record<string, ReactNode> = {
  macro: (<><rect x="4" y="4" width="16" height="16" rx="2.5" /><rect x="9" y="9" width="6" height="6" rx="1" /></>),
  circle: (<circle cx="12" cy="12" r="8" />),
  square: (<rect x="5" y="5" width="14" height="14" rx="2" />),
  triangle: (<path d="M12 4 20 19 4 19Z" />),
  diamond: (<path d="M12 3 21 12 12 21 3 12Z" />),
  hexagon: (<path d="M12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5Z" />),
  pentagon: (<path d="M12 3 21 10 17.3 20 6.7 20 3 10Z" />),
  star: (<path d="M12 3 14.6 9.2 21.3 9.8 16.2 14.2 17.8 20.8 12 17.2 6.2 20.8 7.8 14.2 2.7 9.8 9.4 9.2Z" />),
  heart: (<path d="M12 20.5 4.3 12.8a4.6 4.6 0 0 1 6.5-6.5L12 7.5l1.2-1.2a4.6 4.6 0 0 1 6.5 6.5Z" />),
  ring: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></>),
  arrowRight: (<path d="M4 12h16M14 6l6 6-6 6" />),
  arrowUp: (<path d="M12 20V4M6 10l6-6 6 6" />),
  refresh: (<><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v3h-3" /></>),
  shuffle: (<path d="M4 7h3l10 10h3M17 4l3 3-3 3M4 17h3l3.5-3.5M17 20l3-3-3-3" />),
  wave: (<path d="M3 12q3-6 6 0t6 0 6 0" />),
  swirl: (<><path d="M20.5 12a8.5 8.5 0 1 1-8.5-8.5" /><path d="M12 12a4 4 0 1 0 4 4" /></>),
  peaks: (<path d="M3 16l4-8 4 8 4-8 4 8" />),
  orbit: (<><circle cx="12" cy="12" r="2.5" /><ellipse cx="12" cy="12" rx="9" ry="4.3" /></>),
  leaf: (<path d="M5 19C5 10 12 5 19 5 19 14 12 19 5 19ZM9 15l7-7" />),
  clover: (<><circle cx="9" cy="9" r="3.1" /><circle cx="15" cy="9" r="3.1" /><circle cx="9" cy="15" r="3.1" /><circle cx="15" cy="15" r="3.1" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" /></>),
  moon: (<path d="M20 13.5A8 8 0 1 1 10.5 4a6.3 6.3 0 0 0 9.5 9.5Z" />),
  cloud: (<path d="M7 18a4 4 0 0 1 .3-8 5 5 0 0 1 9.5-1A3.5 3.5 0 0 1 17 18Z" />),
  droplet: (<path d="M12 3.5c4 5 6 8 6 10.5a6 6 0 0 1-12 0c0-2.5 2-5.5 6-10.5Z" />),
  flame: (<path d="M12 3c3 3.5 5 6 5 9.5a5 5 0 0 1-10 0c0-1.8 1-3.4 2.5-4.6C9.5 10 10 11.5 11 12c.5-3 .5-6 1-9Z" />),
  mountain: (<path d="M3 19l6-11 4 7 3-5 5 9Z" />),
  snowflake: (<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />),
  tree: (<path d="M12 3 7 11h3l-4 6h12l-4-6h3L12 3ZM12 17v4" />),
  grid: (<><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></>),
  layers: (<path d="M12 3 21 8 12 13 3 8ZM3 13l9 5 9-5" />),
  circuit: (<><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h6a2 2 0 0 1 2 2v8M6 8v6a2 2 0 0 0 2 2h6" /></>),
  atom: (<><circle cx="12" cy="12" r="1.6" /><ellipse cx="12" cy="12" rx="9" ry="4" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)" /></>),
  cube: (<path d="M12 3 20 7.5v9L12 21 4 16.5v-9ZM12 3v9M12 12l8-4.5M12 12 4 7.5" />),
  pulse: (<path d="M3 12h4l2-5 3 10 2-5h7" />),
  chip: (<><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" /></>),
  code: (<path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />),
  hexgrid: (<path d="M9 3 13 5.3v4.4L9 12 5 9.7V5.3ZM16 11 20 13.3v4.4L16 20l-4-2.3v-4.4Z" />),
  sparkle: (<path d="M12 3 13.6 9.2 19.5 12 13.6 14.8 12 21 10.4 14.8 4.5 12 10.4 9.2Z" />),
  bolt: (<path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />),
  target: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  gem: (<path d="M6 4h12l4 6-10 11L2 10ZM6 4 2 10M18 4l4 6M9 4l3 17M15 4l-3 17" />),
  key: (<><circle cx="8" cy="8" r="3.2" /><path d="M10.3 10.3 20 20M16.5 16.5 19 14M19 19l2-2" /></>),
  crown: (<path d="M4 8 7.5 14 12 6 16.5 14 20 8 18 19H6Z" />),
  shield: (<path d="M12 3 19.5 6v6c0 5-4 7.5-7.5 9-3.5-1.5-7.5-4-7.5-9V6Z" />),
  anchor: (<><circle cx="12" cy="5" r="2.2" /><path d="M12 7.2V20M5 13a7 7 0 0 0 14 0M5 13h3M19 13h-3" /></>),
  compass: (<><circle cx="12" cy="12" r="8.5" /><path d="M15.5 8.5 11 13 8.5 15.5 13 11Z" /></>),
  flag: (<path d="M6 21V4M6 4h11l-2.2 3.3L17 11H6" />),
  bell: (<path d="M6 16h12l-1.6-3.2V9a4.4 4.4 0 0 0-8.8 0v3.8ZM10 19a2 2 0 0 0 4 0" />),
  rocket: (<path d="M12 3c3 3 4.5 7 4.5 11l-4.5 3-4.5-3C7.5 10 9 6 12 3ZM9 17l-2 4M15 17l2 4" />),
  globe: (<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5a13 13 0 0 1 0 17M12 3.5a13 13 0 0 0 0 17" /></>),
};

/** Ordered list of icon keys for the picker grid (50). */
export const MACRO_ICON_KEYS: string[] = Object.keys(GLYPHS);

/** A macro icon. `name` keys into the curated set; unknown / undefined falls
 *  back to the default ▣ macro mark. */
export const MacroIcon = ({
  name, size = 16, color = '#5B4BD6', strokeWidth = 1.8,
}: { name?: string | null; size?: number; color?: string; strokeWidth?: number }): ReactNode => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden
  >
    {GLYPHS[name ?? ''] ?? GLYPHS[DEFAULT_KEY]}
  </svg>
);
