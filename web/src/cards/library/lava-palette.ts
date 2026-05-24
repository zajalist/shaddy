import type { CardDef } from '../types';

export const LAVA_PALETTE: CardDef = {
  type: 'lava_palette',
  category: 'color',
  friendlyName: 'Lava palette',
  description: 'Black → red → yellow → white.',
  icon: '🔥',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d + {{shift}}, 0.0, 1.0);
    col = mix(vec3(0.02, 0.0, 0.0), vec3(0.9, 0.1, 0.0), smoothstep(0.0, 0.5, _t));
    col = mix(col, vec3(1.0, 0.9, 0.2), smoothstep(0.4, 0.85, _t));
    col = mix(col, vec3(1.0, 1.0, 0.95), smoothstep(0.85, 1.0, _t));
  }`,
};
