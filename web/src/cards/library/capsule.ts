// Capsule / stadium SDF — line segment a..b inflated by a radius.

import type { CardDef } from '../types';

export const CAPSULE: CardDef = {
  type: 'capsule',
  category: 'shape',
  friendlyName: 'Capsule',
  description: 'Stadium / pill shape — segment inflated by a radius.',
  icon: '⬬',
  params: {
    ax: { kind: 'float', label: 'a.x', default: -0.4, min: -1.5, max: 1.5, step: 0.01 },
    ay: { kind: 'float', label: 'a.y', default: 0, min: -1.5, max: 1.5, step: 0.01 },
    bx: { kind: 'float', label: 'b.x', default: 0.4, min: -1.5, max: 1.5, step: 0.01 },
    by: { kind: 'float', label: 'b.y', default: 0, min: -1.5, max: 1.5, step: 0.01 },
    radius: { kind: 'float', label: 'radius', default: 0.2, min: 0.01, max: 1, step: 0.005 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfCapsule(uv, vec2({{ax}}, {{ay}}), vec2({{bx}}, {{by}}), {{radius}}));',
  helpers: ['sdfCapsule'],
};
