// The v1 card library. 15 typed cards across all four categories, plus the
// wildcard constants. Adding more cards is content work — drop a file in
// this folder, add it to CARD_LIBRARY_LIST, and the compiler + UI pick it
// up automatically. Helper-function dependencies declared via
// CardDef.helpers are resolved + emitted by the compiler (see ./helpers).

import type { CardDef } from '../types';

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
import { VORONOI_CELLS } from './voronoi-cells';
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
  // Shapes
  RADIAL_GRADIENT,
  RING,
  STRIPES,
  NOISE_FIELD,
  VORONOI_CELLS,
  // Distortions
  RIPPLE,
  SWIRL,
  REPEAT,
  WAVE_WARP,
  // Colors
  PALETTE,
  TRIPLE_GRADIENT,
  HUE_CYCLE,
  // Effects
  VIGNETTE,
  GLOW,
  GRAIN,
];

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  CARD_LIBRARY_LIST.map((c) => [c.type, c]),
);

export function lookupCardDef(type: string): CardDef | null {
  return CARD_LIBRARY[type] ?? null;
}
