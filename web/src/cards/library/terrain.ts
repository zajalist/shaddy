// Lit terrain — an fbm heightfield shaded by a sun direction (normals taken
// from neighbouring height samples), then tinted by elevation: deep water →
// sand → grass → rock → snow. A self-contained "landscape" scene block; the
// look the marketing terrain tile and any "procedural world" needs. Writes
// `col` directly (like a scene), so put colour/effect blocks AFTER it.

import type { CardDef } from '../types';

export const TERRAIN: CardDef = {
  type: 'terrain',
  category: 'shape',
  friendlyName: 'Terrain',
  description: 'Sun-lit fbm heightfield tinted by elevation — a landscape.',
  icon: '⛰',
  io: { reads: ['uv'], writes: ['d', 'col'] },
  params: {
    scale: { kind: 'float', label: 'scale', default: 1.6, min: 0.4, max: 6, step: 0.05 },
    drift: { kind: 'float', label: 'drift', default: 0.04, min: 0, max: 0.4, step: 0.005 },
    snow: { kind: 'float', label: 'snowline', default: 0.78, min: 0.5, max: 0.95, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}} + vec2(u_time * {{drift}}, 0.0);
    float _e = 0.012;
    float _h  = fbm2(_p * 1.7);
    float _hx = fbm2((_p + vec2(_e, 0.0)) * 1.7);
    float _hy = fbm2((_p + vec2(0.0, _e)) * 1.7);
    vec3 _nor = normalize(vec3(_h - _hx, _e * 2.2, _h - _hy));
    vec3 _sun = normalize(vec3(-0.55, 0.6, -0.35));
    float _dif = clamp(dot(_nor, _sun), 0.0, 1.0);
    float _sky = clamp(0.5 + 0.5 * _nor.y, 0.0, 1.0);
    vec3 _c = mix(vec3(0.03, 0.20, 0.46), vec3(0.80, 0.71, 0.46), smoothstep(0.42, 0.47, _h));
    _c = mix(_c, vec3(0.16, 0.43, 0.18), smoothstep(0.47, 0.57, _h));
    _c = mix(_c, vec3(0.40, 0.34, 0.30), smoothstep(0.64, 0.74, _h));
    _c = mix(_c, vec3(0.95, 0.96, 1.00), smoothstep({{snow}}, {{snow}} + 0.08, _h));
    col = _c * (0.25 * _sky + 1.05 * _dif) + vec3(0.04, 0.05, 0.08) * _sky;
    d = _h; // expose the height field so downstream blocks can read it
  }`,

  helpers: ['fbm2'],
};
