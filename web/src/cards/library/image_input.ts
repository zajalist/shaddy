// Image Input — sample an uploaded PNG/JPG into the shader.
//
// The `source` param is the literal that gets exchanged: in the Recipe it's
// a data URL (so it round-trips through serialisation); the integration
// layer attaches the live HTMLImageElement via Parameter.sourceRef.
//
// Channel options:
//   0 — luminance → d (drives any d-based downstream card)
//   1 — full RGB → col (paints the image)
//   2 — red channel → d
//   3 — alpha → d
//
// `uv_scale` lets the user zoom the texture in the unit-square uv space the
// card maps to. uv_scale < 1 zooms in (sample a smaller window of the image);
// uv_scale > 1 zooms out (tiles via the GL texture clamp — sampling past
// 0..1 just clamps to the edge).

import type { CardDef } from '../types';

export const IMAGE_INPUT: CardDef = {
  type: 'image_input',
  category: 'shape',
  friendlyName: 'Image',
  description: 'Upload a PNG/JPG. Sampled as a texture into d (luminance) or col (RGB).',
  icon: '🖼',
  params: {
    source: { kind: 'image', label: 'image', default: null },
    channel: {
      kind: 'select',
      label: 'channel',
      default: 0,
      options: [
        { value: 0, label: 'lum → d' },
        { value: 1, label: 'rgb → col' },
        { value: 2, label: 'r → d' },
        { value: 3, label: 'a → d' },
      ],
    },
    uv_scale: { kind: 'float', label: 'uv scale', default: 1, min: 0.1, max: 10, step: 0.05 },
  },
  // The snippet emits a small block that samples the bound sampler2D. The
  // `{{source}}` placeholder resolves to the per-card uniform name
  // (u_cardN_source) — the compiler substitutes texture uniforms exactly the
  // same way it substitutes float / vec3 uniforms.
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
