import type { CardDef } from '../types';

// Push UV samples away from the cursor with an exponential falloff —
// downstream shapes appear to bulge outward where the user hovers.
// RecipeCanvas keeps u_mouse in the same centred space as `uv`.

export const MOUSE_REPEL: CardDef = {
  type: 'mouse_repel',
  category: 'distortion',
  friendlyName: 'Mouse Repel',
  description: 'Push UV space away from the mouse with falloff.',
  icon: '↔',
  params: {
    strength: { kind: 'float', label: 'strength', default: 0.25, min: 0, max: 1, step: 0.01 },
    radius: { kind: 'float', label: 'radius', default: 0.5, min: 0.1, max: 1.5, step: 0.01 },
  },
  snippetTemplate: `{
    vec2 _md = uv - u_mouse;
    float _ml = length(_md) + 1e-5;
    vec2 _mn = _md / _ml;
    uv += _mn * {{strength}} * exp(-_ml / {{radius}});
  }`,
};
