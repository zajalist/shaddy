// Rounded box with separately controllable corner radii (top vs bottom).

import type { CardDef } from '../types';

export const ROUNDED_BOX: CardDef = {
  type: 'rounded_box',
  category: 'shape',
  friendlyName: 'Rounded box',
  description: 'Box with separate top / bottom corner radii.',
  icon: '▢',
  params: {
    width: { kind: 'float', label: 'width', default: 0.7, min: 0.05, max: 1.5, step: 0.01 },
    height: { kind: 'float', label: 'height', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    r_top: { kind: 'float', label: 'r top', default: 0.2, min: 0, max: 0.5, step: 0.005 },
    r_bottom: { kind: 'float', label: 'r bottom', default: 0.05, min: 0, max: 0.5, step: 0.005 },
    edge: { kind: 'float', label: 'edge', default: 0.01, min: 0.001, max: 0.2, step: 0.001 },
  },
  snippetTemplate:
    'd = 1.0 - smoothstep(-{{edge}}, {{edge}}, sdfRoundedBox(uv, vec2({{width}}, {{height}}), vec4({{r_top}}, {{r_bottom}}, {{r_top}}, {{r_bottom}})));',
  helpers: ['sdfRoundedBox'],
};
