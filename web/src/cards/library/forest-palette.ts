import type { CardDef } from '../types';

export const FOREST_PALETTE: CardDef = {
  type: 'forest_palette',
  category: 'color',
  friendlyName: 'Forest palette',
  description: 'Mossy greens to deep teal.',
  icon: '🌲',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d + {{shift}}, 0.0, 1.0);
    col = mix(vec3(0.04, 0.08, 0.05), vec3(0.15, 0.4, 0.2), smoothstep(0.0, 0.5, _t));
    col = mix(col, vec3(0.55, 0.75, 0.35), smoothstep(0.45, 0.85, _t));
    col = mix(col, vec3(0.95, 0.95, 0.7), smoothstep(0.85, 1.0, _t));
  }`,
};
