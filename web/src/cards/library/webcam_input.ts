// Webcam Input — sample a live webcam feed into the shader.
//
// Identical sampling shape to IMAGE_INPUT, but the `source` param is a
// 'video' kind. RecipeCanvas detects video params and attaches a hidden
// <video> element bound to getUserMedia({video:true}); the renderer's
// sampler2D path re-uploads the current frame every rAF tick.

import type { CardDef } from '../types';

export const WEBCAM_INPUT: CardDef = {
  type: 'webcam_input',
  category: 'shape',
  friendlyName: 'Webcam',
  description: 'Live webcam feed sampled as a texture. Click the param to start/stop the camera.',
  icon: '🎥',
  params: {
    source: { kind: 'video', label: 'webcam', default: null },
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
    uv_scale: { kind: 'float', label: 'uv scale', default: 1, min: 0.1, max: 10, step: 0.05 },
  },
  snippetTemplate: [
    '{',
    '  vec2 _ui = uv * 0.5 + 0.5;',
    '  _ui /= {{uv_scale}};',
    '  vec4 _tex = texture({{source}}, _ui);',
    '  int _ch = int({{channel}});',
    '  if (_ch == 0) d = dot(_tex.rgb, vec3(0.299, 0.587, 0.114));',
    '  else if (_ch == 1) col = _tex.rgb;',
    '  else if (_ch == 2) d = _tex.r;',
    '  else d = _tex.a;',
    '}',
  ].join('\n'),
};
