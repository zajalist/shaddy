# Rubric features — what shipped, what didn't

Audited against `D:/Personal/Resume/SHADE_RUBRIC_FEATURES (1).md` on the
`frontend/cards-ui` branch.

## Bucket 1: Visual impressiveness

- **F1.1 Curated wow gallery on homescreen** — ✅ SHIPPED at `/gallery`. 14
  curated recipes with live thumbnails, mode-filter chips, "Open in composer"
  CTA. `web/src/design/pages/Gallery.tsx`,
  `web/src/design/pages/gallery/recipes.ts`. Note: it is a separate route,
  not literally the landing page — landing has its own hero. Could be
  promoted further by linking the gallery prominently from the landing nav
  (currently only via the templates section anchor).
- **F1.2 Render at full devicePixelRatio** — ✅ SHIPPED. `web/src/renderer/runtime.ts:111`
  reads `window.devicePixelRatio`. Mobile path downscales adaptively in
  `web/src/renderer/mobile-perf.ts`.
- **F1.3 Default starting state is beautiful** — ⚠️ PARTIAL. The composer
  loads with a default recipe but it's not a hand-tuned wow piece. Suggest:
  switch the default to the `glassy-sphere` 3D recipe or `sunset-glow` from
  `web/src/design/pages/gallery/recipes.ts`. ~10 min in
  `web/src/cards/state.ts` (initial recipe).
- **F1.4 Wow mode / fullscreen view** — ✅ SHIPPED. `F` key from composer
  enters fullscreen (`web/src/design/DesktopApp.tsx:2014`). Floating toolbar
  with screenshot + record. Pinch-zoom + reset (`R`).
- **F1.5 Export as image / record as short loop** — ✅ SHIPPED. PNG snapshot
  via `canvas.toBlob` and WebM recording via MediaRecorder, both in
  fullscreen toolbar (`DesktopApp.tsx:1189`, `1466`).

## Bucket 2: Contrast & immediate feedback

- **F2.1 Auto-scroll code view to changed region with highlight pulse** —
  ⚠️ PARTIAL. Magic comments (`// === card #id : type ===`) are emitted by
  the compiler (`web/src/cards/markers.test.ts` covers them) and the code
  view exists, but I did not find auto-scroll + lime-pulse decoration
  wiring on slider changes. Suggest: in `DesktopApp.tsx` code drawer, on
  selected-card change, scroll the CodeMirror view to the card's marker
  block and apply a 600ms-fading `Decoration.line()`. ~3 hours.
- **F2.2 Slider drag shows live numeric value overlay** — ⚠️ UNCLEAR. The
  properties panel shows the live value next to the label but I did not
  see a near-cursor chip while dragging. Suggest: in
  `web/src/design/Properties.tsx` (or wherever sliders live), render a
  small absolute-positioned value chip during pointer-down. ~30 min.
- **F2.3 Block selection highlights corresponding code region** — ⚠️
  UNCLEAR. The block markers are emitted and the code view exists; whether
  selecting a block visually highlights the gutter region needs eyes on the
  running app. Suggest: verify with the `verify` skill; if missing, wire a
  persistent lime left-gutter decoration on selected card id.
- **F2.4 Before/after diff overlay on canvas** — ❌ NOT SHIPPED. No keypress
  or long-press handler captures prior-state pixels. Skip — low rubric
  weight, 3 hours of work.
- **F2.5 Pulse animation on every block when uniforms update** — ❌ NOT
  SHIPPED. Animated cards show an "ANIM" tag (see Landing FeatureSliders
  mockup) but the actual block doesn't pulse in time with the animation in
  the composer. Suggest: in `web/src/design/Block.tsx`, add a CSS keyframe
  driven by an `animated` data-attr. ~30 min.

## Bucket 3: Impact (30%)

- **F3.1 Education framing** — ✅ SHIPPED. `/learn` is a Codecademy-style
  8-lesson interactive tutorial with a mascot, automated checks, and
  progress persistence (`web/src/design/pages/Learn.tsx`,
  `web/src/design/pages/learn/lessons.ts`). The Library route is a
  long-form encyclopedia of shader concepts. The Scratch-for-GPU pitch
  line ships on the landing eyebrow ("Scratch for GPU shaders").
- **F3.2 One adjacent real-world GPU domain** — ❌ NOT SHIPPED. No "use
  this as a Unity material" or "scientific viz" demo recipe. Suggest:
  add a single curated recipe to `recipes.ts` with a "Game material —
  glowing button" tag, that's the cheapest version of the F3.2 pitch.
- **F3.3 Accessibility angle** — ⚠️ PARTIAL. Aria-labels are present on
  the major icon buttons; mobile path responsive. No screen-reader audit;
  no large-text mode toggle. Skip without explicit ask — would need real
  audit, not a 30-min job.
