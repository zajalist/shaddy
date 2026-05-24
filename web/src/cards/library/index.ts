// The card library. Currently 161+ typed cards + the wildcard escape hatch.
// Adding a card is content work — drop a file in this folder, add it to
// CARD_LIBRARY_LIST, and the compiler + UI pick it up automatically.
// Helper-function dependencies declared via CardDef.helpers are resolved
// and emitted by the compiler (see ./helpers).

import type { CardDef } from '../types';

// ── marker cards (no GLSL contribution) ──
import { PORTAL } from './portal';

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

// ── Book of Shaders — patterns & curves ──
import { CARDIOID_SHAPE } from './cardioid-shape';
import { CIRCLES_GRID } from './circles-grid';
import { CONCENTRIC_POLYGONS } from './concentric-polygons';
import { CONCENTRIC_SQUARES } from './concentric-squares';
import { CROSS_HATCH } from './cross-hatch';
import { DOT_GRID_2 } from './dot-grid-2';
import { LEMNISCATE } from './lemniscate';
import { METABALLS } from './metaballs';
import { POLAR_GRID } from './polar-grid';
import { RADIAL_STRIPES } from './radial-stripes';
import { RANDOM_SQUARES } from './random-squares';
import { ROSE_PETALS } from './rose-petals';
import { TRIANGULAR_TILES } from './triangular-tiles';
import { TRUCHET_TRIS } from './truchet-tris';
import { WAVY_STRIPES } from './wavy-stripes';

// ── Islamic geometric patterns ──
import { ARABESQUE_CURLS } from './arabesque-curls';
import { ISLAMIC_12PT_ROSETTE } from './islamic-12pt-rosette';
import { ISLAMIC_6PT_STAR } from './islamic-6pt-star';
import { ISLAMIC_8PT_STAR } from './islamic-8pt-star';
import { KUFIC_GRID } from './kufic-grid';
import { ZELLIGE_GRID } from './zellige-grid';

// ── shapes: extra SDFs ──
import { CAPSULE } from './capsule';
import { ELLIPSE } from './ellipse';
import { HORSESHOE } from './horseshoe';
import { PARALLELOGRAM } from './parallelogram';
import { PENTAGON } from './pentagon';
import { PIE_SLICE } from './pie-slice';
import { ROUNDED_BOX } from './rounded-box';
import { SEGMENT } from './segment';
import { TRAPEZOID } from './trapezoid';
import { VESICA } from './vesica';

// ── shapes: fractals ──
import { BURNING_SHIP } from './burning-ship';
import { MANDELBROT } from './mandelbrot';
import { MANDELBULB_2D } from './mandelbulb-2d';
import { NEWTON } from './newton';
import { ORBIT_TRAP_CIRCLE } from './orbit-trap-circle';
import { SIERPINSKI } from './sierpinski';

// ── distortions ──
import { ANTIALIASED_STEP } from './antialiased-step';
import { BANDS } from './bands';
import { CONTOUR } from './contour';
import { CUBIC_SMOOTHSTEP } from './cubic-smoothstep';
import { FISHEYE } from './fisheye';
import { INVERT_D } from './invert-d';
import { MIRROR_DOMAIN } from './mirror-domain';
import { MIRROR_REPEAT } from './mirror-repeat';
import { MIRROR_X } from './mirror-x';
import { MIRROR_Y } from './mirror-y';
import { NOISE_WARP } from './noise-warp';
import { ONION } from './onion';
import { POLAR_REPEAT } from './polar-repeat';
import { POLAR_WARP } from './polar-warp';
import { POWER_CURVE } from './power-curve';
import { REMAP } from './remap';
import { SCALE_UV } from './scale-uv';
import { SIGMOID_CURVE } from './sigmoid-curve';
import { SIN_WAVE_D } from './sin-wave-d';
import { SKEW } from './skew';
import { SMOOTH_INTERSECTION } from './smooth-intersection';
import { SMOOTH_MIN_D } from './smooth-min-d';
import { SMOOTH_MIN_TO_CIRCLE } from './smooth-min-to-circle';
import { THRESHOLD_D } from './threshold-d';
import { TRANSLATE } from './translate';
import { TWIRL } from './twirl';
import { ZOOM_BLUR_UV } from './zoom-blur-uv';

