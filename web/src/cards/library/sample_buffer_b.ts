// Sample Buffer B — sibling of SAMPLE_BUFFER_A targeting Buffer B's FBO.
// See sample_buffer_a.ts for the design notes; the only difference is
// the `source.default` literal.

import type { CardDef } from '../types';

export const SAMPLE_BUFFER_B: CardDef = {
  type: 'sample_buffer_b',
  category: 'shape',
  friendlyName: 'Sample Buffer B',
  description:
    'Read Buffer B at the current uv. Writes to d (luminance) or col (rgb).',
  icon: 'B',
  params: {
    source: { kind: 'buffer', label: 'buffer', default: 'b' },
    channel: {
      kind: 'select',
      label: 'channel',
      default: 1,
      options: [
        { value: 0, label: 'lum → d' },
        { value: 1, label: 'rgb → col' },
        { value: 2, label: 'r → d' },
        { value: 3, label: 'a → d' },
      ],
    },
  },
  snippetTemplate: [
    '{',
    '  vec2 _ui = uv * 0.5 + 0.5;',
    '  vec4 _tex = texture({{source}}, _ui);',
    '  int _ch = int({{channel}});',
    '  if (_ch == 0) d = dot(_tex.rgb, vec3(0.299, 0.587, 0.114));',
    '  else if (_ch == 1) col = _tex.rgb;',
    '  else if (_ch == 2) d = _tex.r;',
    '  else d = _tex.a;',
    '}',
  ].join('\n'),
};
