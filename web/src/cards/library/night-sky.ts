// Night sky — background gradient + procedural stars from nimitz's "Auroras"
// (CC BY-NC-SA). The base layer of the aurora scene; pair with Aurora curtains.

import type { CardDef } from '../types';

export const NIGHT_SKY: CardDef = {
  type: 'night_sky',
  category: 'shape',
  friendlyName: 'Night sky',
  description: 'Gradient sky + procedural stars (nimitz Auroras).',
  icon: '🌌',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  helpers: ['nmzStars'],
  params: {
    stars: { kind: 'float', label: 'stars', default: 1, min: 0, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    vec3 rd = normalize(vec3(uv * 0.5, 1.3));
    float fade = smoothstep(0.0, 0.01, abs(rd.y)) * 0.1 + 0.9;
    col = auBg(rd) * fade;
    col += auStars(rd) * {{stars}};
    d = 0.0;
  }`,
};
