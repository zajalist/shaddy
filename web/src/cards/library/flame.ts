// Upward turbulent flame shaped by a soft envelope so it reads as fire rather
// than generic noise. Two scrolling fbm octaves rise; the envelope tapers the
// sides and top.

import type { CardDef } from '../types';

export const FLAME: CardDef = {
  type: 'flame',
  category: 'shape',
  friendlyName: 'Flame',
  description: 'Rising turbulent fire shaped by an envelope.',
  icon: '🔥',
  params: {
    speed: { kind: 'float', label: 'speed', default: 1, min: 0, max: 4, step: 0.05 },
    scale: { kind: 'float', label: 'scale', default: 3, min: 0.5, max: 10, step: 0.1 },
    width: { kind: 'float', label: 'width', default: 1.3, min: 0.5, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    // noise scrolls upward; two octaves lick at different rates
    vec2 _p = vec2(uv.x * {{width}}, uv.y);
    float _n = fbm2(_p * {{scale}} + vec2(0.0, -_t * 1.8));
    _n += 0.5 * fbm2(_p * {{scale}} * 2.1 + vec2(0.3, -_t * 3.0));
    _n *= 0.62;
    // tall column envelope: wide base tapering to a narrow tip
    float _w = mix(0.62, 0.14, smoothstep(-0.85, 0.95, uv.y));
    float _horiz = smoothstep(_w, 0.0, abs(uv.x));
    float _vert = smoothstep(1.05, -0.75, uv.y) * smoothstep(-1.0, -0.75, uv.y);
    d = clamp((_n + 0.28) * _horiz * _vert * 1.7, 0.0, 1.0);
  }`,
  helpers: ['fbm2'],
};
