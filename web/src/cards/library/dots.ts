import type { CardDef } from '../types';

// Regular grid of dots. Scale controls density, radius controls dot size.

export const DOTS: CardDef = {
  type: 'dots',
  category: 'shape',
  friendlyName: 'Dots',
  description: 'Polka-dot grid.',
  icon: '⋮⋮',
  params: {
    scale: { kind: 'float', label: 'scale', default: 8, min: 1, max: 40, step: 0.1 },
    radius: { kind: 'float', label: 'radius', default: 0.25, min: 0.02, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    vec2 _g = fract(uv * {{scale}}) - 0.5;
    d = 1.0 - smoothstep({{radius}} - 0.02, {{radius}} + 0.02, length(_g));
  }`,
};
