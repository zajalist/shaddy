// Library — shared visual layer.
//
// Single source of truth for the type scale, spacing scale, the repeated
// "ink card" surface recipe, and the diagram colour/stroke/font constants.
// Built ON TOP of the global SHADE/TYPE/RHYTHM tokens — no colour value is
// invented here.
//
// Everything is FLAT: the only shadow allowed is the `0 3px 0` hard-offset
// (no blur, no glow, no halo). See no-glow rule in 00-overview.md.

import type { CSSProperties } from 'react';
import { SHADE, TYPE, RHYTHM } from '../../tokens';

// ─── type scale ────────────────────────────────────────────────────────
// Names map to the sizes already in use across the page.
export const LIB_TYPE = {
  display: { fontFamily: TYPE.display, fontWeight: 700, letterSpacing: TYPE.trackTight },
  h1: { fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.02 }, // hero
  h2: { fontSize: 30, lineHeight: 1.1 }, // article heading
  body: { fontSize: 16, lineHeight: 1.7, letterSpacing: '-0.005em', fontFamily: TYPE.body },
  bodySm: { fontSize: 13.5 }, // tables
  eyebrow: {
    fontFamily: TYPE.bodyMono,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: TYPE.trackEyebrow,
    textTransform: 'uppercase' as const,
  },
  caption: { fontFamily: TYPE.bodyMono, fontSize: 11.5, letterSpacing: '0.04em' },
  mono: { fontFamily: TYPE.bodyMono },
} satisfies Record<string, CSSProperties>;

// ─── spacing ───────────────────────────────────────────────────────────
// Alias RHYTHM so call sites read intent, not raw px.
export const SPACE = RHYTHM; // xs6 s10 m14 l20 xl32 xxl48
export const BLOCK_GAP = 18; // the recurring vertical gap between cards

// ─── the single "ink card" recipe (repeated ~20× inline today) ──────────
export const INK_RADIUS = 10;
export const INK_BORDER = `1.5px solid ${SHADE.inkLine}`;
export const INK_SHADOW = `0 3px 0 ${SHADE.inkLine}`; // FLAT hard-offset — the only shadow allowed

export const inkCard = (overrides?: CSSProperties): CSSProperties => ({
  background: SHADE.surface1,
  border: INK_BORDER,
  borderRadius: INK_RADIUS,
  boxShadow: INK_SHADOW, // FLAT hard-offset — the only shadow allowed
  ...overrides,
});

// ─── scroll-spy / anchor offset constants ───────────────────────────────
// The article's scrollMarginTop and the TOC observer's rootMargin must stay
// in sync; naming them here keeps them from drifting.
export const SCROLL_MARGIN_TOP = 96;
export const TOC_ROOT_MARGIN = '-80px 0px -70% 0px';
export const TOC_OBSERVER_THRESHOLD = [0, 0.1, 0.5, 1];

// ─── diagram-specific colour aliases ────────────────────────────────────
// Moves the `C` object out of Diagram.tsx. Each entry is typed as plain
// `string` so renderers can reassign stroke colours without TS locking them
// to the first hex literal.
// Each member is cast to plain `string` (matching the old Diagram.tsx `C`
// object) so renderers can assign a DIA colour into a reassignable `let`
// without TS locking it to a specific hex literal — while access still
// yields a definite `string` (not `string | undefined`).
export const DIA = {
  ink: SHADE.inkLine as string,
  shape: SHADE.catShape as string,
  distort: SHADE.catDistort as string,
  color: SHADE.catColor as string,
  effect: SHADE.catEffect as string,
  gold: SHADE.gold as string,
  ember: SHADE.ember as string,
  cream: SHADE.cream as string,
  text: SHADE.text as string,
  textDim: SHADE.textDim as string,
  textFaint: SHADE.textFaint as string,
  surface1: SHADE.surface1 as string,
  surface2: SHADE.surface2 as string,
  surface3: SHADE.surface3 as string,
  border: SHADE.border as string,
};

export const DIA_STROKE = 1.5;
export const DIA_FONT_MONO = 'Geist Mono';
export const DIA_FONT_DISPLAY = 'Bricolage Grotesque';

// ─── responsive layout ──────────────────────────────────────────────────
// One source of truth for the content breakpoint (distinct from the 768px
// touch-target breakpoint in useIsMobile). The grid reflows in pure CSS so
// it doesn't need a React re-render; the <details> drawer is JS-gated on the
// same value via useMediaQuery.
export const LIBRARY_LAYOUT_BREAKPOINT = 960;

// Injected once into the page's <style> block (see useLibraryChrome).
// Wide: a 240px TOC track + an article track that grows but caps line length.
// Narrow: collapse to a single column (the drawer renders above the article).
export const LIBRARY_GRID_CSS = `
  .lib-shell {
    max-width: 1240px;
    margin: 0 auto;
    padding: 16px 16px 80px;
  }
  .lib-article {
    min-width: 0;
    max-width: 72ch;
  }
  @media (min-width: ${LIBRARY_LAYOUT_BREAKPOINT}px) {
    .lib-shell {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      column-gap: 36px;
      align-items: start;
      padding: 24px 24px 80px;
    }
  }
`;

// ─── fonts ───────────────────────────────────────────────────────────────
export const FONT_LINK_ID = 'shade-design-fonts';
export const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Geist+Mono:wght@400;500;600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap';
