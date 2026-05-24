import type { CardDef } from '../types';

export const CROSS: CardDef = {
  type: 'cross',
  category: 'shape',
  friendlyName: 'Cross',
  description: 'Plus / cross / crosshair shape.',
  icon: '✚',
  params: {
    length: { kind: 'float', label: 'length', default: 0.5, min: 0.05, max: 1.5, step: 0.01 },
    thickness: { kind: 'float', label: 'thickness', default: 0.12, min: 0.01, max: 0.5, step: 0.005 },
  },
  snippetTemplate: `{
    float _h = 1.0 - smoothstep(-0.005, 0.005, sdfBox(uv, vec2({{length}}, {{thickness}})));
    float _v = 1.0 - smoothstep(-0.005, 0.005, sdfBox(uv, vec2({{thickness}}, {{length}})));
    d = max(_h, _v);
  }`,
  helpers: ['sdfBox'],
};
