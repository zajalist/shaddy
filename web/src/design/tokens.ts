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

  // Brand
  gold:      '#FCB427',
  goldDeep:  '#966B17',
  cream:     '#FEE7C7',
  // Secondary warm accent (used for sliders' filled portion)
  ember:     '#B56A1D',

  // Category colors — deeper for warm light bg
  catShape:   '#1F7FB8',
  catDistort: '#B5365E',
  catColor:   '#6F7F1A',
  catEffect:  '#5C3FA8',
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

export const BLOCK_LIB: BlockDef[] = [
  { id: 'circle',   cat: 'shape',   name: 'CIRCLE',   icon: 'b-circle',   mini: { kind:'slider', label:'size',   value: 0.62 } },
  { id: 'stripes',  cat: 'shape',   name: 'STRIPES',  icon: 'b-stripes',  mini: { kind:'slider', label:'freq',   value: 0.40 } },
  { id: 'voronoi',  cat: 'shape',   name: 'VORONOI',  icon: 'b-voronoi',  mini: { kind:'slider', label:'cells',  value: 0.55 } },
  { id: 'grid',     cat: 'shape',   name: 'GRID',     icon: 'b-grid',     mini: { kind:'slider', label:'scale',  value: 0.30 } },
  { id: 'noise',    cat: 'shape',   name: 'NOISE',    icon: 'b-noise',    mini: { kind:'slider', label:'detail', value: 0.72 } },
  { id: 'ripple',   cat: 'distort', name: 'RIPPLE',   icon: 'b-ripple',   mini: { kind:'slider', label:'freq',   value: 0.48, animated: true } },
  { id: 'swirl',    cat: 'distort', name: 'SWIRL',    icon: 'b-swirl',    mini: { kind:'slider', label:'amount', value: 0.66 } },
  { id: 'kaleido',  cat: 'distort', name: 'KALEIDO',  icon: 'b-kaleido',  mini: { kind:'slider', label:'sides',  value: 0.50 } },
  { id: 'warp',     cat: 'distort', name: 'WARP',     icon: 'b-warp',     mini: { kind:'slider', label:'amt',    value: 0.35 } },
  { id: 'palette',  cat: 'color',   name: 'PALETTE',  icon: 'b-palette',  mini: { kind:'swatches', values: ['#1F7FB8','#B5365E','#6F7F1A','#5C3FA8'] } },
  { id: 'hueshift', cat: 'color',   name: 'HUE',      icon: 'b-hue',      mini: { kind:'slider', label:'shift',  value: 0.20, animated: true } },
  { id: 'invert',   cat: 'color',   name: 'INVERT',   icon: 'b-invert',   mini: { kind:'slider', label:'mix',    value: 0.10 } },
  { id: 'contrast', cat: 'color',   name: 'CONTRAST', icon: 'b-contrast', mini: { kind:'slider', label:'lvl',    value: 0.55 } },
  { id: 'glow',     cat: 'effect',  name: 'GLOW',     icon: 'b-glow',     mini: { kind:'slider', label:'amt',    value: 0.42 } },
  { id: 'bloom',    cat: 'effect',  name: 'BLOOM',    icon: 'b-bloom',    mini: { kind:'slider', label:'thresh', value: 0.65 } },
  { id: 'feedback', cat: 'effect',  name: 'FEEDBACK', icon: 'b-feedback', mini: { kind:'slider', label:'decay',  value: 0.78 } },
  { id: 'grain',    cat: 'effect',  name: 'GRAIN',    icon: 'b-grain',    mini: { kind:'slider', label:'amt',    value: 0.18 } },
];

export const blockById = (id: string): BlockDef | undefined => BLOCK_LIB.find((b) => b.id === id);

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
