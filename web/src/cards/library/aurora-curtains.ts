// Aurora curtains — the 50-step screen-space aurora accumulation from nimitz's
// "Auroras" (CC BY-NC-SA), composited over whatever's beneath it (a Night sky).
// Reads + writes col.

import type { CardDef } from '../types';

export const AURORA_CURTAINS: CardDef = {
  type: 'aurora_curtains',
  category: 'effect',
  friendlyName: 'Aurora curtains',
  description: 'Animated aurora light curtains (nimitz) over the sky.',
  icon: '🌌',
  helpers: ['auroraLib'],
  params: {
    intensity: { kind: 'float', label: 'intensity', default: 1, min: 0, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    vec3 ro = vec3(0.0, 0.0, -6.7);
    vec3 rd = normalize(vec3(uv * 0.5, 1.3));
    if (rd.y > 0.0) {
      vec4 aur = smoothstep(0.0, 1.5, auroraAccum(ro, rd)) * {{intensity}};
      col = col * (1.0 - aur.a) + aur.rgb;
    }
  }`,
};
