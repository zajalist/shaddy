// Sea — layered swell with depth-tinted water, caustic shimmer, foam crests
// and a sun glint. A believable ocean surface from one block (a light-weight
// stand-in for a full Seascape raymarch).

import type { CardDef } from '../types';

export const SEA: CardDef = {
  type: 'sea',
  category: 'shape',
  friendlyName: 'Sea',
  description: 'Layered ocean swell — caustics, foam, sun glint.',
  icon: '🌊',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 3, step: 0.01 },
    choppy: { kind: 'float', label: 'choppy', default: 3, min: 1, max: 8, step: 0.1 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    vec2 _sp = uv * {{choppy}};
    float _w = 0.0, _amp = 0.5;
    for (int _i = 0; _i < 4; _i++) {
      _sp = _sp * 1.7 + 1.3;
      _w += _amp * sin(_sp.x + _t + sin(_sp.y * 1.3 + _t * 0.8));
      _amp *= 0.55;
    }
    _w = _w * 0.5 + 0.5;
    vec3 _c = mix(vec3(0.02, 0.10, 0.22), vec3(0.10, 0.45, 0.55), smoothstep(0.3, 0.9, _w));
    float _caust = pow(0.5 + 0.5 * sin(_w * 12.0 + _t * 1.5), 4.0);
    _c += vec3(0.7, 0.95, 1.0) * _caust * 0.35;
    float _glint = pow(max(0.0, 1.0 - length(uv - vec2(0.0, 0.5))), 3.0);
    _c += vec3(1.0, 0.95, 0.8) * _glint * _caust * 1.2;
    _c += vec3(1.0) * smoothstep(0.93, 1.0, _w) * 0.5;
    col = _c;
    d = _w;
  }`,
};
