# Inspector — global canvas parameters

> Rework the Canvas/Output tab of the Properties inspector so its controls actually drive the renderer and the export path instead of showing dead, hardcoded chrome. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

The "no selection" global panel in `web/src/design/Properties.tsx` (`GlobalProps`, lines 1593–1687) is mostly fake: a `120 bpm` tempo display with a dead **tap** button, a hardcoded `3840×2160` resolution chip that drives nothing, a `120` placeholder slider, and a footer that hardcodes `WEBGL · OK` / `v0.4.2`. Only the three aspect-ratio buttons are real (they write `recipe.canvasAspect`).

This spec deletes the tempo section and dead strings, and makes four things real and wired:

1. **Export/render resolution** — a real chosen output size that drives `renderer.resize()` + `snapshot()` (and the WebM record canvas) at export time, replacing the hardcoded `3840×2160`.
2. **Background color + alpha/transparency** — a base color painted behind the shader, with a transparent-export toggle that produces a PNG with a real alpha channel.
3. **FPS cap** — a render-loop frame-rate ceiling (Uncapped / 60 / 30) for battery/perf.
4. **Render scale** — a 0.25–1.0 multiplier on the live drawing-buffer size for perf on weak GPUs.

These four live in a **new `CanvasSettings` slice on the Zustand cards store** (NOT on the `Recipe` — see Design for the rationale), the renderer gains a small additive API surface (`clearColor`, `fpsCap`, `renderScale`, and a resolution-targeted `snapshot`), and the existing export buttons in `DesktopApp.tsx` switch from reading the raw on-screen `<canvas>` to a render-at-resolution path.

## Goals

- Delete the tempo section + dead **tap** button + the `120 bpm` / `120`-slider entirely from `GlobalProps`.
- Make the resolution chip a real control that sets the export output size and drives `snapshot()`/record output dimensions.
- Add a background-color swatch + alpha slider + "transparent export" toggle that visibly change the canvas backdrop and produce alpha-correct PNGs.
- Add FPS-cap and render-scale controls that measurably change the live render loop.
- Keep + visually clean the aspect-ratio buttons; they continue to write `recipe.canvasAspect`.
- Replace `WEBGL · OK` with a real renderer-backend/fps readout and delete the hardcoded `v0.4.2` string (drive it from a single version constant or remove it).
- Respect CONTRACTS.md boundaries: the renderer additions go through `web/src/renderer/index.ts`; `design/` consumes only public entries.

## Non-goals

- No tempo/BPM feature anywhere (animation blocks own all timing — see `cards/anim-blocks.ts`).
- No per-recipe export presets, no batch export, no server-side render. Export stays client-side.
- No change to the Share-URL recipe format (`web/src/design/recipe-url.ts`); canvas settings are session/device state, not recipe content (see Design).
- No new arbitrary-WxH text entry in v1 — resolution is a small fixed menu keyed off the current aspect (extensible later).
- No multi-pass-specific export handling beyond what `resize()` already does (FBOs re-allocate lazily in `runtime.ts` `loop()`).

## Current state

All line numbers verified by reading the files on branch `frontend/revamp`.

**`web/src/design/Properties.tsx`**
- `ASPECTS` array — `Properties.tsx:1587–1591`. Keys `'square' | 'portrait' | 'landscape'`, labels `1920×1080` / `1080×1080` / `1080×1920`.
- `GlobalProps` component — `Properties.tsx:1593–1687`. Reads `recipe` + `setRecipe` from `useCardsStore`.
  - **Tempo section** — `1604–1623`: `PropSectionHeader title="Tempo"`, a `120` / `bpm` display (`1607–1610`), the dead **tap** `<button>` (`1611–1620`), and `<PropertySlider label="Tempo" value={0.5} />` (`1622`). All static; no store wiring. **DELETE.**
  - **Output section** — `1625–1656`: aspect buttons map over `ASPECTS` and write `setRecipe({ ...recipe, canvasAspect: a.key })` (`1632`). The 4th grid cell is a static `3840×2160` chip (`1646–1655`) — purely decorative, wired to nothing. **KEEP+CLEAN aspect buttons; REPLACE the chip with the real resolution control.**
  - **Share section** — `1658–1671`: a "Publish to gallery" button (no handler yet — owned by the gallery spec). Leave as-is here.
  - **Footer** — `1673–1684`: hardcoded `<span>WEBGL · OK</span>` and `<span>v0.4.2</span>`. **REPLACE/DELETE.**
