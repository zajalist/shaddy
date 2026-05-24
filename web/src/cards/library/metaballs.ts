// Book of Shaders — sin-driven metaballs that merge smoothly.

import type { CardDef } from '../types';

export const METABALLS: CardDef = {
  type: 'metaballs',
  category: 'shape',
  friendlyName: 'Metaballs',
  description: 'Three sin-driven blobs that merge (Book of Shaders).',
  icon: '⬭',
  params: {
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 4, step: 0.01 },
    falloff: { kind: 'float', label: 'falloff', default: 0.18, min: 0.04, max: 0.6, step: 0.005 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    vec2 _b1 = vec2(cos(_t) * 0.5, sin(_t * 1.3) * 0.4);
    vec2 _b2 = vec2(sin(_t * 0.9) * 0.6, cos(_t * 1.1) * 0.5);
    vec2 _b3 = vec2(cos(_t * 1.4 + 1.7) * 0.4, sin(_t * 0.7 + 2.3) * 0.6);
    float _f = {{falloff}};
    float _v = _f / length(uv - _b1) + _f / length(uv - _b2) + _f / length(uv - _b3);
    d = smoothstep(0.9, 1.1, _v);
  }`,
};
