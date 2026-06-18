// Fresnel reflection (3D) — surfaces reflect more at grazing angles. Mixes the
// lit colour toward the sky reflection (g_sky) by a Schlick fresnel term. This
// is what gives water / wet / glassy surfaces their realistic sheen.

import type { CardDef } from '../types';

export const FRESNEL_3D: CardDef = {
  type: 'fresnel_3d',
  category: 'effect',
  friendlyName: 'Fresnel reflect',
  description: 'Reflect the sky at grazing angles — water/glass sheen.',
  icon: '💧',
  mode: '3d',
  params: {
    base: { kind: 'float', label: 'base', default: 0.02, min: 0, max: 1, step: 0.01 },
    amount: { kind: 'float', label: 'amount', default: 0.7, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// fresnel_3d (3D) base={{base}} amount={{amount}}',
  contribution3d: {
    light: `float fr = pow(1.0 - max(dot(n, -rd), 0.0), 5.0);
fr = mix({{base}}, 1.0, fr);
lcol = mix(lcol, g_sky(reflect(rd, n)), clamp(fr * {{amount}}, 0.0, 1.0));`,
  },
};
