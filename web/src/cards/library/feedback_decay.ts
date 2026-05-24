// Feedback Decay — the simplest possible ping-pong demo. Reads the OWN
// pass's previous frame and writes (previous * decay) + current col. Drop
// this into a buffer pass to get a fading trail of whatever previous
// passes wrote.
//
// Self-reference is wired through the multi-pass renderer's ping-pong
// mechanism: each buffer pass holds two FBOs; this card samples the
// "read" (previous frame) FBO while the pass writes into the "write"
// (current frame) FBO. The pass's `source` param defaults to the same
// buffer the user has placed this card in (the renderer is responsible
// for resolving "this pass's own previous frame").

import type { CardDef } from '../types';

export const FEEDBACK_DECAY: CardDef = {
  type: 'feedback_decay',
  category: 'effect',
  friendlyName: 'Feedback decay',
  description:
    'Mix in the previous frame of a buffer, scaled by decay. Use inside a buffer pass for trail effects.',
  icon: '↻',
  params: {
    source: { kind: 'buffer', label: 'buffer', default: 'a' },
    decay: { kind: 'float', label: 'decay', default: 0.92, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: [
    '{',
    '  vec2 _ui = uv * 0.5 + 0.5;',
    '  vec3 _prev = texture({{source}}, _ui).rgb;',
    '  col = _prev * {{decay}} + col * (1.0 - {{decay}});',
    '}',
  ].join('\n'),
};
