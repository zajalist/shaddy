import type { CardDef } from '../types';

export const FOUR_GRADIENT: CardDef = {
  type: 'four_gradient',
  category: 'color',
  friendlyName: 'Four gradient',
  description: 'Four-colour gradient mapped to d (A→B→C→D).',
  icon: '🌈',
  params: {
    color_a: { kind: 'color', label: 'colour a', default: [0.05, 0.04, 0.2] },
    color_b: { kind: 'color', label: 'colour b', default: [0.8, 0.15, 0.5] },
    color_c: { kind: 'color', label: 'colour c', default: [1, 0.6, 0.2] },
    color_d: { kind: 'color', label: 'colour d', default: [1, 0.95, 0.6] },
  },
  snippetTemplate: `{
    float _t = clamp(d, 0.0, 1.0) * 3.0;
    vec3 _c0 = mix({{color_a}}, {{color_b}}, clamp(_t, 0.0, 1.0));
    vec3 _c1 = mix({{color_b}}, {{color_c}}, clamp(_t - 1.0, 0.0, 1.0));
    vec3 _c2 = mix({{color_c}}, {{color_d}}, clamp(_t - 2.0, 0.0, 1.0));
    col = mix(mix(_c0, _c1, step(1.0, _t)), _c2, step(2.0, _t));
  }`,
};
