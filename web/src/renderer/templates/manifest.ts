// The 12 starter templates (issue #10). Each entry's `id` is stable —
// the backend uses `plasma`, `voronoi-cells`, and `gradient-noise` as
// template_id values in POST /optimize (see CONTRACTS.md §3), so renaming
// those three is a contract change.
//
// `thumbnail` is the empty string at module-load. The integration layer
// can call generateThumbnails() at first-load to fill them via the real
// renderer's snapshot() — that avoids a build-step dependency on a
// headless WebGL.

import type { RendererAPI } from '../index';
import { CHECKERBOARD_BODY } from './checkerboard.glsl';
import { GRADIENT_NOISE_BODY } from './gradient-noise.glsl';
import { PLAIN_CIRCLE_BODY } from './plain-circle.glsl';
import { PLASMA_BODY } from './plasma.glsl';
import { POLAR_KALEIDOSCOPE_BODY } from './polar-kaleidoscope.glsl';
import { RADIAL_BANDS_BODY } from './radial-bands.glsl';
import { RAYMARCH_SPHERE_BODY } from './raymarch-sphere.glsl';
import { RIPPLE_BODY } from './ripple.glsl';
import { SDF_HEART_BODY } from './sdf-heart.glsl';
import { SOFT_GRADIENT_BODY } from './soft-gradient.glsl';
import { STRIPES_BODY } from './stripes.glsl';
import { VORONOI_CELLS_BODY } from './voronoi-cells.glsl';

export type Template = {
  id: string;
  name: string;
  thumbnail: string;
  source: string;
};

export const TEMPLATES: Template[] = [
  { id: 'plain-circle', name: 'Plain circle', thumbnail: '', source: PLAIN_CIRCLE_BODY },
  { id: 'soft-gradient', name: 'Soft gradient', thumbnail: '', source: SOFT_GRADIENT_BODY },
  { id: 'stripes', name: 'Stripes', thumbnail: '', source: STRIPES_BODY },
  { id: 'plasma', name: 'Plasma', thumbnail: '', source: PLASMA_BODY },
  { id: 'gradient-noise', name: 'Value-noise field', thumbnail: '', source: GRADIENT_NOISE_BODY },
  { id: 'voronoi-cells', name: 'Voronoi cells', thumbnail: '', source: VORONOI_CELLS_BODY },
  { id: 'raymarch-sphere', name: 'Raymarch sphere', thumbnail: '', source: RAYMARCH_SPHERE_BODY },
  { id: 'radial-bands', name: 'Radial bands', thumbnail: '', source: RADIAL_BANDS_BODY },
  { id: 'checkerboard', name: 'Checkerboard', thumbnail: '', source: CHECKERBOARD_BODY },
  { id: 'ripple', name: 'Ripple', thumbnail: '', source: RIPPLE_BODY },
  { id: 'polar-kaleidoscope', name: 'Polar kaleidoscope', thumbnail: '', source: POLAR_KALEIDOSCOPE_BODY },
  { id: 'sdf-heart', name: 'SDF heart', thumbnail: '', source: SDF_HEART_BODY },
];

/**
 * Capture a thumbnail for each template by compiling it through the given
 * (live, mounted) renderer and reading back the next frame. Restores the
 * caller's current shader by recompiling it at the end if one is provided.
 *
 * Returns a fresh array with `thumbnail` filled in — does NOT mutate
 * TEMPLATES, so the manifest stays a stable constant.
 */
export async function generateThumbnails(
  renderer: RendererAPI,
  options: { restoreSource?: string } = {},
): Promise<Template[]> {
  const out: Template[] = [];
  for (const t of TEMPLATES) {
    const compiled = renderer.compile(t.source);
    if (!compiled.ok) {
      out.push({ ...t });
      continue;
    }
    // Wait one rAF tick so the loop draws the new program before snapshot().
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const thumbnail = await renderer.snapshot();
    out.push({ ...t, thumbnail });
  }
  if (options.restoreSource !== undefined) {
    renderer.compile(options.restoreSource);
  }
  return out;
}