// ── colors ──
import { COSINE_PALETTE } from './cosine-palette';
import { D_AS_RGB } from './d-as-rgb';
import { DUOTONE } from './duotone';
import { FOUR_GRADIENT } from './four-gradient';
import { GRAYSCALE } from './grayscale';
import { HUE_SHIFT } from './hue-shift';
import { PALETTE_THEMED } from './palette-themed';
import { RAINBOW_D } from './rainbow-d';
import { SATURATE } from './saturate';
import { SEPIA } from './sepia';
import { SOLID_COLOR } from './solid-color';
import { SPLIT_TONE } from './split-tone';
import { TRITONE } from './tritone';

// ── effects ──
import { ACES_TONEMAP } from './aces-tonemap';
import { AMBIENT_OCCLUSION } from './ambient-occlusion';
import { ASCII } from './ascii';
import { BLINN_PHONG } from './blinn-phong';
import { BLOOM } from './bloom';
import { CHROMATIC_ABERRATION } from './chromatic-aberration';
import { CONTRAST } from './contrast';
import { CRT_CURVATURE } from './crt-curvature';
import { DIM } from './dim';
import { DITHER } from './dither';
import { EDGE_DETECT } from './edge-detect';
import { EXPOSURE } from './exposure';
import { FILM_GRAIN_COLOR } from './film-grain-color';
import { FILMIC_TONEMAP } from './filmic-tonemap';
import { FOG } from './fog';
import { FOG_EXP } from './fog-exp';
import { FRESNEL } from './fresnel';
import { GAMMA } from './gamma';
import { GOD_RAYS } from './god-rays';
import { HALFTONE } from './halftone';
import { LINEAR_TO_SRGB } from './linear-to-srgb';
import { OVERLAY_NOISE } from './overlay-noise';
import { PULSE_BRIGHTNESS } from './pulse-brightness';
import { PULSE_HUE } from './pulse-hue';
import { RADIAL_BLUR_FAKE } from './radial-blur-fake';
import { REINHARD_TONEMAP } from './reinhard-tonemap';
import { RIM_LIGHT } from './rim-light';
import { SKETCH } from './sketch';
import { SOFT_SHADOW } from './soft-shadow';
import { SPHERE_AO } from './sphere-ao';
import { TINT } from './tint';
import { VHS_GLITCH } from './vhs-glitch';

// ── mouse-interactive cards ──
import { MOUSE_GLOW } from './mouse-glow';
import { MOUSE_PAINT_D } from './mouse-paint-d';
import { MOUSE_REPEL } from './mouse-repel';

// ── media-input cards (sampler2D-backed) ──
import { IMAGE_INPUT } from './image_input';
import { WEBCAM_INPUT } from './webcam_input';

// ── buffer-pass cards — multi-pass feedback / cross-buffer sampling ──
import { SAMPLE_BUFFER_A } from './sample_buffer_a';
import { SAMPLE_BUFFER_B } from './sample_buffer_b';
import { SAMPLE_BUFFER_C } from './sample_buffer_c';
import { SAMPLE_BUFFER_D } from './sample_buffer_d';
import { FEEDBACK_DECAY } from './feedback_decay';

// ── 3D — raymarched SDF scene contributions (mode: '3d') ──
import { BOX_3D } from './box-3d';
import { GROUND_3D } from './ground-3d';
import { MATERIAL_COLOR_3D } from './material-color-3d';
import { REPEAT_3D } from './repeat-3d';
import { SMOOTH_UNION_3D } from './smooth-union-3d';
import { SPHERE_3D } from './sphere-3d';
import { TORUS_3D } from './torus-3d';

