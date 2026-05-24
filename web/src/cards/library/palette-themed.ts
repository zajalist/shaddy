// Themed cosine-palette presets — one card with a preset selector that
// switches between 8 hand-tuned colour ramps (sunset / ocean / lava / ice /
// cyberpunk / pastel / neon / forest). `preset` is a first-class `select`
// param; under the hood the uniform is a float that the shader casts to int.
//
// Preset index → ramp:
//   0 = sunset    (warm magenta → orange → cream, cospal)
//   1 = ocean     (deep teal → cyan → foam,        cospal)
//   2 = lava      (black → red → yellow → white,   mix chain)
//   3 = ice       (deep blue → pale white,         mix chain)
//   4 = cyberpunk (near-black → magenta → cyan,    mix chain)
//   5 = pastel    (soft pinks/mints/lavenders,     cospal)
//   6 = neon      (saturated electric colours,     cospal)
//   7 = forest    (deep moss → green → cream,      mix chain)

import type { CardDef } from '../types';

export const PALETTE_THEMED: CardDef = {
  type: 'palette_themed',
  category: 'color',
  friendlyName: 'Themed palette',
  description: 'Preset themed palettes — sunset, ocean, lava, ice, cyberpunk, pastel, neon, forest.',
  icon: '🎨',
  params: {
    preset: {
      kind: 'select',
      label: 'preset',
      default: 0,
      options: [
        { value: 0, label: 'sunset' },
        { value: 1, label: 'ocean' },
        { value: 2, label: 'lava' },
        { value: 3, label: 'ice' },
        { value: 4, label: 'cyberpunk' },
        { value: 5, label: 'pastel' },
        { value: 6, label: 'neon' },
        { value: 7, label: 'forest' },
      ],
    },
    shift: { kind: 'float', label: 'shift', default: 0, min: -1, max: 1, step: 0.01 },
  },
  snippetTemplate: `{
    float _t = clamp(d + {{shift}}, 0.0, 1.0);
    int _p = int({{preset}});
    if (_p == 0) {
      col = cospal(_t, vec3(0.5, 0.3, 0.4), vec3(0.5, 0.5, 0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));
    } else if (_p == 1) {
      col = cospal(_t, vec3(0.0, 0.3, 0.4), vec3(0.1, 0.6, 0.6), vec3(1.0, 1.0, 1.0), vec3(0.3, 0.2, 0.2));
    } else if (_p == 2) {
      col = mix(vec3(0.02, 0.0, 0.0), vec3(0.9, 0.1, 0.0), smoothstep(0.0, 0.5, _t));
      col = mix(col, vec3(1.0, 0.9, 0.2), smoothstep(0.4, 0.85, _t));
      col = mix(col, vec3(1.0, 1.0, 0.95), smoothstep(0.85, 1.0, _t));
    } else if (_p == 3) {
      col = mix(vec3(0.02, 0.06, 0.18), vec3(0.4, 0.7, 0.95), smoothstep(0.0, 0.6, _t));
      col = mix(col, vec3(0.95, 0.98, 1.0), smoothstep(0.7, 1.0, _t));
    } else if (_p == 4) {
      col = mix(vec3(0.05, 0.0, 0.1), vec3(1.0, 0.1, 0.7), smoothstep(0.1, 0.55, _t));
      col = mix(col, vec3(0.0, 0.9, 1.0), smoothstep(0.6, 1.0, _t));
    } else if (_p == 5) {
      col = cospal(_t, vec3(0.75, 0.7, 0.8), vec3(0.2, 0.2, 0.2), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.3, 0.6));
    } else if (_p == 6) {
      col = cospal(_t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.5), vec3(2.0, 1.0, 1.0), vec3(0.0, 0.25, 0.5));
    } else {
      col = mix(vec3(0.04, 0.08, 0.05), vec3(0.15, 0.4, 0.2), smoothstep(0.0, 0.5, _t));
      col = mix(col, vec3(0.55, 0.75, 0.35), smoothstep(0.45, 0.85, _t));
      col = mix(col, vec3(0.95, 0.95, 0.7), smoothstep(0.85, 1.0, _t));
    }
  }`,
  helpers: ['cospal'],
};
