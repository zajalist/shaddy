// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. The AI-import path (separate module) also reads this to know
// what types Claude is allowed to emit.

import type { BlockDef } from '../types';
import { GLOW } from './glow';
import { GRAIN } from './grain';
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
import { VIGNETTE } from './vignette';
import { VORONOI } from './voronoi';
import { WAVE_WARP } from './wave-warp';

export {
  GLOW,
  GRAIN,
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
  VIGNETTE,
  VORONOI,
  WAVE_WARP,
};

const ALL: BlockDef[] = [
  // shape
  RADIAL_GRADIENT,
  STRIPES,
  NOISE_FIELD,
  RING,
  VORONOI,
  // distortion
  RIPPLE,
  SWIRL,
  REPEAT,
  WAVE_WARP,
  // color
  PALETTE,
  HUE_CYCLE,
  TRIPLE_GRADIENT,
  // effect
  GLOW,
  VIGNETTE,
  GRAIN,
];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
