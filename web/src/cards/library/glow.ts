import type { CardDef } from '../types';

// Single-pass fake glow — boosts the already-bright parts of col. A real
// multi-pass blur belongs in a v2 that adds offscreen FBOs to the renderer.

export const GLOW: CardDef = {
  type: 'glow',
  category: 'effect',
  friendlyName: 'Glow',
  description: 'Boost brightness where the colour is already bright.',
  icon: '✨',
  params: {
    threshold: { kind: 'float', label: 'threshold', default: 0.55, min: 0, max: 1, step: 0.01 },
    intensity: { kind: 'float', label: 'intensity', default: 1.2, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate: `{
    float _lum = dot(col, vec3(0.299, 0.587, 0.114));
    col += col * smoothstep({{threshold}}, 1.0, _lum) * {{intensity}};
  }`,
};
