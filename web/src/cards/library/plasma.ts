// Classic demoscene plasma — sum of sins at different orientations + radial.

import type { CardDef } from '../types';

export const PLASMA: CardDef = {
  type: 'plasma',
  category: 'shape',
  friendlyName: 'Plasma',
  description: 'Demoscene plasma — sum of sinusoids.',
  icon: '✺',
  params: {
    scale: { kind: 'float', label: 'scale', default: 4, min: 0.5, max: 20, step: 0.1 },
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 3, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _p = uv * {{scale}};
    float _t = u_time * {{speed}};
    float _v = sin(_p.x + _t) + sin(_p.y * 1.3 + _t * 0.9)
             + sin((_p.x + _p.y) * 0.7 + _t * 1.2)
             + sin(length(_p) * 1.5 + _t * 1.7);
    d = 0.5 + 0.125 * _v;
  }`,
};
