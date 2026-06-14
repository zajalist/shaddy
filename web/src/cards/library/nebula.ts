// Nebula — layered domain-warped gas with a glowing core, emissive hotspots
// and a twinkling starfield baked in. A full deep-space scene from one block.

import type { CardDef } from '../types';

export const NEBULA: CardDef = {
  type: 'nebula',
  category: 'shape',
  friendlyName: 'Nebula',
  description: 'Domain-warped interstellar gas, glowing core + stars.',
  icon: '🌌',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    drift: { kind: 'float', label: 'drift', default: 0.02, min: 0, max: 0.3, step: 0.005 },
    density: { kind: 'float', label: 'density', default: 1.3, min: 0.5, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{density}} + vec2(u_time * {{drift}}, 0.0);
    float _f = fbm2(_p * 1.8);
    vec2 _q = vec2(fbm2(_p * 1.8 + 4.0 * _f), fbm2(_p * 1.8 + 4.0 * _f + 5.0));
    float _n = fbm2(_p * 2.2 + 3.0 * _q);
    vec3 _c = vec3(0.02, 0.01, 0.06);
    _c = mix(_c, vec3(0.24, 0.06, 0.45), smoothstep(0.25, 0.62, _n));
    _c = mix(_c, vec3(0.68, 0.18, 0.55), smoothstep(0.5, 0.88, _n));
    _c = mix(_c, vec3(0.15, 0.45, 0.92), smoothstep(0.55, 0.95, _q.x * 0.5 + 0.5));
    float _core = pow(max(0.0, 1.0 - length(uv) * 0.85), 2.0);
    _c += vec3(0.85, 0.7, 1.0) * _core * 0.5;
    _c += vec3(1.0, 0.85, 0.7) * pow(smoothstep(0.82, 1.0, _n), 3.0);
    vec2 _sg = uv * 90.0; vec2 _si = floor(_sg);
    float _h = hash21(_si);
    float _star = step(0.94, _h) * smoothstep(0.06, 0.0, length(fract(_sg) - 0.5));
    _c += vec3(0.9, 0.95, 1.0) * _star * (0.6 + 0.4 * sin(u_time * 2.0 + _h * 30.0));
    col = _c;
    d = _n;
  }`,
  helpers: ['fbm2', 'hash21'],
};
