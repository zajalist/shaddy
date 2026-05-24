// Per-channel grain — gives a richer film look than the monochrome `grain` card.

import type { CardDef } from '../types';

export const FILM_GRAIN_COLOR: CardDef = {
  type: 'film_grain_color',
  category: 'effect',
  friendlyName: 'Film grain (colour)',
  description: 'Independent R/G/B grain — more authentic film than mono grain.',
  icon: '🎞',
  params: {
    amount: { kind: 'float', label: 'amount', default: 0.06, min: 0, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec3 _n = vec3(
      hash21(gl_FragCoord.xy + fract(u_time)),
      hash21(gl_FragCoord.xy + 13.7 + fract(u_time)),
      hash21(gl_FragCoord.xy + 27.3 + fract(u_time))
    );
    col += (_n - 0.5) * {{amount}};
  }`,
  helpers: ['hash21'],
};
