import type { BlockDef } from '../types';

export const SCANLINES: BlockDef = {
  type: 'scanlines',
  category: 'effect',
  friendlyName: 'Scanlines',
  icon: 'Television',
  description: 'CRT-style horizontal banding.',
  params: {
    spacing: { kind: 'number', default: 4, min: 1, max: 20, step: 0.5, label: 'spacing', animatable: true },
    intensity: { kind: 'number', default: 0.35, min: 0, max: 1, step: 0.01, label: 'intensity', animatable: true },
  },
  glsl: 'col *= 1.0 - {{intensity}} * step(0.5, fract(gl_FragCoord.y / {{spacing}}));',
};
