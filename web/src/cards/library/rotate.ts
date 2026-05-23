import type { CardDef } from '../types';

// Rotate UV by `angle` radians around the centre. Place ABOVE a shape card.

export const ROTATE: CardDef = {
  type: 'rotate',
  category: 'distortion',
  friendlyName: 'Rotate',
  description: 'Rotate UV space around the centre. Place above a shape card.',
  icon: '↻',
  params: {
    angle: { kind: 'float', label: 'angle', default: 0, min: -6.2831, max: 6.2831, step: 0.01 },
  },
  snippetTemplate: `{
    float _c = cos({{angle}});
    float _s = sin({{angle}});
    uv = vec2(_c * uv.x - _s * uv.y, _s * uv.x + _c * uv.y);
  }`,
};
