// Heat ramp — map d to a blackbody-style incandescence ramp: black → deep red
// → orange → yellow → white-hot. The colour primitive for fire, lava, embers,
// plasma — anything glowing by temperature.

import type { CardDef } from '../types';

export const HEAT_RAMP: CardDef = {
  type: 'heat_ramp',
  category: 'color',
  friendlyName: 'Heat ramp',
  description: 'Blackbody incandescence: black→red→orange→yellow→white.',
  icon: '🌡',
  params: {
    gain: { kind: 'float', label: 'gain', default: 1, min: 0.2, max: 3, step: 0.05 },
  },
  snippetTemplate: `{
    float _x = clamp(d * {{gain}}, 0.0, 1.0);
    vec3 _c = mix(vec3(0.02, 0.0, 0.0), vec3(0.6, 0.0, 0.0), smoothstep(0.0, 0.28, _x));
    _c = mix(_c, vec3(1.0, 0.28, 0.0), smoothstep(0.28, 0.52, _x));
    _c = mix(_c, vec3(1.0, 0.62, 0.05), smoothstep(0.52, 0.74, _x));
    _c = mix(_c, vec3(1.0, 0.95, 0.55), smoothstep(0.74, 0.9, _x));
    _c = mix(_c, vec3(1.0, 1.0, 0.95), smoothstep(0.9, 1.0, _x));
    col = _c;
  }`,
};
