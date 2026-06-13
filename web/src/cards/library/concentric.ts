// Generic concentric bands. The `type` attribute picks the band geometry —
// circular rings, square bands, or N-gon bands — so one card replaces the old
// concentric_rings / concentric_squares / concentric_polygons trio (those are
// kept hidden for recipe back-compat).

import type { CardDef } from '../types';

export const CONCENTRIC: CardDef = {
  type: 'concentric',
  category: 'shape',
  friendlyName: 'Concentric',
  description: 'Concentric bands from the centre. Pick rings, squares, or polygon in "type".',
  icon: '◎',
  params: {
    type: {
      kind: 'select',
      label: 'type',
      default: 0,
      options: [
        { value: 0, label: 'Rings' },
        { value: 1, label: 'Squares' },
        { value: 2, label: 'Polygon' },
      ],
    },
    count: { kind: 'float', label: 'count', default: 6, min: 1, max: 24, step: 0.5 },
    width: { kind: 'float', label: 'width', default: 0.5, min: 0.05, max: 0.95, step: 0.01 },
    sides: { kind: 'float', label: 'sides', default: 6, min: 3, max: 12, step: 1 },
  },
  snippetTemplate: `{
    int _ct = int({{type}});
    float _m;
    if (_ct == 1) { _m = max(abs(uv.x), abs(uv.y)); }
    else if (_ct == 2) { _m = sdfPolyN(uv, 0.9, int({{sides}})) + 0.9; }
    else { _m = length(uv); }
    float _b = fract(_m * {{count}});
    d = 1.0 - smoothstep({{width}}, {{width}} + 0.04, abs(_b - 0.5) * 2.0);
  }`,
  helpers: ['sdfPolyN'],
};
