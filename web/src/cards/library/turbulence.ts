import type { CardDef } from '../types';

export const TURBULENCE: CardDef = {
  type: 'turbulence',
  category: 'shape',
  friendlyName: 'Turbulence',
  description: 'Sum of |signed noise| — turbulent, lava-like.',
  icon: '🔥',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 0.5, max: 20, step: 0.1 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    float _v = 0.0;
    float _a = 0.5;
    for (int i = 0; i < 4; i++) {
      _v += _a * abs(noise2(_p) * 2.0 - 1.0);
      _p *= 2.0;
      _a *= 0.5;
    }
    d = _v;
  }`,
  helpers: ['noise2'],
};
