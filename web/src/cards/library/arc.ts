// Arc / partial ring — useful for clocks, dials, progress indicators.

import type { CardDef } from '../types';

export const ARC: CardDef = {
  type: 'arc',
  category: 'shape',
  friendlyName: 'Arc',
  description: 'Partial ring spanning a given angle.',
  icon: '◜',
  params: {
    radius: { kind: 'float', label: 'radius', default: 0.5, min: 0, max: 1.5, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.04, min: 0.005, max: 0.5, step: 0.005 },
    sweep: { kind: 'float', label: 'sweep', default: 4.0, min: 0.1, max: 6.2832, step: 0.05 },
  },
  snippetTemplate: `{
    float _r = length(uv);
    float _a = atan(uv.x, -uv.y);
    float _arc = abs(_a) < {{sweep}} * 0.5 ? 0.0 : 1.0;
    float _band = smoothstep({{thickness}}, 0.0, abs(_r - {{radius}}));
    d = _band * (1.0 - _arc);
  }`,
};
