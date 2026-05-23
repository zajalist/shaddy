import type { CardDef } from '../types';

// CRT-style horizontal scanlines. spacing controls the line density,
// intensity controls how dark the dark lines get.

export const SCANLINES: CardDef = {
  type: 'scanlines',
  category: 'effect',
  friendlyName: 'Scanlines',
  description: 'CRT-style horizontal scanline darkening.',
  icon: '═',
  params: {
    spacing: { kind: 'float', label: 'spacing', default: 4, min: 1, max: 20, step: 0.5 },
    intensity: { kind: 'float', label: 'intensity', default: 0.35, min: 0, max: 1, step: 0.01 },
  },
  snippetTemplate:
    'col *= 1.0 - {{intensity}} * step(0.5, fract(gl_FragCoord.y / {{spacing}}));',
};
