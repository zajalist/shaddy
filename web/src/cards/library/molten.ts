// Molten — dark rock crust with glowing cracks of lava welling up through it.
// Two scrolling fbm layers: one flows, one forms the brittle crust; the thin
// spots glow hot and emissive.

import type { CardDef } from '../types';

export const MOLTEN: CardDef = {
  type: 'molten',
  category: 'shape',
  friendlyName: 'Molten rock',
  description: 'Dark crust with glowing lava cracks welling up.',
  icon: '🌋',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.5, min: 0.5, max: 5, step: 0.05 },
    flow: { kind: 'float', label: 'flow', default: 0.15, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    float _flow = fbm2(_p * 2.0 + vec2(0.0, u_time * {{flow}}));
    float _crust = fbm2(_p * 4.0 - u_time * 0.05);
    float _crack = smoothstep(0.52, 0.42, _crust);
    vec3 _c = mix(vec3(0.05, 0.02, 0.02), vec3(0.26, 0.07, 0.03), _flow);
    float _heat = _crack * (0.5 + 0.5 * _flow);
    _c = mix(_c, vec3(1.0, 0.35, 0.05), smoothstep(0.2, 0.7, _heat));
    _c = mix(_c, vec3(1.0, 0.88, 0.45), pow(smoothstep(0.6, 0.95, _heat), 2.0));
    _c += vec3(1.0, 0.4, 0.1) * _heat * 0.45;
    col = _c;
    d = _heat;
  }`,
  helpers: ['fbm2'],
};