- `DK = PANEL` alias — `Properties.tsx:40`. Tokens: `DK.well/sub/panel/raised/border/borderHi/text/value/dim/mid/faint/hover` (from `tokens.ts:70–87`). `SHADE.gold/goldDeep` for primary actions. `TYPE.bodyMono/body/display` from `tokens.ts:122+`. Reuse these; add no new palette.
- `DarkRail` slider — `Properties.tsx:805` — reusable 0..1 rail used for alpha elsewhere (`1574`). Reuse for the bg-alpha + render-scale sliders.
- `ModePill` — `Properties.tsx:178` — the 2D/3D toggle pattern to mirror for the FPS-cap segmented control.

**`web/src/cards/types.ts`**
- `Recipe` — `types.ts:9–32`: `cards`, `canvasAspect: 'square'|'portrait'|'landscape'` (`:14`), optional `mode`, `passes`, `animations`. **No canvas/export/background fields exist.** `canvasAspect` is the only canvas-shape field today.

**`web/src/cards/state.ts`**
- `useCardsStore` (`state.ts:286`), `CardsState` type (`state.ts:149–284`). `EMPTY_RECIPE = { canvasAspect: 'square', cards: [] }` (`state.ts:60`). Camera lives here as **view state, explicitly NOT part of the recipe** (`state.ts:132–147`, `DEFAULT_CAMERA` `:143`) — the exact precedent for where canvas settings belong.

**`web/src/renderer/`**
- Public surface `renderer/index.ts` — `RendererAPI` (`:54–81`): `mount`, `compile`, `compileMulti`, `setUniform`, `resize(width,height)` (`:70`), `snapshot(): Promise<string>` (`:74`), `onCompile`, `getFps()` (`:80`). **No clear color, no fps cap, no render scale.**
- `runtime.ts`:
  - `mount()` (`:101–147`) creates the context with `preserveDrawingBuffer: true` (`:124`) and `alpha` defaulting to true (not passed), sizes the buffer via `initialBufferSize(...)`.
  - The render loop `loop` (`:458–541`) runs **uncapped** via `requestAnimationFrame`; there is **no clear()** — the shader's fullscreen triangle fully covers the framebuffer, so there is no background color today. The mobile-perf `FpsWatchdog` (`:466–474`) can halve the buffer.
  - `resize(width,height)` (`:393–403`) sets `canvas.width/height`; viewport + `u_resolution` reapply each frame.
  - `snapshot()` (`:405–411`) is just `canvas.toDataURL('image/png')` at the **current** buffer size — it does NOT honor any "render resolution".
  - `getFps()` (`:420–422`) reads `FpsCounter`.
- `fps.ts` — `FpsCounter` (window-based, `get()` returns frames in last second).

**`web/src/design/RecipeCanvas.tsx`**
- Mounts the renderer into `rendererRef` (local, `:86`, `:175–177`); a `ResizeObserver` calls `r.resize(clientW*dpr, clientH*dpr)` every layout change (`:180–191`). **No imperative handle is exposed** — siblings cannot call `resize`/`snapshot` on this renderer.

**`web/src/design/DesktopApp.tsx`**
- `ASPECT_LABEL` (`:1491`), `ASPECT_ORDER` (`:1497`), `ASPECT_NUM` (`:1500–1502`).
- `PreviewPanel.cycleAspect` (`:1517–1522`) writes `canvasAspect`.
- `PreviewFullscreen` (`:1671+`) owns the real export path: `getCanvas()` does `root.querySelector('canvas')` (`:1688–1692`); `handleScreenshot` calls `canvas.toBlob(...)` (`:1700–1715`); `handleStartRecord` uses `canvas.captureStream(60)` + `MediaRecorder` (`:1717–1759`). **Both read the live on-screen buffer at its DPR size — the `3840×2160` chip has zero effect on them.**

