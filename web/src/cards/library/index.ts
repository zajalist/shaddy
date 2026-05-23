// The v1 card library. 25 typed cards across all four categories, plus the
// wildcard constants. Adding more cards is content work — drop a file in
// this folder, add it to CARD_LIBRARY_LIST, and the compiler + UI pick it
// up automatically. Helper-function dependencies declared via
// CardDef.helpers are resolved + emitted by the compiler (see ./helpers).

import type { CardDef } from '../types';

import { BRIGHTNESS_CONTRAST } from './brightness-contrast';
import { CHECKER } from './checker';
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
import { VORONOI_CELLS } from './voronoi-cells';
import { WAVE_WARP } from './wave-warp';

export {
  BRIGHTNESS_CONTRAST,
  CHECKER,
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
  VORONOI_CELLS,
  WAVE_WARP,
};

export {
  WILDCARD_DISPLAY_NAME_FALLBACK,
  WILDCARD_FRIENDLY_NAME,
  WILDCARD_ICON,
  WILDCARD_TYPE,
} from './wildcard';

export {
  GLSL_HELPERS,
  HELPER_DEPS,
  HELPER_EMISSION_ORDER,
  resolveHelperClosure,
} from './helpers';

// Order matters for the UI's "+ add card" sheet: items within a category
// list in the order they appear here.
export const CARD_LIBRARY_LIST: CardDef[] = [
  // Shapes (8)
  RADIAL_GRADIENT,
  RING,
  STRIPES,
  CHECKER,
  DOTS,
  SPIRAL,
  NOISE_FIELD,
  VORONOI_CELLS,
  // Distortions (7)
  RIPPLE,
  SWIRL,
  ROTATE,
  REPEAT,
  WAVE_WARP,
  PIXELATE,
  KALEIDOSCOPE,
  // Colors (5)
  PALETTE,
  TRIPLE_GRADIENT,
  HUE_CYCLE,
  INVERT,
  POSTERIZE,
  // Effects (5)
  VIGNETTE,
  GLOW,
  GRAIN,
  SCANLINES,
  BRIGHTNESS_CONTRAST,
];

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  CARD_LIBRARY_LIST.map((c) => [c.type, c]),
);

export function lookupCardDef(type: string): CardDef | null {
  return CARD_LIBRARY[type] ?? null;
}
