import type { CardDef } from '../types';

export const SEPIA: CardDef = {
  type: 'sepia',
  category: 'color',
  friendlyName: 'Sepia',
  description: 'Old-photo sepia tone.',
  icon: '📜',
  params: {
    amount: { kind: 'float', label: 'amount', default: 1, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    vec3 _s = vec3(
      dot(col, vec3(0.393, 0.769, 0.189)),
      dot(col, vec3(0.349, 0.686, 0.168)),
      dot(col, vec3(0.272, 0.534, 0.131))
    );
    col = mix(col, _s, {{amount}});
  }`,
};
