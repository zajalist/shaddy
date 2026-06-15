// The landing-page template gallery, authored the way the app is meant to be
// used: each tile is a LONG CHAIN of single-purpose primitive blocks —
//   shape(s) → distortions → colour block(s) → effects
// coloured with the native colour stack and animated with the native
// animation stack (custom AnimChains: Time → Oscillate → Remap … bound to a
// block param via `animation: { type:'custom', ref }`). No monolithic "scene"
// blocks. Clicking a tile opens exactly this stack in the editor.

import type { Card, Recipe, ParameterValue, Animation, AnimChain, AnimBlock, BlendMode } from '@/cards';
import type { TemplateVariant } from './templateVariants';

let _id = 0;
let _aid = 0;

const P = (v: ParameterValue) => ({ value: v, animation: null });
const ref = (id: string): Animation => ({ type: 'custom', ref: id });

type ParamInput = Record<string, ParameterValue>;
type AnimInput = Record<string, Animation>;
type Opts = { blend?: BlendMode; alpha?: number };

/** Typed card. `anims` binds a float param to a custom AnimChain (or built-in
 *  Animation). `opts` sets blend/alpha for layering. */
function t(type: string, params: ParamInput = {}, anims: AnimInput = {}, opts: Opts = {}): Card {
  const wrapped: Record<string, { value: ParameterValue; animation: Animation | null }> = {};
  for (const [k, v] of Object.entries(params)) wrapped[k] = { value: v, animation: anims[k] ?? null };
  for (const [k, a] of Object.entries(anims)) if (!(k in wrapped)) wrapped[k] = { value: 0, animation: a };
  return {
    kind: 'typed', id: `t${_id++}`, type, enabled: true, params: wrapped,
    ...(opts.blend ? { blendMode: opts.blend } : {}),
    ...(opts.alpha !== undefined ? { alpha: opts.alpha } : {}),
  };
}

// ── animation-block builders (fold left→right into one scalar over time) ──
const aTime = (scale = 1): AnimBlock => ({ id: `a${_aid++}`, type: 'time', params: { scale: P(scale) } });
const aOsc = (speed = 1, phase = 0): AnimBlock => ({ id: `a${_aid++}`, type: 'oscillate', params: { speed: P(speed), phase: P(phase) } });
const aNoise = (speed = 1): AnimBlock => ({ id: `a${_aid++}`, type: 'noise', params: { speed: P(speed) } });
const aRemap = (min: number, max: number): AnimBlock => ({ id: `a${_aid++}`, type: 'remap', params: { min: P(min), max: P(max) } });
const chain = (id: string, name: string, blocks: AnimBlock[]): AnimChain => ({ id, name, blocks });

function recipe(cards: Card[], animations: AnimChain[] = [], mode?: '2d' | '3d'): Recipe {
  return { cards, canvasAspect: 'landscape', ...(animations.length ? { animations } : {}), ...(mode ? { mode } : {}) };
}

// A pair of circular-drift chains (x = sin, y = cos) for panning a noise field.
const driftChains = (prefix: string, amp: number, speed = 1) => ({
  x: chain(`${prefix}_dx`, 'drift x', [aTime(speed), aOsc(1, 0), aRemap(-amp, amp)]),
  y: chain(`${prefix}_dy`, 'drift y', [aTime(speed), aOsc(1, 1.5708), aRemap(-amp, amp)]),
});

