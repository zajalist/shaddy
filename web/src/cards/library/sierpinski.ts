// IFS Sierpinski-triangle escape map. Each iter folds the plane into the
// next-finer triangle; d encodes how many folds it took to "escape" the unit.

import type { CardDef } from '../types';

export const SIERPINSKI: CardDef = {
  type: 'sierpinski',
  category: 'shape',
  friendlyName: 'Sierpinski',
  description: 'IFS Sierpinski triangle via iterated fold-and-scale.',
  icon: '▲',
  params: {
    zoom: { kind: 'float', label: 'zoom', default: 1, min: 0.1, max: 5, step: 0.05 },
    iter: { kind: 'float', label: 'iter', default: 8, min: 1, max: 12, step: 1 },
  },
  snippetTemplate: `{
    vec2 _p = uv / {{zoom}} + vec2(0.0, 0.3);
    const int N = 12;
    int _maxIt = int(clamp({{iter}}, 1.0, float(N)));
    float _esc = 0.0;
    for (int i = 0; i < N; i++) {
      if (i >= _maxIt) break;
      _p.x = abs(_p.x);
      _p = _p * 2.0 - vec2(1.0, 0.5);
      if (_p.y > 0.0) {
        _esc = float(i) / float(_maxIt);
        break;
      }
    }
    d = 1.0 - _esc;
  }`,
};
