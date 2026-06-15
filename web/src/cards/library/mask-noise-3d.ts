// Mask: detail (3D) — sets the layer mask from triplanar fbm of the hit
// position (no stretching on steep faces). Use it to break up flat colour with
// patches of a second material via a Paint block (dirt, moss, rust).

import type { CardDef } from '../types';

export const MASK_NOISE_3D: CardDef = {
  type: 'mask_noise_3d',
  category: 'color',
  friendlyName: 'Mask: detail (3D)',
  description: 'Layer mask from triplanar fbm — drives the next Paint block.',
  icon: '🎨',
  mode: '3d',
  helpers: ['fbm2'],
  params: {
    scale: { kind: 'float', label: 'scale', default: 3, min: 0.1, max: 16, step: 0.1 },
    low: { kind: 'float', label: 'low', default: 0.4, min: 0, max: 1, step: 0.01 },
    high: { kind: 'float', label: 'high', default: 0.7, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate: '// mask_noise_3d (3D) scale={{scale}} low={{low}} high={{high}}',
  contribution3d: {
    albedo: `{
  vec3 _mw = abs(n); _mw /= (_mw.x + _mw.y + _mw.z + 1e-4);
  float _mn = fbm2(p.yz * {{scale}}) * _mw.x + fbm2(p.xz * {{scale}}) * _mw.y + fbm2(p.xy * {{scale}}) * _mw.z;
  mask = smoothstep({{low}}, {{high}}, _mn);
}`,
  },
};
