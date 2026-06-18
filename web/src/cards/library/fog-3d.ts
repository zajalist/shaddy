// Fog (3D) — blends the lit colour toward a fog colour with distance, so the
// horizon fades into the atmosphere. Place last among the lighting blocks.

import type { CardDef } from '../types';

export const FOG_3D: CardDef = {
  type: 'fog_3d',
  category: 'effect',
  friendlyName: 'Fog',
  description: 'Distance haze — fades far surfaces into the sky.',
  icon: '🌫',
  mode: '3d',
  params: {
    color: { kind: 'color', label: 'colour', default: [0.72, 0.80, 0.92] },
    density: { kind: 'float', label: 'density', default: 0.02, min: 0, max: 0.5, step: 0.001 },
  },
  snippetTemplate: '// fog_3d (3D) color={{color}} density={{density}}',
  contribution3d: {
    light: 'lcol = mix(lcol, {{color}}, 1.0 - exp(-t * {{density}}));',
  },
};
