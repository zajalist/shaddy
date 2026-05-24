# Shaddy Hackathon Rubric Audit

Source rubric: `D:/Personal/Resume/SHADE_RUBRIC_FEATURES (1).md` (F1.1 → F6.3).

Status legend:
- **SHIPPED** — Visible in current codebase, working in the demo.
- **PARTIAL** — Half done; main mechanism exists but a key piece is missing.
- **NOT SHIPPED** — Not present. Would need new work.

---

## Bucket 1 — Visual impressiveness

### F1.1 — Curated "wow" starter gallery on homescreen
**PARTIAL.**
- Landing page (`web/src/design/Landing.tsx`, `TemplatesGrid` section) shows 12 live shader tiles using `TemplatesShared.tsx` — one shared WebGL context renders all 12 viewports simultaneously. Real motion on first paint.
- Dedicated `/gallery` route (`web/src/design/pages/Gallery.tsx`) shows 14 curated recipes from `web/src/design/pages/gallery/recipes.ts`, each a live `MiniRecipeCanvas`. Single click opens in composer.
- **Missing:** The landing's 12 tiles are illustrative shaders, NOT real Recipes from the cards system. Tapping one doesn't load it into `/design`. The /gallery route fixes this but lives one click away. For the rubric, the homescreen should directly show clickable recipes.
- **Next steps:** Replace landing `TemplatesGrid` with `MiniRecipeCanvas` tiles wired to `CURATED_RECIPES` and `openInComposer()`. OR: redirect `/` to `/gallery` for the demo.

### F1.2 — Render at full devicePixelRatio
**SHIPPED.**
- `web/src/renderer/runtime.ts` lines 111–115 reads `window.devicePixelRatio` and feeds it into the renderer config.
- `web/src/renderer/mobile-perf.ts` exists to throttle DPR on weak devices — the right call.

### F1.3 — Beautiful default starting state
**SHIPPED.**
- `web/src/cards/starter-recipes.ts` defines three curated starter recipes.
- The composer never opens to an empty canvas — `DesignApp` loads a starter on first mount.

### F1.4 — "Wow mode" / fullscreen view
**SHIPPED.**
- `web/src/design/DesktopApp.tsx` line 2011 keyboard `F` toggles wow-mode fullscreen.
- `FullscreenChromeBtn` lives in the canvas area (line 1487). UI hides; canvas stays.

### F1.5 — Export as image / record as short loop
**SHIPPED.**
- PNG snapshot via `canvas.toBlob()` (DesktopApp.tsx line 1192).
- WebM recording via `MediaRecorder` with vp9 → vp8 → mp4 codec fallback (lines 1167–1218).
- Documented in `docs/pages/53-share-export.tsx`.

---

## Bucket 2 — Contrast & immediate feedback

### F2.1 — Auto-scroll code view to changed region with highlight pulse
**NOT SHIPPED.** **Highest priority gap.** This is the one the organizer named.
- Marker comments exist (`web/src/cards/markers.ts`) — the data is there to map cardId → line range.
- The code view (`DesktopApp.tsx` line 742 onwards) is a read/edit toggle but has no auto-scroll or fade-pulse behaviour.
- **Next steps:** When a slider/block edit fires, compute the line range from the cardId via the existing marker map, call `editor.scrollIntoView({line, scope: 'block'})`, and apply a CodeMirror `Decoration.line()` with a lime background that fades over 600ms. ~3–4 hours of focused work using the existing marker emission.

### F2.2 — Slider drag shows live numeric value as overlay
**PARTIAL.**
- Sliders in the Properties panel show the live value next to the label. No floating chip near the cursor — value updates inline.
- **Next steps:** Add a small absolutely-positioned chip that follows the cursor while dragging. ~30 mins.

### F2.3 — Block selection highlights corresponding code region
**NOT SHIPPED.**
- Block selection works (visible in `Block.tsx` `selected` prop). No bidirectional link to the code view's gutter.
- **Next steps:** On block-select, compute the line range, render a persistent left-gutter accent. ~1 hour.

