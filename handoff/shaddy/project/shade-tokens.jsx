// shade-tokens.jsx — Quadspinner-Gaea-style: light workspace + dark navy
// top bar. Brand gold preserved. Light bg means category colors are deeper
// and more saturated so they stay legible.

const SHADE = {
  // Workspace surfaces — LIGHT
  bg:        '#dcdcdc', // page background (matches Gaea docs light gray)
  surface1:  '#ececec', // block bodies, palette items
  surface2:  '#f3f3f3', // right side panel
  surface3:  '#cdcdcd', // hover / selected sub-surface
  surface4:  '#1a1a1a', // dark wells (code areas) — inverted
  border:    '#bcbcbc',
  borderHi:  '#7a7a7a', // selection
  // Text — dark for light bg
  text:      '#1a1a1a',
  textDim:   '#5a5a5a',
  textFaint: '#9c9c9c',
  // Top bar — dark navy strip
  topbar:        '#0e1825',
  topbarSurface: '#16223a',
  topbarText:    '#e6edf4',
  topbarDim:     '#8b9bb3',
  topbarBorder:  '#1f2c44',
  // Brand
  gold:      '#FCB427',
  goldDeep:  '#966B17',
  cream:     '#FEE7C7',
  // Category colors — deeper for light bg, still distinct
  catShape:   '#1F7FB8', // deep cyan-blue
  catDistort: '#C73B82', // deep magenta
  catColor:   '#6F8F00', // deep olive lime
  catEffect:  '#6B47C3', // deep violet
};

const CATEGORIES = {
  shape:   { color: SHADE.catShape,   label: 'Shapes',      icon: 'cat-shape' },
  distort: { color: SHADE.catDistort, label: 'Distortions', icon: 'cat-distort' },
  color:   { color: SHADE.catColor,   label: 'Colors',      icon: 'cat-color' },
  effect:  { color: SHADE.catEffect,  label: 'Effects',     icon: 'cat-effect' },
};

const BLOCK_LIB = [
  { id: 'circle',     cat: 'shape',   name: 'CIRCLE',   icon: 'b-circle',  mini: { kind:'slider', label:'size',  value: 0.62 } },
  { id: 'stripes',    cat: 'shape',   name: 'STRIPES',  icon: 'b-stripes', mini: { kind:'slider', label:'freq',  value: 0.40 } },
  { id: 'voronoi',    cat: 'shape',   name: 'VORONOI',  icon: 'b-voronoi', mini: { kind:'slider', label:'cells', value: 0.55 } },
  { id: 'grid',       cat: 'shape',   name: 'GRID',     icon: 'b-grid',    mini: { kind:'slider', label:'scale', value: 0.30 } },
  { id: 'noise',      cat: 'shape',   name: 'NOISE',    icon: 'b-noise',   mini: { kind:'slider', label:'detail',value: 0.72 } },
  { id: 'ripple',     cat: 'distort', name: 'RIPPLE',   icon: 'b-ripple',  mini: { kind:'slider', label:'freq',  value: 0.48, animated: true } },
  { id: 'swirl',      cat: 'distort', name: 'SWIRL',    icon: 'b-swirl',   mini: { kind:'slider', label:'amount',value: 0.66 } },
  { id: 'kaleido',    cat: 'distort', name: 'KALEIDO',  icon: 'b-kaleido', mini: { kind:'slider', label:'sides', value: 0.50 } },
  { id: 'warp',       cat: 'distort', name: 'WARP',     icon: 'b-warp',    mini: { kind:'slider', label:'amt',   value: 0.35 } },
  { id: 'palette',    cat: 'color',   name: 'PALETTE',  icon: 'b-palette', mini: { kind:'swatches', values: ['#1F7FB8','#C73B82','#6F8F00','#6B47C3'] } },
  { id: 'hueshift',   cat: 'color',   name: 'HUE',      icon: 'b-hue',     mini: { kind:'slider', label:'shift', value: 0.20, animated: true } },
  { id: 'invert',     cat: 'color',   name: 'INVERT',   icon: 'b-invert',  mini: { kind:'slider', label:'mix',   value: 0.10 } },
  { id: 'contrast',   cat: 'color',   name: 'CONTRAST', icon: 'b-contrast',mini: { kind:'slider', label:'lvl',   value: 0.55 } },
  { id: 'glow',       cat: 'effect',  name: 'GLOW',     icon: 'b-glow',    mini: { kind:'slider', label:'amt',   value: 0.42 } },
  { id: 'bloom',      cat: 'effect',  name: 'BLOOM',    icon: 'b-bloom',   mini: { kind:'slider', label:'thresh',value: 0.65 } },
  { id: 'feedback',   cat: 'effect',  name: 'FEEDBACK', icon: 'b-feedback',mini: { kind:'slider', label:'decay', value: 0.78 } },
  { id: 'grain',      cat: 'effect',  name: 'GRAIN',    icon: 'b-grain',   mini: { kind:'slider', label:'amt',   value: 0.18 } },
];

const blockById = (id) => BLOCK_LIB.find((b) => b.id === id);

window.SHADE = SHADE;
window.CATEGORIES = CATEGORIES;
window.BLOCK_LIB = BLOCK_LIB;
window.blockById = blockById;
