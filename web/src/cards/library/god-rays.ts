// Pseudo-god-rays — accumulate brightness along rays from a source point.
// Cheap single-pass approximation.

import type { CardDef } from '../types';

export const GOD_RAYS: CardDef = {
  type: 'god_rays',
  category: 'effect',
  friendlyName: 'God rays',
  description: 'Radial light shafts from a source point.',
  icon: '⛅',
  params: {
    sx: { kind: 'float', label: 'source x', default: 0, min: -1.5, max: 1.5, step: 0.01 },
    sy: { kind: 'float', label: 'source y', default: 0.7, min: -1.5, max: 1.5, step: 0.01 },
    decay: { kind: 'float', label: 'decay', default: 0.94, min: 0.85, max: 0.99, step: 0.005 },
    intensity: { kind: 'float', label: 'intensity', default: 0.4, min: 0, max: 2, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _src = vec2({{sx}}, {{sy}});
    vec2 _dir = (uv - _src) / 12.0;
    vec3 _accum = vec3(0.0);
    float _w = 1.0;
    vec2 _p = uv;
    for (int i = 0; i < 12; i++) {
      _p -= _dir;
      _accum += col * _w * smoothstep(0.0, 0.5, dot(col, vec3(0.333)));
      _w *= {{decay}};
    }
    col += _accum * {{intensity}} / 12.0;
  }`,
};
