// Pure line segment a..b — distance is rendered as a thin line via threshold.

import type { CardDef } from '../types';

export const SEGMENT: CardDef = {
  type: 'segment',
  category: 'shape',
  friendlyName: 'Segment',
  description: 'Flat line segment between two endpoints.',
  icon: '╱',
  params: {
    ax: { kind: 'float', label: 'a.x', default: -0.5, min: -1.5, max: 1.5, step: 0.01 },
    ay: { kind: 'float', label: 'a.y', default: -0.4, min: -1.5, max: 1.5, step: 0.01 },
    bx: { kind: 'float', label: 'b.x', default: 0.5, min: -1.5, max: 1.5, step: 0.01 },
    by: { kind: 'float', label: 'b.y', default: 0.4, min: -1.5, max: 1.5, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep({{thickness}}, {{thickness}} + 0.005, sdfSegment(uv, vec2({{ax}}, {{ay}}), vec2({{bx}}, {{by}})));',
  helpers: ['sdfSegment'],
};
