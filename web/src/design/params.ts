// Per-block parameter library. Each block has a pool of possible params; a
// chain instance has 1-2 active by default and the user can add more from the
// "available" palette inside the BlockEditor.

import type { CategoryKey } from './tokens';

export type ParamDef = {
  id: string;
  label: string;
  unit?: string;
  defaultValue: number; // 0..1 normalized
  animatable: boolean;
  group?: 'core' | 'shape' | 'motion' | 'color' | 'advanced';
};

export type ParamPool = {
  core: string[];
  optional: string[];
  defs: Record<string, ParamDef>;
};

// Generic param pool — most blocks reuse most of these. Each block has its own
// pool with which ones are "core" (active by default) and which are "optional".

const COMMON: Record<string, ParamDef> = {
  size:        { id: 'size',        label: 'size',         defaultValue: 0.62, animatable: true,  group: 'shape' },
  freq:        { id: 'freq',        label: 'frequency',    defaultValue: 0.48, animatable: true,  group: 'motion' },
  amp:         { id: 'amp',         label: 'amplitude',    defaultValue: 0.17, animatable: true,  group: 'motion' },
  phase:       { id: 'phase',       label: 'phase',        unit: ' π',         defaultValue: 0.0,  animatable: true,  group: 'motion' },
  speed:       { id: 'speed',       label: 'speed',        defaultValue: 0.5,  animatable: false, group: 'motion' },
  falloff:     { id: 'falloff',     label: 'falloff',      defaultValue: 0.76, animatable: true,  group: 'shape' },
  offsetX:     { id: 'offsetX',     label: 'offset x',     defaultValue: 0.5,  animatable: true,  group: 'shape' },
  offsetY:     { id: 'offsetY',     label: 'offset y',     defaultValue: 0.5,  animatable: true,  group: 'shape' },
  rotation:    { id: 'rotation',    label: 'rotation',     unit: '°',          defaultValue: 0.0,  animatable: true,  group: 'shape' },
  scale:       { id: 'scale',       label: 'scale',        defaultValue: 0.5,  animatable: true,  group: 'shape' },
  softness:    { id: 'softness',    label: 'softness',     defaultValue: 0.3,  animatable: true,  group: 'shape' },
  feather:     { id: 'feather',     label: 'feather',      defaultValue: 0.1,  animatable: true,  group: 'shape' },
  twist:       { id: 'twist',       label: 'twist',        defaultValue: 0.4,  animatable: true,  group: 'shape' },
  cells:       { id: 'cells',       label: 'cells',        defaultValue: 0.55, animatable: false, group: 'shape' },
  sides:       { id: 'sides',       label: 'sides',        defaultValue: 0.5,  animatable: false, group: 'shape' },
  detail:      { id: 'detail',      label: 'detail',       defaultValue: 0.72, animatable: false, group: 'shape' },
  hueShift:    { id: 'hueShift',    label: 'hue shift',    defaultValue: 0.2,  animatable: true,  group: 'color' },
  saturation:  { id: 'saturation',  label: 'saturation',   defaultValue: 0.7,  animatable: true,  group: 'color' },
  contrast:    { id: 'contrast',    label: 'contrast',     defaultValue: 0.55, animatable: true,  group: 'color' },
  gamma:       { id: 'gamma',       label: 'gamma',        defaultValue: 0.5,  animatable: false, group: 'color' },
  brightness:  { id: 'brightness',  label: 'brightness',   defaultValue: 0.5,  animatable: true,  group: 'color' },
  mix:         { id: 'mix',         label: 'mix',          defaultValue: 0.5,  animatable: true,  group: 'core' },
  threshold:   { id: 'threshold',   label: 'threshold',    defaultValue: 0.5,  animatable: true,  group: 'color' },
  intensity:   { id: 'intensity',   label: 'intensity',    defaultValue: 0.5,  animatable: true,  group: 'core' },
  radius:      { id: 'radius',      label: 'radius',       defaultValue: 0.3,  animatable: true,  group: 'shape' },
  decay:       { id: 'decay',       label: 'decay',        defaultValue: 0.78, animatable: true,  group: 'advanced' },
  seed:        { id: 'seed',        label: 'seed',         defaultValue: 0.1,  animatable: false, group: 'advanced' },
  jitter:      { id: 'jitter',      label: 'jitter',       defaultValue: 0.2,  animatable: true,  group: 'advanced' },
  octaves:     { id: 'octaves',     label: 'octaves',      defaultValue: 0.4,  animatable: false, group: 'advanced' },
  warpAmount:  { id: 'warpAmount',  label: 'warp amount',  defaultValue: 0.35, animatable: true,  group: 'motion' },
  edgeFade:    { id: 'edgeFade',    label: 'edge fade',    defaultValue: 0.2,  animatable: false, group: 'shape' },
  invert:      { id: 'invert',      label: 'invert',       defaultValue: 0.0,  animatable: false, group: 'color' },
  glowSpread:  { id: 'glowSpread',  label: 'glow spread',  defaultValue: 0.4,  animatable: true,  group: 'core' },
  glowPower:   { id: 'glowPower',   label: 'glow power',   defaultValue: 0.6,  animatable: true,  group: 'core' },
};

