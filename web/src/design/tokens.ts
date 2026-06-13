// Design tokens for the Shade puzzle-block composer route.
// Warm light workspace + slate-navy strip. Brand gold preserved but
// reserved for the primary CTA only (not for ambient indicators).
//
// Human-touch revision: warmer surfaces, no glow/breath ornaments, characterful
// Bricolage Grotesque type pairing with Geist Mono for numerics.

export const SHADE = {
  // Workspace surfaces — warm light, not flat grey
  bg:        '#e6e1d6', // page background — slight warmth pulls it out of generic-AI territory
  surface1:  '#f1ebdd', // block bodies, palette items
  surface2:  '#efe9d9', // right side panel
  surface3:  '#d6cfbe', // hover / selected sub-surface
  surface4:  '#1a1815', // dark wells (code areas) — slightly warmed
  border:    '#c5bba6', // muted warm
  borderHi:  '#7a6e58', // selection
  inkLine:   '#2b2a25', // for the chunky 1.5px hand-drawn-feeling outlines

  // Text — dark warm ink for warm bg
  text:      '#1f1c14',
  textDim:   '#5a5040',
  textFaint: '#9b907a',

  // Top bar — warm desaturated charcoal (not cold slate)
  topbar:        '#1d1c1a',
  topbarSurface: '#272524',
  topbarText:    '#e8e2d4',
  topbarDim:     '#8a8377',
  topbarBorder:  '#2a2826',

  // Brand — austere desaturated ochre (matches the Intersect logo gold).
  // Was #FCB427 (very saturated); dialled down for a quieter, Gaea-like feel.
  gold:      '#D3A13F',
  goldDeep:  '#8A6418',
  cream:     '#FEE7C7',
  // Secondary warm accent (used for sliders' filled portion)
  ember:     '#B56A1D',

  // Category colors — deeper for warm light bg
  catShape:   '#1F7FB8',
  catDistort: '#B5365E',
  catColor:   '#6F7F1A',
  catEffect:  '#5C3FA8',

  // Reserved accent for NAMED REROUTES — a teal used by no block category, so
  // a reroute banner reads as a distinct class of node (a teleport, not an
  // operation). Flat fills only, no glow.
  reroute:     '#0E8585',
  rerouteDeep: '#0A5F5F',

  // Reserved accent for MACROS ("function" blocks) — a saturated indigo, also
  // used by no category, so a macro reads as a collapsed sub-graph.
  macro:       '#5B4BD6',
  macroDeep:   '#372C92',

  // Reserved accent for CUSTOM ANIMATIONS (signal-generator chains) — a cool
  // cyan used by no block category, so an animation block reads as a distinct
  // species (a signal, not an operation). Flat fills only, no glow.
  anim:        '#27A8C9',
  animDeep:    '#1A7C95',
} as const;

// Shared warm "instrument" panel palette — the dark chrome (top bar, right
// inspector, preview) shares ONE deliberate value ladder so the whole editor
// frame reads as a single calm DCC surface around the warm Scratch workspace.
// Color is reserved for content (category blocks) and live values (amber).
// Neutral-warm charcoal — the SAME dark family as the top bar (#1d1c1a) and the
// GLSL code drawer (SHADE.surface4 #1a1815), NOT a saturated brown. `panel`
// equals the top bar so the inspector reads as one continuous dark chrome.
export const PANEL = {
  well:     '#141311', // deepest — input wells / slider track recess / stage
  sub:      '#1a1916', // nested surface (attribute boxes) ~ code drawer bg
  panel:    '#1d1c1a', // base panel surface (= top bar)
  raised:   '#242320', // raised module headers (sections, preview bar)
  divider:  '#2a2926', // hairline dividers (low contrast)
  border:   '#353330', // control borders
  borderHi: '#4c4a44', // emphasized edges
  text:     '#ece8de', // titles
  value:    '#e6b052', // amber — live numeric values (matches the code gold tones)
  dim:      '#918d83', // section labels
  mid:      '#847f75', // param labels
  faint:    '#67635b', // hints / hex
  gold:     SHADE.gold,
  goldDeep: SHADE.goldDeep,
  hover:    '#2c2b27',
  danger:   '#cf8d86',
} as const;

export type CategoryKey = 'shape' | 'distort' | 'color' | 'effect';

export const CATEGORIES: Record<CategoryKey, { color: string; label: string; icon: string }> = {
  shape:   { color: SHADE.catShape,   label: 'Shapes',      icon: 'cat-shape' },
  distort: { color: SHADE.catDistort, label: 'Distortions', icon: 'cat-distort' },
  color:   { color: SHADE.catColor,   label: 'Colors',      icon: 'cat-color' },
  effect:  { color: SHADE.catEffect,  label: 'Effects',     icon: 'cat-effect' },
};

export type BlockMini =
  | { kind: 'slider'; label: string; value: number; animated?: boolean }
  | { kind: 'swatches'; values: string[] };

export type BlockDef = {
  id: string;
  cat: CategoryKey;
  name: string;
  icon: string;
  mini: BlockMini;
};

// BLOCK_LIB is sourced from the real cards library — see card-adapter.ts.
// Kept exported under the same name so the visual components don't need to
// know about the adapter.
import { ALL_BLOCKS, BLOCK_BY_ID } from './card-adapter';

export const BLOCK_LIB: BlockDef[] = ALL_BLOCKS;

export const blockById = (id: string): BlockDef | undefined => BLOCK_BY_ID[id];

// Typography — Bricolage Grotesque carries the personality; Geist Mono is the
// numerals workhorse. Both have warmth and slight idiosyncrasies that pull the
// UI away from generic-AI Inter/IBM Plex territory.
export const TYPE = {
  body:      '"Bricolage Grotesque", "Hanken Grotesk", "Inter", system-ui, sans-serif',
  bodyMono:  '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  display:   '"Bricolage Grotesque", "Hanken Grotesk", "Inter", system-ui, sans-serif',
  trackTight:   '-0.02em',
  trackTighter: '-0.035em',
  trackEyebrow: '0.18em',
} as const;

export const RHYTHM = {
  xs: 6,
  s: 10,
  m: 14,
  l: 20,
  xl: 32,
  xxl: 48,
} as const;
