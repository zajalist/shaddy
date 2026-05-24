// BLOCK_LIBRARY — the canonical registry of every block type the compiler
// recognises. The AI-import path (separate module) also reads this to know
// what types Claude is allowed to emit.

import type { BlockDef } from '../types';
import { BRIGHTNESS_CONTRAST } from './brightness-contrast';
import { CHECKER } from './checker';
import { CUSTOM } from './custom';
import { DOTS } from './dots';
import { GLOW } from './glow';
import { GRAIN } from './grain';
import { HUE_CYCLE } from './hue-cycle';
import { INVERT } from './invert';
import { KALEIDOSCOPE } from './kaleidoscope';
import { NOISE_FIELD } from './noise-field';
import { PALETTE } from './palette';
import { PIXELATE } from './pixelate';
import { POSTERIZE } from './posterize';
import { RADIAL_GRADIENT } from './radial-gradient';
import { REPEAT } from './repeat';
import { RING } from './ring';
import { RIPPLE } from './ripple';
import { ROTATE } from './rotate';
import { SCANLINES } from './scanlines';
import { SPIRAL } from './spiral';
import { STRIPES } from './stripes';
import { SWIRL } from './swirl';
import { TRIPLE_GRADIENT } from './triple-gradient';
import { VIGNETTE } from './vignette';
import { VORONOI } from './voronoi';
import { WAVE_WARP } from './wave-warp';

export {
  BRIGHTNESS_CONTRAST,
  CHECKER,
  CUSTOM,
  DOTS,
  GLOW,
  GRAIN,
  HUE_CYCLE,
  INVERT,
  KALEIDOSCOPE,
  NOISE_FIELD,
  PALETTE,
  PIXELATE,
  POSTERIZE,
  RADIAL_GRADIENT,
  REPEAT,
  RING,
  RIPPLE,
  ROTATE,
  SCANLINES,
  SPIRAL,
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
  RING,
  STRIPES,
  CHECKER,
  DOTS,
  SPIRAL,
  NOISE_FIELD,
  VORONOI,
  // distortion
  RIPPLE,
  SWIRL,
  REPEAT,
  WAVE_WARP,
  ROTATE,
  KALEIDOSCOPE,
  PIXELATE,
  // color
  PALETTE,
  TRIPLE_GRADIENT,
  HUE_CYCLE,
  INVERT,
  POSTERIZE,
  // effect
  VIGNETTE,
  GLOW,
  GRAIN,
  SCANLINES,
  BRIGHTNESS_CONTRAST,
  // custom
  CUSTOM,
];

export const BLOCK_LIBRARY: Record<string, BlockDef> = Object.fromEntries(
  ALL.map((b) => [b.type, b]),
);

export const BLOCK_LIBRARY_LIST: readonly BlockDef[] = ALL;
