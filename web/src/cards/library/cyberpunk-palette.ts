import type { CardDef } from '../types';

export const CYBERPUNK_PALETTE: CardDef = {
  type: 'cyberpunk_palette',
  category: 'color',
  friendlyName: 'Cyberpunk palette',
  description: 'Neon magenta + cyan on near-black.',
  icon: '🌃',
  params: {
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d + {{shift}}, 0.0, 1.0);
    col = mix(vec3(0.05, 0.0, 0.1), vec3(1.0, 0.1, 0.7), smoothstep(0.1, 0.55, _t));
    col = mix(col, vec3(0.0, 0.9, 1.0), smoothstep(0.6, 1.0, _t));
  }`,
};