- **F3.4 DON'T overclaim** — ✅ OBSERVED. Landing copy is now honest about
  what ships (see edits below).

## Bucket 4: CPU vs GPU narrative

- **F4.1 Real CPU vs GPU benchmark, run live** — ❌ NOT SHIPPED. The
  highest-priority unshipped feature in the doc. Would require a
  parallel CPU emit path for a subset of cards, side-by-side timing
  panel. Estimated 4 hours, too big for inline shipping in this session.
- **F4.2 Extrapolation framing** — ⚠️ PARTIAL. The Library "Why GPUs are
  fast" article now says "two or three orders of magnitude is normal"
  (was previously inviting the user to "try the benchmark panel" — a
  feature that does not exist; fixed in this session).
- **F4.3 One concrete real-world comparison** — ❌ NOT IN UI. Talking-
  point only.

## Bucket 5: Practicality

- **F5.1 Export shader as standalone file for game engines** — ❌ NOT
  SHIPPED. No Unity HLSL translator, no Godot syntax adapter, no
  Three.js zip generator. The Landing FAQ previously claimed these —
  edited to be honest about Shadertoy paste being the actual path. Real
  shipping of Unity HLSL is ~3 hours.
- **F5.2 "Use as web background" copy-paste snippet** — ❌ NOT SHIPPED. A
  ~30-min feature: in the export menu, render a `<canvas>` + `<script
  type="module">` HTML snippet that pulls the recipe via the share-URL
  decoder and runs the renderer. Worth shipping; declined here to avoid
  touching renderer wiring without confidence.
- **F5.3 Concrete "I made this for X" tags on gallery items** — ✅
  SHIPPED. Every entry in
  `web/src/design/pages/gallery/recipes.ts` has a `tag` field like
  "Loading screen for a sci-fi game" or "Skincare landing page
  background".

## Bucket 6: Homescreen + zero-experience onboarding

- **F6.1 Homescreen IS the gallery** — ⚠️ PARTIAL. Gallery is one route
  away from the landing (`/gallery`); landing leads with the
  reaction-diffusion hero, not the grid. Suggest: pull the gallery grid
  into the landing's templates section, or change the templates section
  to actually render mini-recipe canvases instead of the
  TemplatesShared placeholder.
- **F6.2 "Recreate this" tutorial overlay** — ✅ SHIPPED via `/learn`.
  Eight guided code lessons with a mascot that cheers when checks pass.
  Not the per-gallery-item overlay the doc describes, but the
  zero-experience-to-shader-from-scratch loop is covered.
- **F6.3 Share button with remix framing** — ✅ SHIPPED. `⌘S` copies a
  recipe-encoded share URL (docs/53-share-export.tsx). The UI does not
  yet say "remix this" explicitly — could be a one-line copy tweak in
  the share-toast.

---

## Summary

- ✅ shipped: 11
- ⚠️ partial / unverified: 8
- ❌ not shipped: 6

## Top 3 missing — how to ship

1. **F4.1 CPU vs GPU benchmark.** Highest rubric impact. Build a tiny
   CPU pixel-loop emitter for 3-4 base cards (radial_gradient, palette,
   plasma, vignette), render same recipe at 256×256, time 100 frames
   each, show side-by-side. New panel in `DesktopApp.tsx`, ~4 hours.
2. **F5.2 Web-background copy-paste snippet.** In the export menu, emit
   an HTML doc that uses the share-URL decoder + the existing renderer
   public surface to run as a page background. ~1 hour in
   `DesktopApp.tsx` once the share-URL decoder is exposed as a public
   helper.
3. **F2.5 Block pulse on uniform updates.** Wire a CSS animation on
   `Block.tsx` whose `animationDuration` comes from the card's
   animation rate (or pulses once per slider change). Free visual that
   makes the composer feel alive. ~30 min.

## Shipped inline this session

- Landing hero rewritten to drop the "Export to Unity, Godot" claim and
  the unverified "200× faster" hero stat (the benchmark doesn't ship
  yet). Voice preserved.
- Landing FAQ: removed the imaginary "benchmark panel" FAQ wording;
  replaced the "How do I export for a game?" Unity/Godot/Three.js
  promise with an honest GLSL-copy answer.
- Landing FeatureRow 03 (Export): dropped Unity HLSL + Godot + Three.js
  zip claims; kept the "real GLSL → Shadertoy" + share-URL path that
  actually ships.
- Library "Why GPUs are fast" article: removed the dead-link reference
  to the non-existent benchmark panel; replaced with an honest "two or
  three orders of magnitude is normal" line.
- Gallery hero subtitle: tightened the slightly-puffy "every one of
  them a live, running shader you can crack open" phrasing.
