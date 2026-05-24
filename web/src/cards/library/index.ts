// The card library. Currently 94 typed cards + the wildcard escape hatch.
// Adding a card is content work — drop a file in this folder, add it to
// CARD_LIBRARY_LIST, and the compiler + UI pick it up automatically.
// Helper-function dependencies declared via CardDef.helpers are resolved
// and emitted by the compiler (see ./helpers).

import type { CardDef } from '../types';

// ── existing 15 (PR #65 + earlier follow-ups) ──
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

// ── shapes: SDF geometrics ──
import { ARC } from './arc';
import { CROSS } from './cross';
import { HEART } from './heart';
import { HEXAGON } from './hexagon';
import { RECTANGLE } from './rectangle';
import { SQUARE } from './square';
import { STAR } from './star';
import { TRIANGLE } from './triangle';

// ── shapes: noise family ──
import { DOMAIN_WARP } from './domain-warp';
import { FBM } from './fbm';
import { RIDGED } from './ridged';
import { TURBULENCE } from './turbulence';
import { WORLEY_EDGES } from './worley-edges';

// ── shapes: math / patterns / polar ──
import { BRICK_WALL } from './brick-wall';
import { CAUSTICS } from './caustics';
import { CONCENTRIC_RINGS } from './concentric-rings';
import { DIAMOND_GRID } from './diamond-grid';
import { GRADIENT_CONIC } from './gradient-conic';
import { GRADIENT_LINEAR } from './gradient-linear';
import { HEX_GRID } from './hex-grid';
import { INTERFERENCE } from './interference';
import { JULIA } from './julia';
import { MOIRE } from './moire';
import { PLASMA } from './plasma';
import { ROSE_CURVE } from './rose-curve';
import { SECTOR } from './sector';
import { SIN_FIELD } from './sin-field';
import { SPIRAL_ARMS } from './spiral-arms';
import { SUNBURST } from './sunburst';
import { TRIANGLE_GRID } from './triangle-grid';
import { TRUCHET } from './truchet';

// ── distortions ──
import { BANDS } from './bands';
import { CONTOUR } from './contour';
import { FISHEYE } from './fisheye';
import { INVERT_D } from './invert-d';
import { MIRROR_X } from './mirror-x';
import { MIRROR_Y } from './mirror-y';
import { NOISE_WARP } from './noise-warp';
import { POLAR_WARP } from './polar-warp';
import { POWER_CURVE } from './power-curve';
import { SCALE_UV } from './scale-uv';
import { SIN_WAVE_D } from './sin-wave-d';
import { SKEW } from './skew';
import { THRESHOLD_D } from './threshold-d';
import { TRANSLATE } from './translate';
import { TWIRL } from './twirl';
import { ZOOM_BLUR_UV } from './zoom-blur-uv';

// ── colors ──
import { COSINE_PALETTE } from './cosine-palette';
import { CYBERPUNK_PALETTE } from './cyberpunk-palette';
import { D_AS_RGB } from './d-as-rgb';
import { DUOTONE } from './duotone';
import { FOREST_PALETTE } from './forest-palette';
import { FOUR_GRADIENT } from './four-gradient';
import { GRAYSCALE } from './grayscale';
import { HUE_SHIFT } from './hue-shift';
import { ICE_PALETTE } from './ice-palette';
import { LAVA_PALETTE } from './lava-palette';
import { NEON_PALETTE } from './neon-palette';
import { OCEAN_PALETTE } from './ocean-palette';
import { PASTEL_PALETTE } from './pastel-palette';
import { RAINBOW_D } from './rainbow-d';
import { SATURATE } from './saturate';
import { SEPIA } from './sepia';
import { SOLID_COLOR } from './solid-color';
import { SPLIT_TONE } from './split-tone';
import { SUNSET_PALETTE } from './sunset-palette';
import { TRITONE } from './tritone';

// ── effects ──
import { ASCII } from './ascii';
import { BLOOM } from './bloom';
import { CHROMATIC_ABERRATION } from './chromatic-aberration';
import { CONTRAST } from './contrast';
import { CRT_CURVATURE } from './crt-curvature';
import { DIM } from './dim';
import { DITHER } from './dither';
import { EDGE_DETECT } from './edge-detect';
import { EXPOSURE } from './exposure';
import { FILM_GRAIN_COLOR } from './film-grain-color';
import { FOG } from './fog';
import { GAMMA } from './gamma';
import { GOD_RAYS } from './god-rays';
import { HALFTONE } from './halftone';
import { OVERLAY_NOISE } from './overlay-noise';
import { PULSE_BRIGHTNESS } from './pulse-brightness';
import { PULSE_HUE } from './pulse-hue';
import { RADIAL_BLUR_FAKE } from './radial-blur-fake';
import { SKETCH } from './sketch';
import { TINT } from './tint';
import { VHS_GLITCH } from './vhs-glitch';

