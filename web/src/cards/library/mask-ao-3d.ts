// Mask: AO (3D) — sets the layer mask from ambient occlusion (iq's 5-tap march
// along the normal): high in tight creases/contact shadows, low on open faces.
// Follow with a dark Paint block to ground objects and add grime in cavities.

import type { CardDef } from '../types';

export const MASK_AO_3D: CardDef = {
  type: 'mask_ao_3d',
  category: 'color',
  friendlyName: 'Mask: AO',
  description: 'Layer mask from ambient occlusion — drives the next Paint block.',
  icon: '🌑',
  mode: '3d',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.12, min: 0.02, max: 0.6, step: 0.01 },
    strength: { kind: 'float', label: 'strength', default: 1.4, min: 0, max: 4, step: 0.05 },
  },
  snippetTemplate: '// mask_ao_3d (3D) radius={{radius}} strength={{strength}}',
  contribution3d: {
    albedo: `float _ao = 0.0;
float _sca = 1.0;
for (int _i = 0; _i < 5; _i++) {
  float _hr = 0.01 + {{radius}} * float(_i) / 4.0;
  float _dd = sdScene(p + n * _hr);
  _ao += (_hr - _dd) * _sca;
  _sca *= 0.92;
}
mask = clamp(_ao * {{strength}}, 0.0, 1.0);`,
  },
};