export const TEMPLATE_RECIPES: Record<TemplateVariant, Recipe> = (() => {
  // ── terrain: a raymarched landscape built FROM BLOCKS —
  //    Camera → Terrain surface (fbm height-field) → Texture: height
  //    (grass→rock→snow) → Sky → Sun → Fog. ──
  const terrain = recipe([
    t('camera_3d', { eye_x: 0, eye_y: 3.6, eye_z: 5.5, tgt_x: 0, tgt_y: 1.2, tgt_z: -5, fov: 1.5 }),
    t('terrain_surface_3d', { scale: 0.3, height: 2.4 }),
    // layered texturing (Shadertoy-style): height biome → rock on slopes →
    // triplanar detail; bump perturbs the normal before lighting.
    t('texture_height_3d', { low: [0.16, 0.34, 0.15], mid: [0.40, 0.33, 0.24], high: [0.96, 0.97, 1.0], h0: 0.3, h1: 1.6, h2: 2.6 }),
    t('texture_slope_3d', { rock: [0.30, 0.27, 0.23], flat_lo: 0.45, flat_hi: 0.78 }),
    t('texture_noise_3d', { scale: 4, amount: 0.3, tint: [0.7, 0.66, 0.55] }),
    t('bump_3d', { scale: 6, strength: 0.25 }),
    t('sky_3d', { horizon: [0.80, 0.86, 0.94], zenith: [0.34, 0.54, 0.86], ambient: [0.42, 0.47, 0.55] }),
    t('sun_3d', { dir_x: -0.45, dir_y: 0.7, dir_z: -0.35, color: [1.0, 0.93, 0.78], specular: 0, shininess: 16, soft: 0.12 }),
    t('fog_3d', { color: [0.80, 0.86, 0.94], density: 0.05 }),
  ], [], '3d');

  // ── nebula: "Star Nest" by Pablo Roman Andrioli (Shadertoy XlfGRj) — a
  //    volumetric kaliset fly-through → exposure → vignette. ──
  const nebula = recipe([
    t('star_nest', { zoom: 0.8, speed: 0.02, formu: 0.53, tile: 0.85, brightness: 0.0018, darkmatter: 0.3, distfade: 0.73, saturation: 0.9 }),
    t('exposure', { stops: 1.1 }),
    t('vignette', { inner: 0.7, outer: 1.7, strength: 0.4 }),
  ]);

  // ── dna: twisting helix → palette → glow → slow hue cycle ──
  const dnaHue = chain('dna_hue', 'hue cycle', [aTime(0.2), aOsc(1, 0), aRemap(-0.05, 0.05)]);
  const dna = recipe([
    t('helix', { speed: 0.9, twist: 9, spread: 0.34, thickness: 0.06, rungs: 4.5 }),
    t('palette', { color_a: [0.02, 0.03, 0.08], color_b: [0.25, 0.95, 0.85] }),
    t('glow', { threshold: 0.4, intensity: 1.4 }),
    t('hue_shift', {}, { shift: ref('dna_hue') }),
  ], [dnaHue]);

  // ── ocean: a raymarcher built PURELY FROM BLOCKS —
  //    Camera → Sea surface (Seascape height-field) → water material →
  //    Sky (bg+ambient) → Sun (diffuse+spec) → Fresnel (sky reflection) → Fog. ──
  const ocean = recipe([
    t('camera_3d', { eye_x: 0, eye_y: 3.2, eye_z: 0, tgt_x: 0, tgt_y: 1.5, tgt_z: -7, fov: 1.7 }),
    t('sea_surface_3d', { scale: 1.0, height: 0.6, speed: 0.6 }),
    t('material_color_3d', { color: [0.0, 0.09, 0.18] }),
    t('sky_3d', { horizon: [0.72, 0.80, 0.92], zenith: [0.20, 0.42, 0.82], ambient: [0.30, 0.40, 0.52] }),
    t('sun_3d', { dir_x: 0.3, dir_y: 0.6, dir_z: -0.55, color: [1.0, 0.95, 0.82], specular: 1.2, shininess: 80, soft: 0.1 }),
    t('fresnel_3d', { base: 0.02, amount: 0.75 }),
    t('fog_3d', { color: [0.72, 0.80, 0.92], density: 0.06 }),
  ], [], '3d');

  // ── lava: churning domain-warp (smooth, not blocky) that also rises
  //    continuously → crack contrast → heat ramp → molten relief → glow.
  //    Motion = morph (churn) + continuous upward scroll, not a fake sway. ──
  const lavaChurn = chain('lav_ch', 'churn', [aTime(0.4), aOsc(1, 0), aRemap(0.9, 1.8)]);
  const lavaRise = chain('lav_rise', 'rise', [aTime(0.06)]);
  const lava = recipe([
    t('translate', {}, { y: ref('lav_rise') }),
    t('domain_warp', { scale: 2.2 }, { warp: ref('lav_ch') }),
    t('power_curve', { gamma: 1.5 }),
    t('heat_ramp', { gain: 1.15 }),
    t('relief_light', { strength: 7, light_x: -0.4, light_y: 0.6, amount: 0.5 }),
    t('glow', { threshold: 0.55, intensity: 1.3 }),
  ], [lavaRise, lavaChurn]);

  // ── molecule: a raymarched metaball molecule FROM BLOCKS — a central atom +
  //    three orbiting atoms, smooth-unioned, lit by sky/sun with fresnel sheen. ──
  const molecule = recipe([
    t('camera_3d', { eye_x: 0, eye_y: 0.4, eye_z: 4.6, tgt_x: 0, tgt_y: 0, tgt_z: 0, fov: 1.9 }),
    t('smooth_union_3d', { k: 0.6 }),
    t('atom_3d', { radius: 0, size: 0.62, speed: 0, phase: 0 }),
    t('atom_3d', { radius: 1.15, size: 0.4, speed: 0.6, phase: 0 }),
    t('atom_3d', { radius: 1.15, size: 0.4, speed: 0.6, phase: 2.1 }),
    t('atom_3d', { radius: 1.15, size: 0.4, speed: 0.6, phase: 4.2 }),
    t('material_color_3d', { color: [0.25, 0.55, 1.0] }),
    t('sky_3d', { horizon: [0.10, 0.12, 0.2], zenith: [0.02, 0.03, 0.08], ambient: [0.28, 0.34, 0.5] }),
    t('sun_3d', { dir_x: 0.4, dir_y: 0.7, dir_z: 0.4, color: [1.0, 0.96, 0.9], specular: 1.4, shininess: 90, soft: 0.12 }),
    t('fresnel_3d', { base: 0.05, amount: 0.5 }),
  ], [], '3d');

  // ── galaxy: winding twirl + noise-warped ragged arms, coloured ADDITIVELY
  //    over black (transparent gaps) + warm core, then the rotation is UNDONE
  //    so the starfield stays fixed (no drifting dots). ──
  const galRot = chain('gal_rot', 'wind', [aTime(0.15), aOsc(1, 0), aRemap(0.5, 2.0)]);
  const galRn = chain('gal_rn', 'unwind', [aTime(0.15), aOsc(1, 0), aRemap(-0.5, -2.0)]);
  const galaxy = recipe([
    t('twirl', { cx: 0, cy: 0, radius: 1.4 }, { strength: ref('gal_rot') }),
    t('noise_warp', { scale: 3, strength: 0.12 }),
    t('spiral_arms', { arms: 2, twist: 5, softness: 0.55 }),
    t('palette', { color_a: [0.0, 0.0, 0.0], color_b: [0.7, 0.4, 0.85] }, {}, { blend: 'add' }),
    t('radial_gradient', { softness: 2.2 }),
    t('palette', { color_a: [0.0, 0.0, 0.0], color_b: [1.0, 0.82, 0.5] }, {}, { blend: 'add' }),
    t('bloom', { threshold: 0.45, intensity: 1.1 }),
    t('twirl', { cx: 0, cy: 0, radius: 1.4 }, { strength: ref('gal_rn') }),
    t('starfield', { density: 90, coverage: 0.04, size: 0.07, twinkle: 0, color: [1.0, 0.95, 0.85] }),
    t('vignette', { inner: 0.4, outer: 1.3, strength: 0.7 }),
  ], [galRot, galRn]);

  // ── aurora: starry sky FIRST, then curtains added with composition opacity
  //    over it (color_a black + 'add' blend + alpha) so the night sky shows
  //    through the gaps instead of a flat gradient filling the frame. ──
  const aurThk = chain('aur_t', 'sway', [aTime(0.3), aOsc(1, 0), aRemap(0.3, 0.5)]);
  const aurora = recipe([
    t('starfield', { density: 80, coverage: 0.045, size: 0.07, twinkle: 0, color: [0.85, 0.9, 1.0] }),
    t('aurora', { speed: 0.4, scale: 2.0, sway: 1.1 }, { thickness: ref('aur_t') }),
    t('palette', { color_a: [0.0, 0.0, 0.0], color_b: [0.18, 0.95, 0.55] }, {}, { blend: 'add', alpha: 0.9 }),
    t('palette', { color_a: [0.0, 0.0, 0.0], color_b: [0.45, 0.22, 0.9] }, {}, { blend: 'add', alpha: 0.4 }),
    t('glow', { threshold: 0.4, intensity: 1.2 }),
    t('vignette', { inner: 0.6, outer: 1.5, strength: 0.5 }),
  ], [aurThk]);

  // ── fire: flickering flame → heat ramp → glow → bloom ──
  const fireW = chain('fire_w', 'flicker', [aTime(0.8), aNoise(1), aRemap(1.1, 1.5)]);
  const fire = recipe([
    t('flame', { speed: 1.0, scale: 3.0 }, { width: ref('fire_w') }),
    t('heat_ramp', { gain: 1.1 }),
    t('glow', { threshold: 0.5, intensity: 1.5 }),
    t('bloom', { threshold: 0.55, intensity: 0.8 }),
    t('vignette', { inner: 0.6, outer: 1.5, strength: 0.5 }),
  ], [fireW]);

  // ── crystals: drifting voronoi → icy ramp → facet relief → seams ──
  const crysDrift = driftChains('crys', 0.07, 0.16);
  const crystals = recipe([
    t('translate', {}, { x: ref('crys_dx'), y: ref('crys_dy') }),
    t('voronoi_cells', { scale: 4, jitter: 1.0 }),
    t('triple_gradient', { color_a: [0.08, 0.18, 0.4], color_b: [0.4, 0.72, 0.92], color_c: [0.92, 0.97, 1.0] }),
    t('relief_light', { strength: 16, light_x: -0.5, light_y: 0.5, amount: 0.8 }),
    t('contour', { spacing: 0.2, thickness: 0.03 }),
    t('vignette', { inner: 0.5, outer: 1.4, strength: 0.6 }),
  ], [crysDrift.x, crysDrift.y]);

  // ── wormhole: polar REPEAT (angular wedges — no hard atan seam line that
  //    polar_warp produced) → animated plasma rings rushing in → rainbow ramp. ──
  const wormZoom = chain('worm_z', 'pulse', [aTime(0.3), aOsc(1, 0), aRemap(5.0, 8.0)]);
  const wormhole = recipe([
    t('polar_repeat', { count: 6 }),
    t('plasma', { speed: 1.0 }, { scale: ref('worm_z') }),
    t('triple_gradient', { color_a: [0.1, 0.0, 0.3], color_b: [0.9, 0.2, 0.6], color_c: [0.3, 0.9, 1.0] }),
    t('glow', { threshold: 0.5, intensity: 1.2 }),
    t('vignette', { inner: 0.35, outer: 1.2, strength: 0.85 }),
  ], [wormZoom]);

  // ── 3D — twisted torus + spheres, smooth-unioned and lit ──
  const raymarch = recipe([
    t('material_color_3d', { color: [0.95, 0.5, 0.2] }),
    t('twist_3d', { amount: 1.0 }),
    t('smooth_union_3d', { k: 0.5 }),
    t('torus_3d', { r_major: 1.0, r_minor: 0.42 }),
    t('sphere_3d', { r: 0.6, cx: 0, cy: 0.7, cz: 0 }),
    t('sphere_3d', { r: 0.5, cx: 0, cy: -0.65, cz: 0 }),
  ], [], '3d');

  return { terrain, nebula, dna, ocean, lava, molecule, galaxy, aurora, fire, crystals, wormhole, raymarch };
})();