const pool = (coreIds: string[], optionalIds: string[]): ParamPool => {
  const allIds = [...coreIds, ...optionalIds];
  const defs: Record<string, ParamDef> = {};
  for (const id of allIds) {
    const d = COMMON[id];
    if (d) defs[id] = d;
  }
  return { core: coreIds, optional: optionalIds, defs };
};

// Mapping by block id. Each block has 1-2 "core" params and a generous pool
// of optional ones. Falls back to a category default if not registered.
const BY_BLOCK: Record<string, ParamPool> = {
  circle:   pool(['size'],            ['softness', 'feather', 'offsetX', 'offsetY', 'edgeFade', 'falloff', 'jitter']),
  stripes:  pool(['freq'],            ['rotation', 'phase', 'amp', 'softness', 'mix', 'contrast']),
  voronoi:  pool(['cells'],           ['jitter', 'edgeFade', 'seed', 'rotation', 'mix']),
  grid:     pool(['scale'],           ['rotation', 'offsetX', 'offsetY', 'softness', 'feather', 'mix']),
  noise:    pool(['detail'],          ['octaves', 'seed', 'jitter', 'speed', 'contrast', 'warpAmount']),
  ripple:   pool(['freq', 'amp'],     ['phase', 'falloff', 'speed', 'offsetX', 'offsetY', 'radius', 'warpAmount']),
  swirl:    pool(['twist'],           ['radius', 'offsetX', 'offsetY', 'falloff', 'speed', 'phase']),
  kaleido:  pool(['sides'],           ['rotation', 'offsetX', 'offsetY', 'mix', 'feather']),
  warp:     pool(['warpAmount'],      ['freq', 'speed', 'phase', 'octaves', 'seed', 'falloff']),
  palette:  pool(['hueShift'],        ['saturation', 'brightness', 'contrast', 'gamma', 'mix']),
  hueshift: pool(['hueShift'],        ['saturation', 'speed', 'phase', 'mix']),
  invert:   pool(['mix'],             ['threshold', 'invert', 'contrast']),
  contrast: pool(['contrast'],        ['gamma', 'brightness', 'saturation', 'mix']),
  glow:     pool(['intensity'],       ['glowSpread', 'glowPower', 'threshold', 'mix', 'falloff']),
  bloom:    pool(['threshold'],       ['intensity', 'glowSpread', 'glowPower', 'softness', 'mix']),
  feedback: pool(['decay'],           ['mix', 'offsetX', 'offsetY', 'rotation', 'scale', 'warpAmount']),
  grain:    pool(['intensity'],       ['seed', 'speed', 'jitter', 'contrast', 'mix']),
};

const CATEGORY_FALLBACK: Record<CategoryKey, ParamPool> = {
  shape:   pool(['size'],        ['rotation', 'offsetX', 'offsetY', 'softness']),
  distort: pool(['warpAmount'],  ['freq', 'phase', 'speed', 'falloff']),
  color:   pool(['mix'],         ['hueShift', 'saturation', 'contrast', 'gamma']),
  effect:  pool(['intensity'],   ['mix', 'glowSpread', 'glowPower', 'threshold']),
};

export const paramPoolFor = (blockId: string, cat: CategoryKey): ParamPool =>
  BY_BLOCK[blockId] ?? CATEGORY_FALLBACK[cat];

export type ParamInstance = {
  id: string;
  value: number;
  animated: boolean;
};

export const initialActiveParams = (blockId: string, cat: CategoryKey): ParamInstance[] => {
  const p = paramPoolFor(blockId, cat);
  return p.core.map((id) => {
    const def = p.defs[id]!;
    return { id, value: def.defaultValue, animated: false };
  });
};

export const PARAM_GROUP_LABEL: Record<NonNullable<ParamDef['group']>, string> = {
  core: 'Core',
  shape: 'Shape',
  motion: 'Motion',
  color: 'Color',
  advanced: 'Advanced',
};
