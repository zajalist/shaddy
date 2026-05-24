import type { CardDef } from '../types';

export const ICE_PALETTE: CardDef = {
  type: 'ice_palette',
  category: 'color',
  friendlyName: 'Ice palette',
  description: 'Cold blue → white.',
  icon: '❄',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d + {{shift}}, 0.0, 1.0);
    col = mix(vec3(0.02, 0.06, 0.18), vec3(0.4, 0.7, 0.95), smoothstep(0.0, 0.6, _t));
    col = mix(col, vec3(0.95, 0.98, 1.0), smoothstep(0.7, 1.0, _t));
  }`,
};
