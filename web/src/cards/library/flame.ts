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
    vec2 _p = vec2(uv.x * {{width}}, uv.y);
    float _n = fbm2(_p * {{scale}} + vec2(0.0, -_t * 1.6));
    _n += 0.5 * fbm2(_p * {{scale}} * 2.0 - vec2(0.0, _t * 2.4));
    float _env = 1.0 - smoothstep(0.0, 1.1, length(vec2(uv.x * 1.7, uv.y + 0.5)));
    d = clamp(_n * _env * 1.8, 0.0, 1.0);
  }`,
  helpers: ['fbm2'],
};
