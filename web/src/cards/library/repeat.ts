import type { CardDef } from '../types';

// UV tiling. Place AFTER the shape(s) you want to repeat — the pipeline reads
// shape → distortion → colour → effect, so Repeat sits downstream of its
// shape. It's a compile-time control card: it emits no forward uv mutation of
// its own; the compiler wraps the preceding shape body in a tiled-uv block.
// `scope` chooses how far back it reaches.

export const REPEAT: CardDef = {
  type: 'repeat',
  category: 'distortion',
  friendlyName: 'Repeat',
  description: 'Tile the preceding shape into a grid. Place AFTER the shape.',
  icon: '🔁',
  params: {
    count_x: { kind: 'float', label: 'count x', default: 3, min: 1, max: 12, step: 0.1 },
    count_y: { kind: 'float', label: 'count y', default: 3, min: 1, max: 12, step: 0.1 },
    // Compile-only: chooses which preceding shapes get tiled. Never emitted as
    // a uniform (the compiler reads it at build time to decide the wrap reach).
    scope: {
      kind: 'select', label: 'scope', default: 0,
      options: [
        { value: 0, label: 'Direct chain' }, // contiguous shape run right before
        { value: 1, label: 'All shapes' },    // every shape card before it
      ],
    },
  },
  // Source of the tiling math. Only count_x/count_y are referenced; the
  // compiler substitutes them with this Repeat card's own count uniforms and
  // injects the result into each wrapped shape's body.
  snippetTemplate:
    'uv = fract((uv * 0.5 + 0.5) * vec2({{count_x}}, {{count_y}})) * 2.0 - 1.0;',
};
