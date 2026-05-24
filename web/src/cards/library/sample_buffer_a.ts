// Sample Buffer A — read the last-rendered contents of Buffer A's FBO
// into either `d` (luminance) or `col` (rgb). Works inside any pass — when
// used INSIDE buffer A itself, the multi-pass renderer's ping-pong wiring
// guarantees this reads the PREVIOUS frame's output.
//
// The `source` param is a `buffer` ParamDef whose value is the literal
// buffer id ('a'). The compiler emits a `sampler2D` uniform; the renderer
// binds the corresponding FBO texture into that uniform's slot every
// frame. The serialised value stays a string so the Recipe round-trips
// through JSON.

import type { CardDef } from '../types';

export const SAMPLE_BUFFER_A: CardDef = {
  type: 'sample_buffer_a',
  category: 'shape',
  friendlyName: 'Sample Buffer A',
  description:
    'Read Buffer A at the current uv. Writes to d (luminance) or col (rgb). Inside Buffer A, reads the previous frame (ping-pong).',
  icon: 'A',
  params: {
    source: { kind: 'buffer', label: 'buffer', default: 'a' },
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