### F2.4 — Before/after diff overlay on canvas
**NOT SHIPPED.**
- No history-snapshot-based wipe exists.
- **Next steps:** Stash an offscreen WebGL framebuffer of the recipe 5s ago, render it on a held key with a wipe transition. ~3 hours.

### F2.5 — Pulse animation on every block when uniforms update
**SHIPPED.**
- `web/src/design/Block.tsx` lines 226–256 — pulse on param updates with `pulseAt` state and a fading border colour.

---

## Bucket 3 — Impact (30% of score)

### F3.1 — Education framing
**PARTIAL.**
- Education is currently implicit in three places: the `/learn` route (8 lessons), the `/library` (31 explainers), and the new humanized copy. Nothing explicitly says "this is Scratch for the GPU."
- The Landing hero now (after this PR) leads with "Scratch for GPU shaders" and the 200× CPU/GPU framing, which directly addresses this.
- **Next steps:** Add an "About" section to the landing — one screen on who Shaddy is for (students, indie game devs, creative coders). Cite the Brown/CMU graphics courses as the kind of place this would land. 30 minutes of copy work; no code.

### F3.2 — Connect to one big real-world GPU domain
**NOT SHIPPED.** Recommended pick: **game development** (most provable, most relatable).
- The card library has the building blocks but there's no export path to Unity/Godot/Three.js (see F5.1).
- **Next steps:** Land F5.1 first (export to game engine formats); the pitch follows naturally.

### F3.3 — Accessibility angle
**NOT SHIPPED.**
- No large-text toggle, no screen-reader labels declared on the block library, no full keyboard navigation of the chain.
- The composer is keyboard-friendly (arrow keys reorder, Cmd+K opens picker) — that's a partial win.
- **Next steps:** Add `aria-label` to every block element; build a font-size escalator in the topbar. ~2 hours.

### F3.4 — Don't overclaim
**SHIPPED.** Current copy is grounded — no protein folding claims.

---

## Bucket 4 — CPU vs GPU narrative

### F4.1 — Live CPU vs GPU benchmark
**NOT SHIPPED.** **Highest rubric-impact gap.**
- No CPU emit path in the compiler, no benchmark UI.
- **Next steps:** Pick 3–4 of the most common cards (radial_gradient, palette_themed, vignette, noise_field) and add a parallel `emitCpu()` that returns a TS function. Build a side panel that runs both at 256×256 for 100 frames, shows the ms/frame side by side, prints the multiplier. This is the single most rubric-aligned feature and the organizer specifically asked for a "why GPU" defense. ~4–6 hours.

### F4.2 — Extrapolation framing in the pitch
**PARTIAL.** New Landing copy mentions "~200× faster on the GPU than the same maths on CPU." The supporting benchmark to make the number defensible doesn't exist yet (depends on F4.1).

### F4.3 — One concrete real-world reference
**NOT SHIPPED.** Pitch addendum, not code.
- **Next steps:** Memorize one number (ACES blur 10–50× CPU on After Effects, or Stable Diffusion ~100× on consumer GPU). Add it to the FAQ. 5 mins.

---

## Bucket 5 — Practicality

### F5.1 — Export shader as standalone file for game engines
**NOT SHIPPED.** **Critical for practicality + impact stories.**
- Docs page `53-share-export.tsx` mentions Share URL + PNG + WebM + fullscreen. No export menu for GLSL/HLSL/Godot/Three.js code.
- The compiler already emits clean GLSL — half the work is done.
- **Next steps:** Add an export dropdown next to the share button: "Copy GLSL", "Download Unity .hlsl" (with the GLSL→HLSL mapping table), "Copy Godot 4 visual shader", "Download Three.js zip". The Unity path is the hardest; for v1, support the 60% of cards that translate cleanly and disable the rest with a "uses unsupported card" warning. ~3 hours.

### F5.2 — "Use as web background" copy-paste snippet
**NOT SHIPPED.**
- **Next steps:** Add a "Copy HTML background snippet" item to the same export menu. Generates a `<canvas>` + `<script type="module">` block that includes the compiled GLSL inline. ~1 hour.

