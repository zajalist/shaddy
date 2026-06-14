// Drifting vertical light curtains — the aurora borealis look. A noise-driven
// mid-line sways across the frame; vertical streaks give the curtain texture.

import type { CardDef } from '../types';

export const AURORA: CardDef = {
  type: 'aurora',
  category: 'shape',
  friendlyName: 'Aurora',
  description: 'Drifting light curtains — aurora borealis.',
  icon: '🌌',
  params: {
    speed: { kind: 'float', label: 'speed', default: 0.4, min: 0, max: 3, step: 0.01 },
    scale: { kind: 'float', label: 'scale', default: 2, min: 0.5, max: 8, step: 0.1 },
    sway: { kind: 'float', label: 'sway', default: 1.1, min: 0, max: 3, step: 0.05 },
    thickness: { kind: 'float', label: 'thickness', default: 0.35, min: 0.05, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    float _band = fbm2(vec2(uv.x * {{scale}} + _t * 0.3, _t * 0.1));
    float _mid = (_band - 0.5) * {{sway}};
    float _curt = smoothstep({{thickness}}, 0.0, abs(uv.y - _mid));
    float _streak = 0.55 + 0.45 * fbm2(vec2(uv.x * {{scale}} * 3.0, uv.y * 2.0 + _t));
    d = _curt * _streak;
  }`,
  helpers: ['fbm2'],
};
