// Twinkling starfield laid over the current colour. Cells on a grid host a
// star with some probability; each twinkles on its own phase. Reusable for
// nebula / galaxy / aurora / any night-sky look.

import type { CardDef } from '../types';

export const STARFIELD: CardDef = {
  type: 'starfield',
  category: 'effect',
  friendlyName: 'Starfield',
  description: 'Sprinkle twinkling stars over the colour — night skies.',
  icon: '✦',
  params: {
    density: { kind: 'float', label: 'density', default: 60, min: 8, max: 200, step: 1 },
    coverage: { kind: 'float', label: 'coverage', default: 0.07, min: 0.005, max: 0.5, step: 0.005 },
    size: { kind: 'float', label: 'size', default: 0.08, min: 0.01, max: 0.4, step: 0.01 },
    twinkle: { kind: 'float', label: 'twinkle', default: 3, min: 0, max: 10, step: 0.1 },
    color: { kind: 'color', label: 'colour', default: [1, 1, 1] },
  },
  snippetTemplate: `{
    vec2 _sg = uv * {{density}};
    vec2 _si = floor(_sg);
    vec2 _sf = fract(_sg) - 0.5;
    float _hh = hash21(_si);
    float _star = step(1.0 - {{coverage}}, _hh);
    vec2 _off = (hash22(_si) - 0.5) * 0.7;
    float _dd = length(_sf - _off);
    float _tw = 0.84 + 0.16 * sin(u_time * {{twinkle}} + _hh * 6.2831);
    col += {{color}} * _star * smoothstep({{size}}, 0.0, _dd) * _tw;
  }`,
  helpers: ['hash21', 'hash22'],
};
