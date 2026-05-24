// 12-fold rosette — common in Iznik tiles. A 12-point star plus a 6-point
// star at half rotation, drawn as a centred medallion.

import type { CardDef } from '../types';

export const ISLAMIC_12PT_ROSETTE: CardDef = {
  type: 'islamic_12pt_rosette',
  category: 'shape',
  friendlyName: 'Islamic 12-pt rosette',
  description: '12-fold rosette — Iznik medallion.',
  icon: '✦',
  params: {
    size: { kind: 'float', label: 'size', default: 0.85, min: 0.1, max: 2, step: 0.01 },
    inner: { kind: 'float', label: 'inner ratio', default: 0.55, min: 0.1, max: 0.95, step: 0.01 },
    edge: { kind: 'float', label: 'edge', default: 0.012, min: 0.002, max: 0.2, step: 0.002 },
  },
  snippetTemplate: `{
    vec2 _p = uv / {{size}};
    float _outer = sdfStar(_p, 0.9, 12, 3.0);
    float _inner = sdfStar(rot2(0.2617994) * _p, 0.9 * {{inner}}, 6, 2.4);
    float _sd = min(_outer, _inner);
    d = 1.0 - smoothstep(-{{edge}}, {{edge}}, _sd);
  }`,
  helpers: ['sdfStar', 'rot2'],
};