export {
  // marker cards (no GLSL contribution)
  PORTAL,
  // existing
  GLOW, GRAIN, HUE_CYCLE, NOISE_FIELD, PALETTE, RADIAL_GRADIENT, REPEAT, RING, RIPPLE,
  STRIPES, SWIRL, TRIPLE_GRADIENT, VIGNETTE, VORONOI_CELLS, WAVE_WARP,
  // new shapes — sdf
  ARC, CROSS, HEART, HEXAGON, RECTANGLE, SQUARE, STAR, TRIANGLE,
  // extra sdfs
  CAPSULE, ELLIPSE, HORSESHOE, PARALLELOGRAM, PENTAGON, PIE_SLICE, ROUNDED_BOX, SEGMENT, TRAPEZOID, VESICA,
  // new shapes — noise
  DOMAIN_WARP, FBM, RIDGED, TURBULENCE, WORLEY_EDGES,
  // new shapes — math / patterns / polar
  BRICK_WALL, CAUSTICS, CONCENTRIC_RINGS, DIAMOND_GRID, GRADIENT_CONIC, GRADIENT_LINEAR,
  HEX_GRID, INTERFERENCE, JULIA, MOIRE, PLASMA, ROSE_CURVE, SECTOR, SIN_FIELD,
  SPIRAL_ARMS, SUNBURST, TRIANGLE_GRID, TRUCHET,
  // Book of Shaders — patterns & curves
  CIRCLES_GRID, TRUCHET_TRIS, METABALLS, TRIANGULAR_TILES, CONCENTRIC_SQUARES,
  RANDOM_SQUARES, DOT_GRID_2, LEMNISCATE, ROSE_PETALS, CARDIOID_SHAPE,
  CONCENTRIC_POLYGONS, POLAR_GRID, WAVY_STRIPES, RADIAL_STRIPES, CROSS_HATCH,
  // Islamic geometric patterns
  ISLAMIC_8PT_STAR, ISLAMIC_6PT_STAR, ISLAMIC_12PT_ROSETTE,
  ZELLIGE_GRID, KUFIC_GRID, ARABESQUE_CURLS,
  // fractals
  BURNING_SHIP, MANDELBROT, MANDELBULB_2D, NEWTON, ORBIT_TRAP_CIRCLE, SIERPINSKI,
  // new distortions
  ANTIALIASED_STEP, BANDS, CONTOUR, CUBIC_SMOOTHSTEP, FISHEYE, INVERT_D,
  MIRROR_DOMAIN, MIRROR_REPEAT, MIRROR_X, MIRROR_Y, NOISE_WARP, ONION,
  POLAR_REPEAT, POLAR_WARP, POWER_CURVE, REMAP, SCALE_UV, SIGMOID_CURVE,
  SIN_WAVE_D, SKEW, SMOOTH_INTERSECTION, SMOOTH_MIN_D, SMOOTH_MIN_TO_CIRCLE,
  THRESHOLD_D, TRANSLATE, TWIRL, ZOOM_BLUR_UV,
  // new colors
  COSINE_PALETTE, D_AS_RGB, DUOTONE, FOUR_GRADIENT, GRAYSCALE, HUE_SHIFT,
  PALETTE_THEMED, RAINBOW_D, SATURATE, SEPIA, SOLID_COLOR, SPLIT_TONE, TRITONE,
  // new effects
  ACES_TONEMAP, AMBIENT_OCCLUSION, ASCII, BLINN_PHONG, BLOOM, CHROMATIC_ABERRATION,
  CONTRAST, CRT_CURVATURE, DIM, DITHER, EDGE_DETECT, EXPOSURE, FILM_GRAIN_COLOR,
  FILMIC_TONEMAP, FOG, FOG_EXP, FRESNEL, GAMMA, GOD_RAYS, HALFTONE, LINEAR_TO_SRGB,
  OVERLAY_NOISE, PULSE_BRIGHTNESS, PULSE_HUE, RADIAL_BLUR_FAKE, REINHARD_TONEMAP,
  RIM_LIGHT, SKETCH, SOFT_SHADOW, SPHERE_AO, TINT, VHS_GLITCH,
  // mouse-interactive
  MOUSE_GLOW, MOUSE_PAINT_D, MOUSE_REPEL,
  // media-input
  IMAGE_INPUT, WEBCAM_INPUT,
  // buffer-pass — multi-pass feedback / cross-buffer sampling
  SAMPLE_BUFFER_A, SAMPLE_BUFFER_B, SAMPLE_BUFFER_C, SAMPLE_BUFFER_D, FEEDBACK_DECAY,
  // 3D — raymarched SDF scene contributions
  SPHERE_3D, BOX_3D, TORUS_3D, GROUND_3D, REPEAT_3D, SMOOTH_UNION_3D, MATERIAL_COLOR_3D,
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
  HELPERS_AFTER_SCENE,
  resolveHelperClosure,
} from './helpers';

