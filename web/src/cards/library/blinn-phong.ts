// Fake Blinn-Phong specular — derives a pseudo-normal from the uv (treats
// the canvas like a viewed sphere) and adds a tight specular lobe toward a
// chosen light direction.

import type { CardDef } from '../types';

export const BLINN_PHONG: CardDef = {
  type: 'blinn_phong',
  category: 'effect',
  friendlyName: 'Blinn-Phong',
  description: 'Fake Blinn-Phong specular highlight.',
  icon: '💡',
  params: {
    light_x: { kind: 'float', label: 'light x', default: 0.4, min: -1, max: 1, step: 0.01 },
    light_y: { kind: 'float', label: 'light y', default: 0.5, min: -1, max: 1, step: 0.01 },
    shininess: { kind: 'float', label: 'shininess', default: 32, min: 1, max: 256, step: 1 },
    intensity: { kind: 'float', label: 'intensity', default: 0.8, min: 0, max: 4, step: 0.01 },
  },
  snippetTemplate: `{
    float _z = sqrt(max(1.0 - dot(uv, uv), 0.0));
    vec3 _n = vec3(uv, _z);
    vec3 _l = normalize(vec3({{light_x}}, {{light_y}}, 1.0));
    vec3 _v = vec3(0.0, 0.0, 1.0);
    vec3 _h = normalize(_l + _v);
    float _spec = pow(max(dot(_n, _h), 0.0), {{shininess}});
    col += vec3(_spec) * {{intensity}};
  }`,
};
