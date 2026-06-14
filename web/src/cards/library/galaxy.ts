// Galaxy — logarithmic spiral arms with dust lanes, a blazing core and a
// scattered starfield. Slowly rotates.

import type { CardDef } from '../types';

export const GALAXY: CardDef = {
  type: 'galaxy',
  category: 'shape',
  friendlyName: 'Galaxy',
  description: 'Spiral arms + dust + bright core + stars.',
  icon: '🌀',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    arms: { kind: 'float', label: 'arms', default: 2, min: 1, max: 6, step: 1 },
    spin: { kind: 'float', label: 'spin', default: 0.25, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = u_time * {{spin}};
    vec2 _p = uv;
    float _r = length(_p);
    float _a = atan(_p.y, _p.x);
    float _spiral = sin({{arms}} * _a + log(_r + 0.05) * 6.0 - _t * 2.0);
    float _band = smoothstep(-0.3, 0.6, _spiral) * smoothstep(1.1, 0.1, _r);
    float _dust = fbm2(_p * 4.0 + _spiral);
    vec3 _c = vec3(0.02, 0.02, 0.06);
    _c = mix(_c, vec3(0.35, 0.15, 0.5), _band * 0.85);
    _c = mix(_c, vec3(0.95, 0.62, 0.4), _band * _dust * 0.8);
    float _core = pow(max(0.0, 1.0 - _r * 1.8), 3.0);
    _c += vec3(1.0, 0.85, 0.6) * _core * 1.5;
    _c += vec3(1.0, 0.95, 0.85) * pow(max(0.0, 1.0 - _r * 4.0), 2.0) * 0.7;
    vec2 _sg = uv * 100.0; vec2 _si = floor(_sg);
    float _h = hash21(_si);
    _c += vec3(0.9) * step(0.95, _h) * smoothstep(0.07, 0.0, length(fract(_sg) - 0.5));
    col = _c;
    d = _band;
  }`,
  helpers: ['fbm2', 'hash21'],
};
