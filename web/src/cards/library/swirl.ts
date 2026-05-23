import type { CardDef } from '../types';

// UV distortion — modifies `uv` so the next SHAPE card sees a swirled space.
// Place ABOVE a shape card for the effect to be visible.

export const SWIRL: CardDef = {
  type: 'swirl',
  category: 'distortion',
  friendlyName: 'Swirl',
  description: 'Twist UV space around the centre. Place above a shape card.',
  icon: '🌀',
  params: {
    strength: { kind: 'float', label: 'strength', default: 2, min: -5, max: 5, step: 0.05 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.y, uv.x) + _r * {{strength}};
    uv = vec2(cos(_a), sin(_a)) * _r;
  }`,
};
