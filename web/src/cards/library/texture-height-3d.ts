// Texture: height tint (3D) — sets the surface albedo from the hit's altitude
// (p.y): low → mid → high colours. Turns a bare terrain into rock/grass/snow.
// A 3D texturing block (overrides flat material).

import type { CardDef } from '../types';

export const TEXTURE_HEIGHT_3D: CardDef = {
  type: 'texture_height_3d',
  category: 'color',
  friendlyName: 'Texture: height (3D)',
  description: 'Albedo by altitude — e.g. rock → grass → snow.',
  icon: '🗻',
  mode: '3d',
  params: {
    low: { kind: 'color', label: 'low', default: [0.18, 0.36, 0.16] },
    mid: { kind: 'color', label: 'mid', default: [0.42, 0.34, 0.26] },
    high: { kind: 'color', label: 'high', default: [0.95, 0.96, 1.0] },
    h0: { kind: 'float', label: 'low→mid', default: 0.5, min: -4, max: 6, step: 0.1 },
    h1: { kind: 'float', label: 'mid', default: 1.8, min: -4, max: 6, step: 0.1 },
    h2: { kind: 'float', label: 'mid→high', default: 3.0, min: -4, max: 8, step: 0.1 },
  },
  snippetTemplate: '// texture_height_3d (3D) low={{low}} mid={{mid}} high={{high}} bands={{h0}},{{h1}},{{h2}}',
  contribution3d: {
    albedo: 'alb = mix(mix({{low}}, {{mid}}, smoothstep({{h0}}, {{h1}}, p.y)), {{high}}, smoothstep({{h1}}, {{h2}}, p.y));',
  },
};