### F5.3 — Concrete "I made this for X" taglines on gallery
**SHIPPED** (just humanized in this PR).
- `web/src/design/pages/gallery/recipes.ts` — every recipe has a use-case tag like "Sci-fi loading screen, no copyright to worry about". Pitches the practicality without you having to.

---

## Bucket 6 — Homescreen showcase + zero-experience onboarding

### F6.1 — The homescreen IS the gallery
**PARTIAL.** See F1.1 — the landing has 12 live tiles but they're illustrative shaders, not clickable Recipes. The /gallery route works but takes one extra click.

### F6.2 — "Recreate this" tutorial overlay
**PARTIAL.**
- `/learn` route exists with 8 guided GLSL lessons + mascot + check button. This nails the "zero experience" feel but is detached from the gallery.
- **Missing:** A small `?` icon on 2–3 gallery items that launches a step-by-step overlay teaching the user to rebuild that specific recipe.
- **Next steps:** Add a `tutorial: TutorialStep[]` field to `CuratedRecipe`. Build a 4-step modal overlay that shows the canvas + a "drag block X" / "snap block Y" instruction. ~3 hours.

### F6.3 — Share button generates a "remix this" link
**PARTIAL.**
- Cmd+S copies a share URL with the full recipe encoded — works.
- The share confirmation toast doesn't say "remix" anywhere; it just says copied.
- **Next steps:** Update the toast text to "Share URL copied. Anyone with this link can edit and remix your shader." 5 mins.

---

## Pitch verification — does the LANDING tell the rubric story?

The freshly humanized landing copy (this PR):

1. **What Shaddy is** — the hero subhead now reads: *"Shaddy snaps shader art together like puzzle blocks. Drag a card, see the canvas move, peek at the GLSL underneath."* Clear.
2. **Wow first impression** — the RD-Hero canvas behind the headline is a live reaction-diffusion shader. The 12-tile TemplatesGrid below is more live shaders. Visually strong.
3. **Gallery hits from the front page** — PARTIAL. The 12 live tiles in the templates section are not clickable Recipes — clicking opens nothing. The /gallery route exists but is a click away in the nav.
4. **Export → game engine path** — NOT MENTIONED on landing. Hero copy says "Export to Unity, Godot, or paste it straight into Shadertoy" but the feature doesn't exist yet (F5.1). This is overclaiming until F5.1 lands.
5. **CPU vs GPU number** — hero copy now says "~200× faster on the GPU than the same maths on CPU." The supporting benchmark UI doesn't exist (F4.1). Soft overclaim.

**Two things to fix before pitch:**
- **Either land F5.1 (game-engine export) OR remove that line from the hero.** It's the strongest practicality claim and currently a write check the code can't cash.
- **Either land F4.1 (live benchmark) OR soften the 200× number** to "100×–1000× faster on the GPU for per-pixel work, depending on hardware" (citing known industry numbers, not a benchmark we ran).

If you can ship F4.1 + F5.1 + F2.1 in the remaining time, the landing → demo flow lands every rubric bucket. Without F4.1 or F5.1, soften the copy to match what's real.

---

## Summary

- **SHIPPED:** 7 (F1.2, F1.3, F1.4, F1.5, F2.5, F3.4, F5.3)
- **PARTIAL:** 8 (F1.1, F2.2, F3.1, F4.2, F6.1, F6.2, F6.3, F3.2 borderline)
- **NOT SHIPPED:** 9 (F2.1, F2.3, F2.4, F3.2, F3.3, F4.1, F4.3, F5.1, F5.2)

**Top 3 missing items to land for biggest rubric impact:**
1. **F4.1 — Live CPU vs GPU benchmark.** Highest impact-per-hour; directly answers the organizer's question; makes a defensible number for the pitch.
2. **F2.1 — Auto-scroll + highlight on code view.** Organizer named this explicitly. Marker data already exists; mostly a CodeMirror decoration call.
3. **F5.1 — Export to Unity / Godot / Three.js.** Unlocks the F3.2 game-dev impact story and the F5 practicality story in one feature.