export {
  // existing
  GLOW, GRAIN, HUE_CYCLE, NOISE_FIELD, PALETTE, RADIAL_GRADIENT, REPEAT, RING, RIPPLE,
  STRIPES, SWIRL, TRIPLE_GRADIENT, VIGNETTE, VORONOI_CELLS, WAVE_WARP,
  // new shapes — sdf
  ARC, CROSS, HEART, HEXAGON, RECTANGLE, SQUARE, STAR, TRIANGLE,
  // new shapes — noise
  DOMAIN_WARP, FBM, RIDGED, TURBULENCE, WORLEY_EDGES,
  // new shapes — math / patterns / polar
  BRICK_WALL, CAUSTICS, CONCENTRIC_RINGS, DIAMOND_GRID, GRADIENT_CONIC, GRADIENT_LINEAR,
  HEX_GRID, INTERFERENCE, JULIA, MOIRE, PLASMA, ROSE_CURVE, SECTOR, SIN_FIELD,
  SPIRAL_ARMS, SUNBURST, TRIANGLE_GRID, TRUCHET,
  // new distortions
  BANDS, CONTOUR, FISHEYE, INVERT_D, MIRROR_X, MIRROR_Y, NOISE_WARP, POLAR_WARP,
  POWER_CURVE, SCALE_UV, SIN_WAVE_D, SKEW, THRESHOLD_D, TRANSLATE, TWIRL, ZOOM_BLUR_UV,
  // new colors
  COSINE_PALETTE, CYBERPUNK_PALETTE, D_AS_RGB, DUOTONE, FOREST_PALETTE, FOUR_GRADIENT,
  GRAYSCALE, HUE_SHIFT, ICE_PALETTE, LAVA_PALETTE, NEON_PALETTE, OCEAN_PALETTE,
  PASTEL_PALETTE, RAINBOW_D, SATURATE, SEPIA, SOLID_COLOR, SPLIT_TONE, SUNSET_PALETTE, TRITONE,
  // new effects
  ASCII, BLOOM, CHROMATIC_ABERRATION, CONTRAST, CRT_CURVATURE, DIM, DITHER, EDGE_DETECT,
  EXPOSURE, FILM_GRAIN_COLOR, FOG, GAMMA, GOD_RAYS, HALFTONE, OVERLAY_NOISE, PULSE_BRIGHTNESS,
  PULSE_HUE, RADIAL_BLUR_FAKE, SKETCH, TINT, VHS_GLITCH,
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
// list in the order they appear here. Grouped by sub-theme inside each
// category for browsability.
export const CARD_LIBRARY_LIST: CardDef[] = [
  // ─── SHAPES ───
  // Primitives
  RADIAL_GRADIENT, RING, SQUARE, RECTANGLE, TRIANGLE, HEXAGON, STAR, HEART, CROSS, ARC,
  // Repeating patterns
  STRIPES, HEX_GRID, TRIANGLE_GRID, DIAMOND_GRID, BRICK_WALL, TRUCHET,
  // Noise family
  NOISE_FIELD, FBM, RIDGED, TURBULENCE, DOMAIN_WARP, VORONOI_CELLS, WORLEY_EDGES,
  // Math / waves
  SIN_FIELD, PLASMA, INTERFERENCE, MOIRE, CAUSTICS, JULIA,
  // Polar / radial
  CONCENTRIC_RINGS, SUNBURST, ROSE_CURVE, SECTOR, SPIRAL_ARMS,
  // Gradients
  GRADIENT_LINEAR, GRADIENT_CONIC,

  // ─── DISTORTIONS ───
  // UV transforms
  TRANSLATE, SCALE_UV, MIRROR_X, MIRROR_Y, SKEW, POLAR_WARP, FISHEYE, ZOOM_BLUR_UV,
  // Noise-driven
  SWIRL, TWIRL, NOISE_WARP, WAVE_WARP, REPEAT,
  // Scalar transforms
  RIPPLE, THRESHOLD_D, INVERT_D, POWER_CURVE, BANDS, CONTOUR, SIN_WAVE_D,

  // ─── COLORS ───
  // Generic
  PALETTE, TRIPLE_GRADIENT, FOUR_GRADIENT, DUOTONE, COSINE_PALETTE, RAINBOW_D, HUE_CYCLE,
  D_AS_RGB, SOLID_COLOR, TRITONE, SPLIT_TONE,
  // Themed palettes
  SUNSET_PALETTE, OCEAN_PALETTE, LAVA_PALETTE, ICE_PALETTE, CYBERPUNK_PALETTE,
  PASTEL_PALETTE, NEON_PALETTE, FOREST_PALETTE,
  // Adjustments
  HUE_SHIFT, SATURATE, GRAYSCALE, SEPIA,

  // ─── EFFECTS ───
  // Lens / atmospheric
  VIGNETTE, GLOW, BLOOM, GOD_RAYS, RADIAL_BLUR_FAKE, FOG, CHROMATIC_ABERRATION,
  // Tonal
  CONTRAST, EXPOSURE, GAMMA, DIM, TINT,
  // Stylize
  HALFTONE, SKETCH, ASCII, DITHER, EDGE_DETECT, OVERLAY_NOISE,
  // Texture / noise
  GRAIN, FILM_GRAIN_COLOR,
  // Retro
  CRT_CURVATURE, VHS_GLITCH,
  // Time-driven
  PULSE_BRIGHTNESS, PULSE_HUE,
];

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  CARD_LIBRARY_LIST.map((c) => [c.type, c]),
);

export function lookupCardDef(type: string): CardDef | null {
  return CARD_LIBRARY[type] ?? null;
}
