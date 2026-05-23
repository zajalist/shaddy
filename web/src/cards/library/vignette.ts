import type { CardDef } from '../types';

// Local `_vignette` is scoped in a block so multiple Vignette cards can stack
// without name collision. (GLSL has block scoping; declaring it in the open
// main() body would clash on the second card.)

export const VIGNETTE: CardDef = {
  type: 'vignette',
  category: 'effect',
  friendlyName: 'Vignette',
  description: 'Darken the corners of the canvas.',
  icon: '🌫️',
  params: {
    inner: { kind: 'float', label: 'inner', default: 0.5, min: 0, max: 2, step: 0.01 },
    outer: { kind: 'float', label: 'outer', default: 1.5, min: 0, max: 2, step: 0.01 },
    strength: { kind: 'float', label: 'strength', default: 0.8, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate:
    '{ float _vignette = 1.0 - smoothstep({{inner}}, {{outer}}, length(uv)); col *= mix(1.0, _vignette, {{strength}}); }',
};
