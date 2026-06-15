// Texture: noise (3D) — sets surface albedo by mixing two colours with fbm of
// the hit position (xz plane). Adds organic variation to a surface's colour.

import type { CardDef } from '../types';

export const TEXTURE_NOISE_3D: CardDef = {
  type: 'texture_noise_3d',
  category: 'color',
  friendlyName: 'Texture: detail (3D)',
  description: 'Triplanar fbm detail — varies albedo by surface position without stretching.',
  icon: '🎨',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 2.5, min: 0.1, max: 12, step: 0.1 },
    amount: { kind: 'float', label: 'amount', default: 0.35, min: 0, max: 1, step: 0.01 },
    tint: { kind: 'color', label: 'tint', default: [0.7, 0.65, 0.55] },
  },
  snippetTemplate: '// texture_noise_3d (3D) scale={{scale}} amount={{amount}} tint={{tint}}',
  contribution3d: {
    // Triplanar fbm — project on all 3 axes, blend by |normal| so steep faces
    // don't smear. Modulates the running albedo, so it stacks on other textures.
    albedo: `{
  vec3 _tw = abs(n); _tw /= (_tw.x + _tw.y + _tw.z + 1e-4);
  float _td = fbm2(p.yz * {{scale}}) * _tw.x + fbm2(p.xz * {{scale}}) * _tw.y + fbm2(p.xy * {{scale}}) * _tw.z;
  alb = mix(alb, alb * mix({{tint}}, vec3(1.3), _td), {{amount}});
}`,
  },
};