// Order matters for the UI's "+ add card" sheet: items within a category
// list in the order they appear here. Grouped by sub-theme inside each
// category for browsability.
export const CARD_LIBRARY_LIST: CardDef[] = [
  // ─── SHAPES ───
  // Primitives
  RADIAL_GRADIENT, RING, SQUARE, RECTANGLE, ROUNDED_BOX, TRIANGLE, PENTAGON, HEXAGON,
  STAR, HEART, CROSS, ARC, ELLIPSE, CAPSULE, SEGMENT,
  TRAPEZOID, PARALLELOGRAM, VESICA, PIE_SLICE, HORSESHOE,
  // Repeating patterns
  STRIPES, WAVY_STRIPES, RADIAL_STRIPES, CROSS_HATCH,
  HEX_GRID, TRIANGLE_GRID, TRIANGULAR_TILES, DIAMOND_GRID, BRICK_WALL,
  CIRCLES_GRID, DOT_GRID_2, CONCENTRIC_SQUARES, RANDOM_SQUARES,
  TRUCHET, TRUCHET_TRIS,
  // Islamic geometric tilings — polar symmetry + star SDFs
  ISLAMIC_8PT_STAR, ISLAMIC_6PT_STAR, ISLAMIC_12PT_ROSETTE,
  ZELLIGE_GRID, KUFIC_GRID, ARABESQUE_CURLS,
  // Noise family
  NOISE_FIELD, FBM, RIDGED, TURBULENCE, DOMAIN_WARP, VORONOI_CELLS, WORLEY_EDGES,
  // Math / waves
  SIN_FIELD, PLASMA, INTERFERENCE, MOIRE, CAUSTICS,
  // Fractals
  JULIA, MANDELBROT, MANDELBULB_2D, BURNING_SHIP, NEWTON, SIERPINSKI, ORBIT_TRAP_CIRCLE,
  // Polar / radial
  CONCENTRIC_RINGS, SUNBURST, ROSE_CURVE, ROSE_PETALS, CARDIOID_SHAPE,
  LEMNISCATE, CONCENTRIC_POLYGONS, POLAR_GRID, METABALLS,
  SECTOR, SPIRAL_ARMS,
  // Gradients
  GRADIENT_LINEAR, GRADIENT_CONIC,

  // ─── DISTORTIONS ───
  // UV transforms
  TRANSLATE, SCALE_UV, MIRROR_X, MIRROR_Y, SKEW, POLAR_WARP, FISHEYE, ZOOM_BLUR_UV,
  // Domain repetition
  REPEAT, POLAR_REPEAT, MIRROR_DOMAIN, MIRROR_REPEAT,
  // Noise-driven
  SWIRL, TWIRL, NOISE_WARP, WAVE_WARP,
  // Scalar transforms
  RIPPLE, THRESHOLD_D, INVERT_D, POWER_CURVE, BANDS, CONTOUR, SIN_WAVE_D,
  ONION, ANTIALIASED_STEP, REMAP, CUBIC_SMOOTHSTEP, SIGMOID_CURVE,
  SMOOTH_MIN_D, SMOOTH_MIN_TO_CIRCLE, SMOOTH_INTERSECTION,
  // Mouse-interactive distortions — react to live pointer position
  MOUSE_REPEL, MOUSE_PAINT_D,

  // ─── COLORS ───
  // Generic
  PALETTE, TRIPLE_GRADIENT, FOUR_GRADIENT, DUOTONE, COSINE_PALETTE, RAINBOW_D, HUE_CYCLE,
  D_AS_RGB, SOLID_COLOR, TRITONE, SPLIT_TONE,
  // Themed palettes — consolidated into one selector-based card
  PALETTE_THEMED,
  // Adjustments
  HUE_SHIFT, SATURATE, GRAYSCALE, SEPIA,

  // ─── EFFECTS ───
  // Lens / atmospheric
  VIGNETTE, GLOW, BLOOM, GOD_RAYS, RADIAL_BLUR_FAKE, FOG, FOG_EXP,
  SPHERE_AO, RIM_LIGHT, CHROMATIC_ABERRATION,
  // Lighting
  FRESNEL, BLINN_PHONG, AMBIENT_OCCLUSION, SOFT_SHADOW,
  // Tonal
  CONTRAST, EXPOSURE, GAMMA, DIM, TINT,
  // Tonemapping
  REINHARD_TONEMAP, ACES_TONEMAP, FILMIC_TONEMAP, LINEAR_TO_SRGB,
  // Stylize
  HALFTONE, SKETCH, ASCII, DITHER, EDGE_DETECT, OVERLAY_NOISE,
  // Texture / noise
  GRAIN, FILM_GRAIN_COLOR,
  // Retro
  CRT_CURVATURE, VHS_GLITCH,
  // Time-driven
  PULSE_BRIGHTNESS, PULSE_HUE,
  // Mouse-interactive — read u_mouse, wired by RecipeCanvas in centred uv space
  MOUSE_GLOW,

  // ─── INPUTS — user media → sampler2D textures ───
  // These need a live HTMLImageElement / HTMLVideoElement bound by the
  // integration layer. RecipeCanvas notices image/video params on compile
  // and pushes the texture uniform every frame for videos.
  IMAGE_INPUT, WEBCAM_INPUT,

  // ─── BUFFER PASSES — multi-pass feedback / cross-buffer sampling ───
  // These cards reference an offscreen FBO produced by a buffer pass
  // (A/B/C/D). The multi-pass renderer binds the appropriate FBO texture
  // into each card's `sampler2D` uniform before drawing. Self-reference
  // (a sample_buffer_a inside Buffer A) reads the PREVIOUS frame via the
  // renderer's ping-pong wiring.
  SAMPLE_BUFFER_A, SAMPLE_BUFFER_B, SAMPLE_BUFFER_C, SAMPLE_BUFFER_D, FEEDBACK_DECAY,

  // ─── 3D — raymarched SDF scene contributions ───
  // These have mode:'3d' and contribute via Card3DContribution.sdfExpr /
  // domainExpr / smoothness / material. They're no-ops in a 2D recipe and
  // 2D cards are no-ops in a 3D recipe — the compiler dispatches on
  // Recipe.mode.
  SPHERE_3D, BOX_3D, TORUS_3D, GROUND_3D, REPEAT_3D, SMOOTH_UNION_3D, MATERIAL_COLOR_3D,

  // ─── MARKERS ───
  // Zero-param utility cards that the UI special-cases (no shader effect).
  // Kept at the end so palette browsability isn't disrupted.
  PORTAL,
];

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  CARD_LIBRARY_LIST.map((c) => [c.type, c]),
);

export function lookupCardDef(type: string): CardDef | null {
  return CARD_LIBRARY[type] ?? null;
}