**Docs that describe the intended (but unbuilt) behavior:** `web/src/design/pages/docs/pages/53-share-export.tsx:62–98` already documents "snapshots respect the drawing-buffer size; resize first for 4K." This spec makes that real.

## Design

### Where each setting lives — decision

Three candidate homes were considered:

| Setting | Home | Why |
|---|---|---|
| `canvasAspect` | **stays on `Recipe`** (`types.ts:14`) | It changes composition (the `uv.x *= W/H` the compiler bakes via aspect); it is content and must ride the Share URL. Unchanged by this spec. |
| Export resolution, background color+alpha, transparent-export, fps cap, render scale | **new `CanvasSettings` slice on the cards store** (NOT the Recipe) | These are **device/session viewing+export preferences**, not artwork. Putting them on the Recipe would bloat the Share URL and make "open someone's recipe" silently change your fps cap and force a transparent background. This mirrors the existing **`camera` precedent** (`state.ts:132–147`: "recipes are content, camera is viewpoint"). |
| The actual GL operations (clear color, loop cap, buffer scale, sized snapshot) | **renderer options via `renderer/index.ts`** | The store holds intent; the renderer executes it. `design/` is the only seam that wires store → renderer. |

So: **the Recipe is untouched except that nothing new is added.** `CanvasSettings` is store-only state, defaulted, never serialized into the recipe hash. (If a future product decision wants per-artwork background, it gets added to `Recipe` then — out of scope here.)

### Data model — `CanvasSettings` (in `web/src/cards/state.ts`)

```ts
// state.ts — alongside CameraView (state.ts:132). View/export state, NOT recipe content.
export type CanvasSettings = {
  /** Export/render long-edge target in px, applied to resize() at export time
   *  and shown in the inspector. Keyed off aspect to derive WxH (see resolveExportSize). */
  exportLongEdge: 1080 | 1440 | 2160 | 4320; // "1080p" | "1440p" | "4K" | "8K" long edge
  /** Base color painted behind the shader, sRGB 0..1. */
  background: ColorRgb;          // reuse cards/types ColorRgb
  /** 0..1 opacity of the background fill. <1 lets the (transparent) clear show through. */
  backgroundAlpha: number;
  /** When true, PNG/record export uses an alpha channel and does NOT composite
   *  the background — the shader's own alpha is preserved. */
  transparentExport: boolean;
  /** Live render-loop ceiling. 0 = uncapped (rAF native). */
  fpsCap: 0 | 30 | 60;
  /** Multiplier on the live drawing-buffer size (perf). 1 = full DPR size. */
  renderScale: 0.25 | 0.5 | 0.75 | 1;
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  exportLongEdge: 2160,           // matches the old 3840×2160 intent for landscape
  background: [0, 0, 0],
  backgroundAlpha: 1,
  transparentExport: false,
  fpsCap: 0,
  renderScale: 1,
};
```

Add to `CardsState` (`state.ts:149`):

```ts
canvas: CanvasSettings;
setCanvas: (patch: Partial<CanvasSettings>) => void;   // shallow-merge patch
```

Wire in the store body (near `camera`/`setCamera`, `state.ts:385–386`):

```ts
canvas: DEFAULT_CANVAS_SETTINGS,
setCanvas: (patch) => set((s) => ({ canvas: { ...s.canvas, ...patch } })),
```

`CanvasSettings`, `DEFAULT_CANVAS_SETTINGS` must be re-exported from `web/src/cards/index.ts` (the public surface — CONTRACTS.md §3) so `design/` may import them. `ColorRgb` is already exported there.

