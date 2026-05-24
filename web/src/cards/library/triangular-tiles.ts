// Book of Shaders — equilateral triangle tiling with alternating fills.

import type { CardDef } from '../types';

export const TRIANGULAR_TILES: CardDef = {
  type: 'triangular_tiles',
  category: 'shape',
  friendlyName: 'Triangular tiles',
  description: 'Equilateral-triangle tiling, alternating fills.',
  icon: '▲',
  params: {
    scale: { kind: 'float', label: 'scale', default: 5, min: 1, max: 24, step: 0.1 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    _p.x += _p.y * 0.5;
    vec2 _ip = floor(_p);
    vec2 _fp = fract(_p);
    float _upper = step(_fp.x + _fp.y, 1.0);
    float _parity = mod(_ip.x + _ip.y, 2.0);
    d = abs(_upper - _parity);
  }`,
};
