# Generalizable blocks from 30 Shadertoy projects — design

## Goal

Survey 30 diverse, canonical Shadertoy shaders and distil them into **generalizable,
reusable blocks** (primitives — not one-off shader ports) that make the shaddy cards
engine materially more powerful. Weighted **3D-heavy** (~20 of 30 shaders are 3D),
because the 2D library is already deep (205 blocks) while the raymarch vocabulary is
thin.

## Non-goals

- No monolithic "scene" blocks. Every capability is a small primitive that composes
  with the existing pipeline (sdfExpr / domainExpr / albedo / light / sky / volField …).
- No pixel-exact reproduction of any single source shader. Sources are *evidence the
  technique generalizes*, cited by Shadertoy ID.

## Conventions (locked)

- **Icons: hand-made SVG only, never emoji.** Each new block adds a `card-<kebab-type>`
  entry to `web/src/design/card-icons.tsx` in the house style (24×24 viewBox, flat
  filled shapes, `{c, cream, ink}` colors, rounded, slight tilts, no outline strokes).
  Resolved via `card-adapter.ts` `icon: card-${type.replace(/_/g,'-')}`. The emoji
  `def.icon` is fallback-only and must not be what ships. Foundational primitives that
  currently fall back to emoji (sphere/box/torus/capsule/ground) get SVGs too.
- 3D blocks declare `mode:'3d'` + `contribution3d`; the `snippetTemplate` stays a
  comment that mentions every param (library.test.ts requirement).
- 2D blocks follow the uv→d→col register model with `io` declared when they break the
  category default.
- Each block registered in `cards/library/index.ts` (import + export + CARD_LIBRARY_LIST)
  and, if it should appear in the 3D palette tab, added to `REAL_3D_IDS` in
  `design/components.tsx`.
- Numeric helpers go in `cards/library/helpers.ts` with META deps.

## Coverage map: 7 areas → ~40 blocks

### A. 3D SDF primitives — iq "Primitives" `Xds3zN`, SDF-functions article
Have: sphere, box, rounded-box, torus, capsule, ground, atom.
Add: `cylinder_3d`, `cone_3d`, `plane_3d`, `ellipsoid_3d`, `octahedron_3d`,
`hex_prism_3d`, `tri_prism_3d`, `pyramid_3d`. (8)

### B. 3D SDF operators — iq "Menger Sponge" `4sX3Rn`, SDF-ops article — SHIPPED
Have: smooth-union, smooth-intersection, repeat-3d, twist-3d, mirror.
Added: `subtract_3d`, `intersect_3d`, `union_3d` (CSG combine-mode register `cm`,
respecting the existing smoothness `k` so smooth-subtract is free), `round_3d`,
`onion_3d` (shell), `displace_3d` (surface bump), `elongate_3d`, `bend_3d`. (8)
Implemented via two new compiler primitives: a combine-mode register and an
`sdfStmt` contribution kind (raw `d`-modifying statement).
`revolution_3d`/`extrude_3d` (2D-SDF→3D) deferred — they need the 2D shape
pipeline threaded into the raymarcher; swapped for intersect/union/bend which
fit the current model and are higher-value.

### C. 3D fractals — Menger `4sX3Rn`, Apollonian `4ds3zn`, Mandelbulb, Quaternion Julia
Add: `menger_fold_3d`, `mandelbulb_3d`, `apollonian_fold_3d`, `sierpinski_fold_3d`. (4)

### D. 3D materials & lighting (headline) — iq "Happy Jumping" `3lsSzf`, GGX/PBR demos, reflective/glass spheres
Have: blinn-phong, fresnel, rim, soft-shadow, AO, sky, sun, fog.
Add: `pbr_ggx_3d` (metallic/roughness), `point_light_3d` (attenuated),
`reflection_3d` (mirror bounce), `refraction_3d` (IOR glass + fresnel),
`subsurface_3d`, `checker_material_3d`, `atmosphere_sky_3d` (Rayleigh). (7)

### E. 3D texturing masks (extend UE5 set) — triplanar technique, terrain material shaders
Have: mask-height/slope/noise/fresnel, paint, bump.
Add: `triplanar_3d` (project noise/texture across 3 axes), `mask_curvature_3d`,
`mask_ao_3d`. (3)

### F. Volumetrics (extend) — iq "Clouds" `XslGRr`, nimitz "Protean Clouds" `3l23Rh`, atmospheric scattering
Have: volume-camera, kaliset-field, volume-march.
Add: `vol_fbm_clouds_3d` (fbm density), `vol_light_scatter_3d` (in-scatter toward sun),
`vol_sphere_field_3d`. (3)

### G. 2D high-value — iq "Voronoi" `ldl3W8`, "Domain warping" `lsl3RH`, curl-noise, "Bandlimited synthesis" `MdjGzw`
Add: `curl_flow_warp` (divergence-free flow), `voronoi_borders`, `voronoi_id`
(per-cell color), `simplex_noise_field`, `gradient_noise_field`, `iterative_warp`
(pro fbm domain warp), `analytic_grid` (band-limited AA pattern). (7)

**Total ≈ 40 new blocks.**

## Build order (tested batches)

A → B → D → E → C → F → G.
Primitives + operators first (unlock everything, low risk); materials + texturing next
(highest visible payoff: reflections, glass, triplanar); then fractals, volumetrics, 2D.

## Verification bar (per block)

1. Compiles (tsc + GLSL link).
2. Passes `library.test.ts` / card-io tests / full `vitest run`.
3. Visual check in a preview via the browser harness (no pixel-match required).

## Risks / mitigations

- **NaN fireflies** in division-heavy SDFs/fractals → clamp denominators (`max(dot,1e-4)`),
  up-bias normals, NaN-clamp final color (established pattern).
- **March overshoot** on new primitives/displacement → keep the capped under-relaxed step.
- **Reflection/refraction cost** (second march) → cap bounce steps; single bounce in v1.
- **Param-in-snippet test**: every param must appear in the comment snippetTemplate.
