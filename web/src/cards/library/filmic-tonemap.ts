// Hable / Uncharted-2 filmic tonemap. Stronger toe + shoulder than Reinhard;
// preserves shadow detail and rolls off highlights cinematically.

import type { CardDef } from '../types';

export const FILMIC_TONEMAP: CardDef = {
  type: 'filmic_tonemap',
  category: 'effect',
  friendlyName: 'Filmic tonemap',
  description: 'Hable / Uncharted-2 filmic tonemap curve.',
  icon: '🎥',
  params: {
    exposure: { kind: 'float', label: 'exposure', default: 1, min: 0, max: 4, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _x = col * {{exposure}} * 2.0;
    float _A = 0.15;
    float _B = 0.50;
    float _C = 0.10;
    float _D = 0.20;
    float _E = 0.02;
    float _F = 0.30;
    vec3 _n = ((_x * (_A * _x + _C * _B) + _D * _E) / (_x * (_A * _x + _B) + _D * _F)) - _E / _F;
    float _wn = ((11.2 * (_A * 11.2 + _C * _B) + _D * _E) / (11.2 * (_A * 11.2 + _B) + _D * _F)) - _E / _F;
    col = clamp(_n / _wn, 0.0, 1.0);
  }`,
};
