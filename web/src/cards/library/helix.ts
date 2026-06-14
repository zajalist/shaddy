// Double-helix — two sine strands twisting around each other with base-pair
// rungs between them. The "DNA" shape, built from pure trig so it stays cheap.

import type { CardDef } from '../types';

export const HELIX: CardDef = {
  type: 'helix',
  category: 'shape',
  friendlyName: 'Double helix',
  description: 'Two twisting sine strands with base-pair rungs — DNA.',
  icon: '🧬',
  params: {
    speed: { kind: 'float', label: 'speed', default: 0.9, min: 0, max: 4, step: 0.05 },
    twist: { kind: 'float', label: 'twist', default: 9, min: 1, max: 24, step: 0.5 },
    spread: { kind: 'float', label: 'spread', default: 0.34, min: 0.05, max: 0.8, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.06, min: 0.01, max: 0.2, step: 0.005 },
    rungs: { kind: 'float', label: 'rungs', default: 4.5, min: 1, max: 12, step: 0.5 },
  },
  snippetTemplate: `{
    float _t = u_time * {{speed}};
    float _ph = uv.y * {{twist}} + _t;
    float _x1 = {{spread}} * sin(_ph);
    float _x2 = {{spread}} * sin(_ph + 3.14159);
    float _s1 = smoothstep({{thickness}}, 0.0, abs(uv.x - _x1));
    float _s2 = smoothstep({{thickness}}, 0.0, abs(uv.x - _x2));
    float _rung = smoothstep(0.03, 0.0, abs(fract(uv.y * {{rungs}} + _t * 0.16) - 0.5));
    _rung *= step(min(_x1, _x2), uv.x) * step(uv.x, max(_x1, _x2));
    d = max(max(_s1, _s2), _rung * 0.7);
  }`,
};