**Resolution math** — a single pure helper (co-located in `state.ts`, exported via `cards/index.ts`), so both the inspector label and the export path agree:

```ts
// Given the recipe aspect + the chosen long edge, return integer WxH.
export function resolveExportSize(
  aspect: Recipe['canvasAspect'], longEdge: number,
): { width: number; height: number } {
  // square 1:1, portrait 9:16, landscape 16:9 (matches DesktopApp ASPECT_NUM:1500).
  const ratios = { square: [1, 1], portrait: [9, 16], landscape: [16, 9] } as const;
  const [rw, rh] = ratios[aspect];
  const long = Math.max(rw, rh);
  return {
    width:  Math.round(longEdge * (rw / long)),
    height: Math.round(longEdge * (rh / long)),
  };
}
```
e.g. landscape@2160 → 3840×2160 (the exact value the dead chip displayed), square@2160 → 2160×2160, portrait@2160 → 1215×2160.

### Renderer API additions (`web/src/renderer/index.ts` + `runtime.ts`)

These are **additive** to `RendererAPI` (Tier-2 style like `compileMulti`); existing callers keep working. CONTRACTS.md §1 must be updated in the same PR.

```ts
// renderer/index.ts — appended to RendererAPI
/** sRGB 0..1 background painted BEFORE the shader each frame. a<1 + an
 *  alpha-enabled context yields a partially/ fully transparent backdrop.
 *  Pass null to disable the clear (current behavior — shader covers all). */
setClearColor(c: { r: number; g: number; b: number; a: number } | null): void;

/** Cap the render loop. 0 = uncapped (native rAF). */
setFpsCap(fps: number): void;

/** Multiply the resize() target by this factor for the LIVE buffer (perf).
 *  Does not affect snapshotAt(). 0.25..1. */
setRenderScale(scale: number): void;

/** Render one frame at an exact pixel size and read it back as PNG. Used by
 *  export so output size is decoupled from the on-screen buffer. `alpha`
 *  true keeps the framebuffer's alpha channel (transparent export). The
 *  renderer restores the previous live size afterward. */
snapshotAt(width: number, height: number, opts?: { alpha?: boolean }): Promise<string>;
```

