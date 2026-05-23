import type { CardDef } from '../types';

// Per-pixel hash perturbation — film-grain analog. The +u_time term reseeds
// each frame so the grain shimmers.

export const GRAIN: CardDef = {
  type: 'grain',
  category: 'effect',
  friendlyName: 'Grain',
  description: 'Add film-like noise to the final image.',
  icon: '📺',
  params: {
    amount: { kind: 'float', label: 'amount', default: 0.05, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate:
    'col += vec3((hash21(gl_FragCoord.xy + fract(u_time)) - 0.5) * {{amount}});',
  helpers: ['hash21'],
};
