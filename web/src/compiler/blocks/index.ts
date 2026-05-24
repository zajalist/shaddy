// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. The AI-import path (separate module) also reads this to know
// what types Claude is allowed to emit.

import type { BlockDef } from '../types';
import { HUE_CYCLE } from './hue-cycle';
import { NOISE_FIELD } from './noise-field';
import { PALETTE } from './palette';
import { RADIAL_GRADIENT } from './radial-gradient';
import { REPEAT } from './repeat';
import { RING } from './ring';
import { RIPPLE } from './ripple';
import { STRIPES } from './stripes';
import { SWIRL } from './swirl';
import { TRIPLE_GRADIENT } from './triple-gradient';
import { VORONOI } from './voronoi';

export {
  HUE_CYCLE,
  NOISE_FIELD,
  PALETTE,
  RADIAL_GRADIENT,
  REPEAT,
  RING,
  RIPPLE,
  STRIPES,
  SWIRL,
  TRIPLE_GRADIENT,
  VORONOI,
};

const ALL: BlockDef[] = [
  RADIAL_GRADIENT,
  STRIPES,
  NOISE_FIELD,
  RING,
  VORONOI,
  RIPPLE,
  SWIRL,
  REPEAT,
  PALETTE,
  HUE_CYCLE,
  TRIPLE_GRADIENT,
];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
