// Batch F (volumetrics) + extra generalizable 3D materials — compile checks.
// These exercise the 'volume' density-field / lit-integrator path and the 3D
// albedo-texturing path so authoring mistakes (bad placeholders, missing
// helpers) surface here rather than only in the browser.
import { describe, expect, it } from 'vitest';
import { compile } from '../compile';
import type { Card, Recipe } from '../types';

const P = (v: number | readonly [number, number, number]) => ({ value: v, animation: null });
let _i = 0;
const card = (
  type: string,
  params: Record<string, number | readonly [number, number, number]> = {},
): Card => ({
  kind: 'typed',
  id: `c${_i++}`,
  type,
  enabled: true,
  params: Object.fromEntries(Object.entries(params).map(([k, v]) => [k, P(v)])),
});
const vol = (cards: Card[]): Recipe => ({ cards, canvasAspect: 'square', mode: 'volume' });
const scene3d = (cards: Card[]): Recipe => ({ cards, canvasAspect: 'square', mode: '3d' });

describe('batch F — volumetric density fields', () => {
  it('vol_fbm_clouds_3d emits fbm3 into the volField body', () => {
    const out = compile(vol([
      card('volume_camera_3d'),
      card('vol_fbm_clouds_3d', { scale: 0.6, coverage: 0.5, drift: 0.15, density: 1 }),
      card('volume_march_3d'),
    ]));
    expect(out.glsl).toContain('float volField(vec3 p)');
    expect(out.glsl).toContain('float fbm3(vec3 p)');
    expect(out.glsl).toContain('float noise3(vec3 p)');
    // the density accumulates into `a` (the field accumulator).
    expect(out.glsl).toMatch(/a \+= max\(0\.0, f/);
  });

  it('vol_sphere_field_3d tiles soft spheres into volField', () => {
    const out = compile(vol([
      card('volume_camera_3d'),
      card('vol_sphere_field_3d', { tile: 1.6, radius: 0.55, falloff: 2, density: 1 }),
      card('volume_march_3d'),
    ]));
    expect(out.glsl).toContain('float volField(vec3 p)');
    expect(out.glsl).toContain('pow(max(0.0, 1.0 -');
  });

  it('vol_light_scatter_3d marches with absorption + sun in-scatter', () => {
    const out = compile(vol([
      card('volume_camera_3d'),
      card('vol_fbm_clouds_3d'),
      card('vol_light_scatter_3d'),
    ]));
    // single-scatter march reads the field and the camera ray.
    expect(out.glsl).toContain('volField(pos)');
    expect(out.glsl).toContain('vFrom + vDir * s');
    expect(out.glsl).toContain('exp(-shadow');
  });
});

describe('extra 3D materials', () => {
  const lit = [card('sun_3d'), card('sky_3d')];

  it('grid_material_3d paints triplanar grid lines into the albedo', () => {
    const out = compile(scene3d([
      card('sphere_3d', { r: 0.6, cx: 0, cy: 0.6, cz: 0 }),
      card('grid_material_3d', { scale: 2, thickness: 0.04 }),
      ...lit,
    ]));
    expect(out.glsl).toContain('alb = mix(alb,');
    expect(out.glsl).toContain('smoothstep');
  });

  it('orbit_trap_color_3d colours the albedo via cospal', () => {
    const out = compile(scene3d([
      card('mandelbulb_3d', { power: 8, size: 1.2 }),
      card('orbit_trap_color_3d', { scale: 1.2 }),
      ...lit,
    ]));
    expect(out.glsl).toContain('vec3 cospal(');
    expect(out.glsl).toContain('alb = cospal(');
  });
});
