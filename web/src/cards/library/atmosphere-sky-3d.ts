// Atmosphere sky (3D) — a richer sky than the plain gradient: horizon→zenith
// falloff with a bright sun disc/glow along a chosen direction. Also adds sky
// ambient. Feeds reflections/refraction via g_sky.

import type { CardDef } from '../types';

export const ATMOSPHERE_SKY_3D: CardDef = {
  type: 'atmosphere_sky_3d',
  category: 'effect',
  friendlyName: 'Atmosphere Sky',
  description: 'Sky gradient + sun glow along a direction + sky ambient.',
  icon: '🌅',
  mode: '3d',
  params: {
    horizon: { kind: 'color', label: 'horizon', default: [0.78, 0.82, 0.86] },
    zenith: { kind: 'color', label: 'zenith', default: [0.18, 0.38, 0.74] },
    sunColor: { kind: 'color', label: 'sun', default: [1.0, 0.85, 0.6] },
    sx: { kind: 'float', label: 'sun x', default: 0.3, min: -1, max: 1, step: 0.05 },
    sy: { kind: 'float', label: 'sun y', default: 0.5, min: -1, max: 1, step: 0.05 },
    sz: { kind: 'float', label: 'sun z', default: -0.5, min: -1, max: 1, step: 0.05 },
  },
  snippetTemplate:
    '// atmosphere_sky_3d (3D) horizon={{horizon}} zenith={{zenith}} sun={{sunColor}} dir=({{sx}},{{sy}},{{sz}})',
  contribution3d: {
    sky: `mix({{horizon}}, {{zenith}}, pow(clamp(rd.y, 0.0, 1.0), 0.45)) + {{sunColor}} * (pow(max(dot(rd, normalize(vec3({{sx}}, {{sy}}, {{sz}}))), 0.0), 256.0) + 0.25 * pow(max(dot(rd, normalize(vec3({{sx}}, {{sy}}, {{sz}}))), 0.0), 8.0))`,
    light: 'lcol += alb * mix({{horizon}}, {{zenith}}, clamp(n.y * 0.5 + 0.5, 0.0, 1.0)) * 0.35;',
  },
};
