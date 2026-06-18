// Sky (3D) — sets the background gradient (horizon→zenith by ray height) AND
// adds sky ambient light to surfaces. The background also feeds fresnel
// reflections (via g_sky), so reflective water/metal pick up the sky.

import type { CardDef } from '../types';

export const SKY_3D: CardDef = {
  type: 'sky_3d',
  category: 'effect',
  friendlyName: 'Sky',
  description: 'Gradient sky background + sky ambient light + reflections.',
  icon: '🌤',
  mode: '3d',
  params: {
    horizon: { kind: 'color', label: 'horizon', default: [0.72, 0.80, 0.92] },
    zenith: { kind: 'color', label: 'zenith', default: [0.20, 0.42, 0.82] },
    ambient: { kind: 'color', label: 'ambient', default: [0.32, 0.42, 0.55] },
  },
  snippetTemplate: '// sky_3d (3D) horizon={{horizon}} zenith={{zenith}} ambient={{ambient}}',
  contribution3d: {
    sky: 'mix({{horizon}}, {{zenith}}, clamp(rd.y * 0.6 + 0.25, 0.0, 1.0))',
    light: 'lcol += alb * (0.35 + 0.45 * clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) * {{ambient}};',
  },
};
