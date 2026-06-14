// Atoms — orbiting metaball "atoms" that merge into a glowing molecule, each
// blob carrying its own colour, with a bright fresnel-ish rim where the field
// peaks. Reads as a lit molecular model rather than flat blobs.

import type { CardDef } from '../types';

export const ATOMS: CardDef = {
  type: 'atoms',
  category: 'shape',
  friendlyName: 'Atoms',
  description: 'Orbiting coloured metaballs that merge — a molecule.',
  icon: '⚛',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 3, step: 0.01 },
    count: { kind: 'float', label: 'atoms', default: 5, min: 2, max: 6, step: 1 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    float _m = 0.0; vec3 _acc = vec3(0.0);
    for (int _k = 0; _k < 6; _k++) {
      if (float(_k) >= {{count}}) break;
      float _fk = float(_k);
      vec2 _ctr = 0.6 * vec2(sin(_t * 0.7 + _fk * 1.7), cos(_t * 0.9 + _fk * 2.3));
      float _w = 0.05 / (dot(uv - _ctr, uv - _ctr) + 0.02);
      _m += _w;
      _acc += _w * (0.55 + 0.45 * cos(_fk * 1.5 + vec3(0.0, 2.0, 4.0)));
    }
    vec3 _base = _acc / max(_m, 1e-3);
    float _surf = smoothstep(0.8, 1.3, _m);
    vec3 _c = vec3(0.02, 0.03, 0.07);
    _c = mix(_c, _base, _surf);
    _c += vec3(1.0) * pow(smoothstep(1.2, 2.2, _m), 3.0) * 0.5;
    col = _c;
    d = _surf;
  }`,
};
