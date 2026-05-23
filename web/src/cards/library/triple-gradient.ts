import type { CardDef } from '../types';

// 3-stop gradient: A at 0, B at 0.5, C at 1.

export const TRIPLE_GRADIENT: CardDef = {
  type: 'triple_gradient',
  category: 'color',
  friendlyName: 'Triple gradient',
  description: 'Three-colour gradient mapped to d (A at 0, B at 0.5, C at 1).',
  icon: '🔮',
  params: {
    color_a: { kind: 'color', label: 'colour a', default: [0.1, 0.05, 0.25] },
    color_b: { kind: 'color', label: 'colour b', default: [0.9, 0.3, 0.45] },
    color_c: { kind: 'color', label: 'colour c', default: [1, 0.85, 0.4] },
  },
  snippetTemplate: `{
    float _t = clamp(d, 0.0, 1.0);
    vec3 _lo = mix({{color_a}}, {{color_b}}, _t * 2.0);
    vec3 _hi = mix({{color_b}}, {{color_c}}, (_t - 0.5) * 2.0);
    col = mix(_lo, _hi, step(0.5, _t));
  }`,
};
