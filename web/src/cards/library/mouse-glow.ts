import type { CardDef } from '../types';

// Soft radial glow at the live mouse position. RecipeCanvas wires
// u_mouse into the same centred / aspect-corrected space as `uv`, so
// `length(uv - u_mouse)` reads as the screen-space distance to the
// pointer. Falls off via smoothstep so the highlight blends additively
// without a hard edge.

export const MOUSE_GLOW: CardDef = {
  type: 'mouse_glow',
  category: 'effect',
  friendlyName: 'Mouse Glow',
  description: 'Soft radial glow that follows the mouse pointer.',
  icon: '✦',
  params: {
    intensity: { kind: 'float', label: 'intensity', default: 1.0, min: 0, max: 2, step: 0.01 },
    radius: { kind: 'float', label: 'radius', default: 0.35, min: 0.05, max: 1, step: 0.01 },
    color: { kind: 'color', label: 'color', default: [1.0, 0.85, 0.55] },
  },
  snippetTemplate: `{
    float _md = length(uv - u_mouse);
    float _mg = smoothstep({{radius}}, 0.0, _md) * {{intensity}};
    col += {{color}} * _mg;
  }`,
};