**`runtime.ts` implementation notes:**
- Context already requests `preserveDrawingBuffer: true` (`:124`). Keep `alpha: true` (the default) so transparent export is possible; explicitly pass `{ alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true }` for predictable readback.
- `setClearColor`: store `clearColor`. In `loop` (both branches, before the image-pass `drawArrays`), when set, `gl.clearColor(r*a, g*a, b*a, a); gl.clear(gl.COLOR_BUFFER_BIT);` then enable `gl.blend` so the shader composites over it. When null, skip (today's behavior). Buffer passes are unaffected.
- `setFpsCap`: store `fpsCap`. In `loop`, gate the body on `now - lastDraw >= 1000/fpsCap` (still re-schedule rAF each tick; just skip drawing when under budget). `0` → draw every tick. Keep `FpsCounter.tick` only on actual draws so `getFps()` reflects the cap.
- `setRenderScale`: store `renderScale`; multiply into the `resize()` target. To avoid the design layer doing the math, simplest contract: `resize(w,h)` continues to set the buffer to exactly `w,h`; the **design layer** multiplies `clientW*dpr*renderScale` before calling `resize` (mirrors the existing DPR multiply in `RecipeCanvas.tsx:180–185`). Document this; do not silently rescale inside `resize` (keeps `resize` a dumb setter, which `compileMulti`/FBO code depends on).
- `snapshotAt(w,h,opts)`: capture current `canvas.width/height`; `this.resize(w,h)`; render exactly one synchronous frame to the default framebuffer (factor the image-pass draw out of `loop` into `drawImagePass(now)` and call it once — multi-pass needs its buffer passes run first, so run the full pipeline once); `const url = canvas.toDataURL('image/png')`; restore the previous size via `this.resize(prevW, prevH)`; resolve `url`. With `opts.alpha` false (default), clear to the composited background first; with `alpha` true, do NOT clear (preserve shader alpha). FBOs re-allocate to the new size lazily inside `loop`'s `ensureFboPair` — call `ensureFboPair` for active buffers before the synchronous draw.

### UI structure — new `GlobalProps` (`Properties.tsx:1593–1687`)

Sections top→bottom (reuse `PropSectionHeader`, `DarkRail`, the existing button styling; flat, no glow per the polish constraint):

1. **Recipe** (unchanged, `1598–1602`) — card count + aspect summary.
2. **Output** — the cleaned aspect buttons (3-up grid, keep the active styling at `1634–1639`) **plus** a resolution row: a small segmented/select control over `exportLongEdge` ({1080p, 1440p, 4K, 8K}) with a live `resolveExportSize(aspect, longEdge)` label (e.g. `3840 × 2160`) replacing the dead chip.
3. **Background** — a color swatch button opening the existing `RgbColorPicker` portal (same pattern as card color params, `react-colorful` already imported `Properties.tsx:11`) bound to `canvas.background`; a `DarkRail` for `backgroundAlpha`; a flat checkbox/toggle for `transparentExport` ("Export with transparency").
4. **Performance** — an FPS-cap segmented control (`Uncapped / 60 / 30`, mirror `ModePill` at `:178`) bound to `canvas.fpsCap`; a `DarkRail` (or 4-step segmented) for `renderScale` with a `× scale → live WxH` hint.
5. **Share** (unchanged, `1658–1671`).
6. **Footer** (`1673–1684`) — replace `WEBGL · OK` with a live readout: backend (`WebGL2`) + `getFps()` (polled ~1s) e.g. `WEBGL2 · 60 FPS`; delete the hardcoded `v0.4.2` (either drop it, or render from a single `APP_VERSION` constant in `tokens.ts`/`shared/` — prefer dropping it unless a real version source exists).

### Wiring store → renderer (`design/` only, the integration seam)

The renderer lives in `RecipeCanvas.tsx`'s local `rendererRef` with no external handle. Two wiring points:

- **Live settings (background, fpsCap, renderScale):** inside `RecipeCanvas`, subscribe to `useCardsStore((s) => s.canvas)` and, in an effect, push to the renderer: `r.setClearColor(transparentExport ? null : {…background, a: backgroundAlpha})`, `r.setFpsCap(fpsCap)`, and fold `renderScale` into the existing `applyDprSize()` (`RecipeCanvas.tsx:180–185`) so resize uses `clientW*dpr*renderScale`. This keeps the seam inside the component that owns the renderer — no new cross-module import.
- **Export (resolution + transparency):** `PreviewFullscreen` (and any toolbar export) must call `snapshotAt`/sized record instead of reading the raw `<canvas>`. Expose the renderer via a small imperative handle: add `useImperativeHandle` to `RecipeCanvas` exposing `{ snapshotPng(w,h,opts), getCanvas() }`, and pass a `ref` down from `DesktopApp`. Then:
  - `handleScreenshot` (`:1700–1715`) → `const { width, height } = resolveExportSize(aspect, exportLongEdge); const url = await canvasRef.current.snapshotPng(width, height, { alpha: transparentExport }); download(url)`.
  - Record (`:1717–1759`): resize the live buffer to the export size (via `setRenderScale`-bypassing `snapshotAt`'s sizing is not enough for a stream) — for v1, resize the on-screen buffer to `resolveExportSize` for the duration of the recording, then restore. Document that record uses the export resolution (the existing docs callout `53-share-export.tsx:94–99` already warns recording uses current resolution).

> Note: exposing an imperative handle is a `design/`-internal change (RecipeCanvas and DesktopApp are both in `design/`), so it does not touch CONTRACTS.md §1. Only the four new `RendererAPI` methods touch CONTRACTS.md.

## Implementation tasks

- [ ] **Slice 1 — store model.** Add `CanvasSettings`, `DEFAULT_CANVAS_SETTINGS`, `resolveExportSize` to `cards/state.ts`; add `canvas` + `setCanvas` to `CardsState` and the store body. Re-export all three (+ type) from `cards/index.ts`. Unit-test `resolveExportSize` (all 3 aspects × all 4 long edges) and `setCanvas` shallow-merge. *Testable in isolation; no UI.*
- [ ] **Slice 2 — renderer API.** Add `setClearColor`, `setFpsCap`, `setRenderScale`, `snapshotAt` to `renderer/index.ts` and `runtime.ts` (factor the image-pass draw into a reusable `drawImagePass`/one-shot path; gate the loop on `fpsCap`; clear-color compositing). Update CONTRACTS.md §1 in the same commit. Add `setClearColor`/`setFpsCap`/`setRenderScale`/`snapshotAt` to `renderer/__mocks__/renderer.ts` so downstream tests compile. *Testable via the existing renderer harness + a jsdom-friendly `snapshotAt` returning the mock PNG.*
- [ ] **Slice 3 — delete dead UI.** In `Properties.tsx` `GlobalProps`: remove the Tempo section (`1604–1623`), the `3840×2160` static chip (`1646–1655`), and the footer's hardcoded `v0.4.2` (and replace `WEBGL · OK`). Aspect buttons stay. *Verify the panel renders with no tempo + no console errors.*
- [ ] **Slice 4 — Output resolution control.** Add the `exportLongEdge` segmented control + live `resolveExportSize` label where the chip was, bound to `canvas`/`setCanvas`. *Test: clicking 4K/8K and toggling aspect updates the shown WxH.*
- [ ] **Slice 5 — Background controls.** Add the bg color swatch (reuse `RgbColorPicker` portal pattern), `backgroundAlpha` `DarkRail`, and `transparentExport` toggle. Wire into `RecipeCanvas` effect → `r.setClearColor(...)`. *Test: setting background to red with no shader covering shows red; alpha<1 dims it.*
- [ ] **Slice 6 — Performance controls.** Add FPS-cap segmented (`ModePill`-style) + render-scale control, bound to `canvas`. Wire `r.setFpsCap` and fold `renderScale` into `applyDprSize`. Footer fps readout via polled `getFps()`. *Test: cap=30 halves `getFps()`; renderScale=0.5 quarters the buffer pixel count.*
- [ ] **Slice 7 — Export at resolution.** Add `useImperativeHandle` to `RecipeCanvas` (`snapshotPng`, `getCanvas`); pass a `ref` from `DesktopApp`. Rewrite `handleScreenshot` to use `snapshotAt`+`resolveExportSize`+`transparentExport`; resize the record buffer to export size for the take. *Test: exported PNG dimensions equal `resolveExportSize(aspect, longEdge)`; transparent export yields a PNG with non-opaque pixels.*

## Testing

Vitest 2.1 + @testing-library/react + jsdom; use the renderer mock harness (`renderer/__mocks__/renderer.ts`) — no real WebGL in tests.

- **Unit (`cards/state.test.ts`, or a new `canvas-settings.test.ts`):** `resolveExportSize` returns 3840×2160 for `landscape@2160`, 2160×2160 for `square@2160`, 1215×2160 for `portrait@2160`, etc.; `setCanvas` shallow-merges and leaves the recipe untouched; default `canvas` equals `DEFAULT_CANVAS_SETTINGS`; loading a Share URL / starter recipe does NOT change `canvas` (proves it's not recipe content).
- **Component (`Properties.tsx`):** render `GlobalProps` with the mock store; assert no "tempo"/"bpm"/"tap"/"v0.4.2" text exists; clicking a resolution option dispatches `setCanvas({ exportLongEdge })`; toggling aspect updates the displayed WxH; the bg swatch opens the picker and `setCanvas({ background })` fires; the FPS-cap control dispatches `setCanvas({ fpsCap })`.
- **Renderer (`runtime` via harness + new mock methods):** mock `snapshotAt(w,h)` resolves a PNG data URL; `setFpsCap`/`setClearColor`/`setRenderScale` are no-throw. A jsdom-light `runtime` test asserts `setFpsCap(30)` causes `getFps()` to settle near 30 over simulated ticks (drive `loop` with a stubbed `performance.now`).
- **Integration (DesktopApp export path):** with the mock renderer, invoking the screenshot handler calls `snapshotPng` with the resolved size and produces a download whose filename matches `shaddy-*.png`.

## Risks & open questions

- **Transparent export + `preserveDrawingBuffer`:** alpha readback requires the context be created with `alpha:true` and care around premultiplied alpha. `runtime.ts:124` already preserves the buffer; we must verify `toDataURL` yields a real alpha channel after a no-clear draw. Mitigation: explicit `premultipliedAlpha:false`; cover with a manual check in the browser (jsdom can't validate pixels).
- **FPS cap vs the mobile `FpsWatchdog`** (`runtime.ts:466`): a user cap of 30 must not trip the watchdog (which halves the buffer when fps < 45 for 2s). Fix: feed the watchdog the *uncapped potential* or disable it whenever a manual cap is set. Decide in Slice 6.
- **Record at export resolution** resizes the live on-screen buffer, briefly changing what the user sees during a take. Acceptable for v1 (matches the documented behavior in `53-share-export.tsx`); a future offscreen-FBO record path is out of scope.
- **`renderScale` interaction with `snapshotAt`:** export must ignore `renderScale` (always full export size). Guaranteed because `snapshotAt` sizes the buffer directly and `renderScale` only folds into the live `applyDprSize`.
- **Version string:** is there a real app version source? If not, the `v0.4.2` string is simply deleted (preferred) rather than faked again.

## Dependencies

- **CONTRACTS.md** — must be edited in the same PR as Slice 2 (the four new `RendererAPI` methods).
- **`cards/index.ts`** public surface — gains `CanvasSettings`, `DEFAULT_CANVAS_SETTINGS`, `resolveExportSize` (CONTRACTS.md §3 note).
- **00-overview.md** — initiative framing.
- **Gallery/publish spec** (the spec covering `/s/:id` + publish thumbnails) consumes `snapshot()`/`snapshotAt` for thumbnail capture; coordinate the export-resolution policy so published thumbnails use a sane fixed size, not the user's 8K choice. Reference whichever overview-numbered gallery spec owns publishing.
- No backend dependency (`02-backend-srv-dev-01.md` not required) — this is purely client-side.

## Done when

- [ ] The Canvas/Output tab shows **no** tempo, **no** `bpm`, **no** **tap** button, **no** placeholder `120` slider.
- [ ] The resolution control sets `canvas.exportLongEdge`; the displayed `W × H` updates with both the resolution choice and the aspect, and equals `resolveExportSize(...)`.
- [ ] A PNG exported via the screenshot button has pixel dimensions equal to `resolveExportSize(currentAspect, exportLongEdge)` — verified for at least landscape@4K (3840×2160) and square@1080 (1080×1080).
- [ ] Setting a background color paints behind the shader on the live canvas; `backgroundAlpha < 1` visibly reduces it; **transparent export** produces a PNG with a real alpha channel (no background composited).
- [ ] FPS-cap = 30 makes `getFps()` settle near 30; render-scale = 0.5 reduces the live drawing-buffer pixel count to ~¼ without changing CSS layout.
- [ ] The aspect buttons still write `recipe.canvasAspect` and remain visually clean (flat, reusing `DK`/`SHADE`/`TYPE` tokens; no glow).
- [ ] The footer shows a real backend + fps readout; the hardcoded `v0.4.2` is gone (or sourced from a single constant).
- [ ] `canvas` settings are store-only: opening a Share URL or starter recipe never mutates them, and they never appear in the encoded recipe hash.
- [ ] `npm run test` (Vitest) passes including the new unit/component tests; CONTRACTS.md §1 + §3 reflect the new renderer + cards surface.
