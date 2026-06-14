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
  // ── terrain: ridged height → elevation colour → relief light ──
  const terDrift = driftChains('ter', 0.1, 0.25);
  const terrain = recipe([
    t('translate', {}, { x: ref('ter_dx'), y: ref('ter_dy') }),
    t('ridged', { scale: 2.6 }),
    t('four_gradient', { color_a: [0.04, 0.18, 0.45], color_b: [0.82, 0.72, 0.46], color_c: [0.16, 0.43, 0.18], color_d: [0.96, 0.97, 1.0] }),
    t('relief_light', { strength: 12, light_x: -0.5, light_y: 0.6, amount: 0.9 }),
    t('vignette', { inner: 0.6, outer: 1.5, strength: 0.6 }),
  ], [terDrift.x, terDrift.y]);

  // ── nebula: drifting domain-warped gas → space ramp → bloom → stars ──
  const nebDrift = driftChains('neb', 0.14, 0.18);
  const nebBreathe = chain('neb_br', 'breathe', [aTime(0.3), aOsc(1, 0), aRemap(1.3, 2.3)]);
  const nebula = recipe([
    t('translate', {}, { x: ref('neb_dx'), y: ref('neb_dy') }),
    t('domain_warp', { scale: 2.0 }, { warp: ref('neb_br') }),
    t('power_curve', { gamma: 1.6 }),
    t('triple_gradient', { color_a: [0.02, 0.01, 0.08], color_b: [0.45, 0.1, 0.6], color_c: [0.2, 0.55, 0.98] }),
    t('bloom', { threshold: 0.4, intensity: 1.0 }),
    t('starfield', { density: 80, coverage: 0.05, size: 0.08, twinkle: 2.5, color: [0.9, 0.95, 1.0] }),
    t('vignette', { inner: 0.5, outer: 1.5, strength: 0.7 }),
  ], [nebDrift.x, nebDrift.y, nebBreathe]);

  // ── dna: twisting helix → palette → glow → slow hue cycle ──
  const dnaHue = chain('dna_hue', 'hue cycle', [aTime(0.2), aOsc(1, 0), aRemap(-0.05, 0.05)]);
  const dna = recipe([
    t('helix', { speed: 0.9, twist: 9, spread: 0.34, thickness: 0.06, rungs: 4.5 }),
    t('palette', { color_a: [0.02, 0.03, 0.08], color_b: [0.25, 0.95, 0.85] }),
    t('glow', { threshold: 0.4, intensity: 1.4 }),
    t('hue_shift', {}, { shift: ref('dna_hue') }),
  ], [dnaHue]);

  // ── ocean: drifting caustic water → deep ramp → wave relief → sparkle ──
  const ocnDrift = driftChains('ocn', 0.1, 0.3);
  const ocean = recipe([
    t('translate', {}, { x: ref('ocn_dx'), y: ref('ocn_dy') }),
    t('caustics', { scale: 4, speed: 0.5 }),
    t('triple_gradient', { color_a: [0.02, 0.10, 0.22], color_b: [0.1, 0.4, 0.5], color_c: [0.75, 0.95, 1.0] }),
    t('relief_light', { strength: 7, light_x: 0.0, light_y: 0.7, amount: 0.5 }),
    t('bloom', { threshold: 0.6, intensity: 0.7 }),
    t('vignette', { inner: 0.5, outer: 1.5, strength: 0.5 }),
  ], [ocnDrift.x, ocnDrift.y]);

  // ── lava: drifting turbulence → crack contrast → heat ramp → relief → glow ──
  const lavaDx = chain('lav_dx', 'flow x', [aTime(0.2), aOsc(1, 0), aRemap(-0.08, 0.08)]);
  const lavaDy = chain('lav_dy', 'rise', [aTime(0.15), aOsc(1, 1.5708), aRemap(-0.22, 0.0)]);
  const lava = recipe([
    t('translate', {}, { x: ref('lav_dx'), y: ref('lav_dy') }),
    t('turbulence', { scale: 3.2 }),
    t('power_curve', { gamma: 1.4 }),
    t('heat_ramp', { gain: 1.1 }),
    t('relief_light', { strength: 10, light_x: -0.4, light_y: 0.6, amount: 0.6 }),
    t('glow', { threshold: 0.55, intensity: 1.3 }),
  ], [lavaDx, lavaDy]);

  // ── molecule: pulsing metaballs → blue ramp → round relief → bloom ──
  const molPulse = chain('mol_p', 'pulse', [aTime(0.4), aOsc(1, 0), aRemap(0.14, 0.24)]);
  const molecule = recipe([
    t('metaballs', { speed: 0.6 }, { falloff: ref('mol_p') }),
    t('triple_gradient', { color_a: [0.02, 0.04, 0.12], color_b: [0.2, 0.6, 1.0], color_c: [0.75, 0.95, 1.0] }),
    t('relief_light', { strength: 7, light_x: -0.4, light_y: 0.6, amount: 0.5 }),
    t('bloom', { threshold: 0.5, intensity: 1.2 }),
    t('vignette', { inner: 0.5, outer: 1.4, strength: 0.6 }),
  ], [molPulse]);

  // ── galaxy: winding twirl → spiral arms → ramp → warm core (add) → bloom → stars ──
  const galRot = chain('gal_rot', 'wind', [aTime(0.15), aOsc(1, 0), aRemap(0.5, 2.0)]);
  const galaxy = recipe([
    t('twirl', { cx: 0, cy: 0, radius: 1.4 }, { strength: ref('gal_rot') }),
    t('spiral_arms', { arms: 2, twist: 5, softness: 0.5 }),
    t('triple_gradient', { color_a: [0.02, 0.02, 0.08], color_b: [0.5, 0.2, 0.6], color_c: [1.0, 0.8, 0.5] }),
    t('radial_gradient', { softness: 2.2 }),
    t('palette', { color_a: [0.0, 0.0, 0.0], color_b: [1.0, 0.85, 0.55] }, {}, { blend: 'add' }),
    t('bloom', { threshold: 0.45, intensity: 1.2 }),
    t('starfield', { density: 90, coverage: 0.04, size: 0.07, twinkle: 2, color: [1.0, 0.95, 0.85] }),
    t('vignette', { inner: 0.4, outer: 1.3, strength: 0.7 }),
  ], [galRot]);

  // ── aurora: drifting curtains → green ramp → glow → stars ──
  const aurThk = chain('aur_t', 'sway', [aTime(0.3), aOsc(1, 0), aRemap(0.3, 0.5)]);
  const aurora = recipe([
    t('aurora', { speed: 0.4, scale: 2.0, sway: 1.1 }, { thickness: ref('aur_t') }),
    t('triple_gradient', { color_a: [0.02, 0.04, 0.1], color_b: [0.15, 0.85, 0.5], color_c: [0.5, 0.4, 0.95] }),
    t('glow', { threshold: 0.4, intensity: 1.3 }),
    t('starfield', { density: 80, coverage: 0.045, size: 0.07, twinkle: 1.8, color: [0.85, 0.9, 1.0] }),
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

  // ── wormhole: polar warp → animated plasma rings → rainbow ramp → glow ──
  const wormZoom = chain('worm_z', 'pulse', [aTime(0.3), aOsc(1, 0), aRemap(5.0, 8.0)]);
  const wormhole = recipe([
    t('polar_warp', { radial_scale: 1.0 }),
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
