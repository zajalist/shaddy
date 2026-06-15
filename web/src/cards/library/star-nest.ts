// Star Nest — faithful port of "Star Nest" by Pablo Roman Andrioli (MIT,
// shadertoy.com/view/XlfGRj). A 3D kaliset fractal rendered volumetrically:
// the camera flies forward through a folded fractal field. The author's
// constants are kept as params so the look matches the original; chain a
// Vignette / Exposure after it. Writes `col`.

import type { CardDef } from '../types';

export const STAR_NEST: CardDef = {
  type: 'star_nest',
  category: 'shape',
  friendlyName: 'Star Nest',
  description: 'Volumetric kaliset starfield (Pablo Roman Andrioli) — fly-through nebula.',
  icon: '✦',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    zoom: { kind: 'float', label: 'zoom', default: 0.8, min: 0.2, max: 2, step: 0.01 },
    speed: { kind: 'float', label: 'speed', default: 0.02, min: 0, max: 0.2, step: 0.001 },
    formu: { kind: 'float', label: 'fractal', default: 0.53, min: 0.3, max: 0.9, step: 0.01 },
    tile: { kind: 'float', label: 'tile', default: 0.85, min: 0.4, max: 1.5, step: 0.01 },
    brightness: { kind: 'float', label: 'brightness', default: 0.0015, min: 0.0005, max: 0.005, step: 0.0001 },
    darkmatter: { kind: 'float', label: 'dark matter', default: 0.3, min: 0, max: 1, step: 0.01 },
    distfade: { kind: 'float', label: 'dist fade', default: 0.73, min: 0.5, max: 0.95, step: 0.01 },
    saturation: { kind: 'float', label: 'saturation', default: 0.85, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _uv = uv * 0.5;
    vec3 _dir = vec3(_uv * {{zoom}}, 1.0);
    float _t = u_time * {{speed}} + 0.25;
    vec3 _from = vec3(1.0, 0.5, 0.5) + vec3(_t * 2.0, _t, -2.0);
    float _s = 0.1, _fade = 1.0;
    vec3 _v = vec3(0.0);
    for (int r = 0; r < 20; r++) {
      vec3 _p = _from + _s * _dir * 0.5;
      _p = abs(vec3({{tile}}) - mod(_p, vec3({{tile}} * 2.0)));
      float _pa, _a = _pa = 0.0;
      for (int i = 0; i < 17; i++) {
        _p = abs(_p) / dot(_p, _p) - {{formu}};
        _a += abs(length(_p) - _pa);
        _pa = length(_p);
      }
      float _dm = max(0.0, {{darkmatter}} - _a * _a * 0.001);
      _a *= _a * _a;
      if (r > 6) _fade *= 1.0 - _dm;
      _v += _fade;
      _v += vec3(_s, _s * _s, _s * _s * _s * _s) * _a * {{brightness}} * _fade;
      _fade *= {{distfade}};
      _s += 0.1;
    }
    _v = mix(vec3(length(_v)), _v, {{saturation}});
    col = _v * 0.01;
    d = length(col);
  }`,
};
