// Atom (3D) — a sphere that orbits the origin over time. Stack several with a
// Smooth Union (3D) above them and they merge into a metaball molecule. A
// composable building block for raymarched metaball scenes.

import type { CardDef } from '../types';

export const ATOM_3D: CardDef = {
  type: 'atom_3d',
  category: 'shape',
  friendlyName: 'Atom',
  description: 'An orbiting sphere — stack + smooth-union for a molecule.',
  icon: '⚛',
  mode: '3d',
  params: {
    radius: { kind: 'float', label: 'orbit r', default: 1.1, min: 0, max: 3, step: 0.05 },
    size: { kind: 'float', label: 'size', default: 0.5, min: 0.05, max: 2, step: 0.05 },
    speed: { kind: 'float', label: 'speed', default: 0.6, min: 0, max: 3, step: 0.01 },
    phase: { kind: 'float', label: 'phase', default: 0, min: 0, max: 6.2832, step: 0.05 },
  },
  snippetTemplate: '// atom_3d (3D) orbit={{radius}} size={{size}} speed={{speed}} phase={{phase}}',
  contribution3d: {
    sdfExpr: 'length(p - {{radius}} * vec3(sin(u_time * {{speed}} + {{phase}}), cos(u_time * {{speed}} * 0.8 + {{phase}} * 1.7), sin(u_time * {{speed}} * 1.2 + {{phase}} * 2.3))) - {{size}}',
  },
};
