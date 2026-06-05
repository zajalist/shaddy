# Learn page — UI overhaul

> The `/learn` interactive shader tutorial works but its layout, progress
> indicator, and injected-CSS plumbing are crude — this spec cleans up the
> presentation without touching the lesson pedagogy. Part of the Shaddy
> publish/gallery/polish initiative — see 00-overview.md.

## Summary

`/learn` (`web/src/design/pages/Learn.tsx`) is a Codecademy-style tutorial: a
warm hero strip, a lesson rail, a mascot + speech bubble on the left, and an
editor + live WebGL preview on the right. The eight lessons themselves
(`./learn/lessons.ts`) are good and stay exactly as they are.

What needs work is everything around them:

1. **Layout.** The editor/preview split is a 0.85/1 grid where the preview is a
   fixed 220×220 square wedged under a tall code well — the preview is tiny and
   the proportions fight on narrow desktops. Rework into a cleaner
   editor-over-preview (or side-by-side on wide screens) split that breathes.
2. **Progress indicator.** Progress is a thin bar in the hero plus tick marks on
   rail pills. It is persisted under the key `shade.learn.completed.v1`
   (`lessons.ts:499`). This spec **migrates the key to
   `shaddy.lessons.progress.v1`** and adds one clear, persistent
   "N of 8 lessons complete" indicator visible in both the hero and the
   workspace.
3. **Mascot.** Already flat (real `@/ux` `Mascot`), but it sits inside a
   `mascotStageStyle` with no flashy treatment to remove — keep it flat, just
   reposition. The one offender is the confetti burst and the hover
   `box-shadow` "lift" rules baked into injected CSS.
4. **Injected CSS / `style.textContent`.** `useLearnChrome` (`Learn.tsx:38-123`)
   injects a `<style>` whose `textContent` is a template literal that
   interpolates `${SHADE.inkLine}` / `${SHADE.surface3}` (lines 66, 70, 75, 79,
   86, 88, 92). It is guarded by `getElementById(KEYFRAMES_ID)` so it is built
   **once and never updated** — any token change (or the shared token extraction
   from 05-library-ui.md) leaves the cached blob stale, and the rules duplicate
   styling that belongs next to the buttons. Replace it with the shared
   keyframe/style layer.
5. **Confetti.** The completion burst (`Confetti`, `Learn.tsx:427-470`) is a
   radial SVG ray-burst on the `learnConfetti` keyframe. Keep a celebration
   moment but make it flat and respect `prefers-reduced-motion`; fix that it
   currently only mounts inside the left column's `mascotStageStyle` and never
   re-triggers reliably on re-pass.

Reuse the shared token/style layer introduced by **05-library-ui.md** rather
than re-inventing per-page injected CSS.

## Goals

- A cleaner, calmer lesson workspace: legible editor, a usefully-sized live
  preview, a hero that doesn't dwarf the content.
- One unambiguous progress indicator ("N of 8 complete") persisted under
  `shaddy.lessons.progress.v1`, with a one-time migration from the old key.
- Remove the brittle `style.textContent` injection in favour of the shared
  style layer from 05-library-ui.md; no more stale-token risk.
- Keep the mascot flat and minimal; remove the hover `box-shadow` "lift" /
  glow-adjacent treatment the user dislikes.
- A confetti completion trigger that is flat, fires reliably on each pass, and
  is silent under `prefers-reduced-motion`.

## Non-goals

- **Lesson DATA is frozen.** No edits to `lessons.ts` lesson bodies, prompts,
  hints, `starterCode`, `solutionCode`, or `check` functions. (The only change
  to that file is the `STORAGE_KEY` migration in the progress helpers, which is
  plumbing, not data.)
- No change to the renderer pipeline, `RawShaderCanvas`, pixel-sampling, or the
  `check()` contract.
- No new lessons, no server-side progress sync (progress stays in
  localStorage; cloud sync is out of scope and not blocked by auth).
- No change to `GlslHighlight` or the editable-overlay mechanism.

## Current state

All paths under `web/src/`.

- **`design/pages/Learn.tsx`** (747 lines) — the page. Notable pieces:
  - `useLearnChrome` (`38-123`): injects a Google-Fonts `<link>` (`FONT_LINK_ID`)
    and a `<style>` blob (`KEYFRAMES_ID`) whose `textContent` (`50-105`) defines
    `@keyframes learnFadeUp` / `learnConfetti` and the `.learn-cta`,
    `.learn-primary-btn`, `.learn-secondary-btn`, `.learn-step-pill` hover/active
    rules. The hover rules apply `transform: translateY(-1px)` **plus**
    `box-shadow: 0 4px 0 ${SHADE.inkLine}` (`65-66`, `74-75`, `87-88`). It also
    mutates `document.body`/`documentElement` background + overflow on mount and
    restores on unmount (`108-122`).
  - `Learn()` (`127-229`): state is `done: Set<string>` (from `loadProgress()`),
    `activeIdx: number | null`, plus mascot `mood`, `bubbleTone`, `bubbleText`,
    `confettiKey`. `onCheckResult` (`160-176`) sets mood `cheering`, adds the
    lesson id to `done`, calls `saveProgress`, and sets `confettiKey = Date.now()`.
  - `Workspace` (`248-314`): `LessonRail` on top, then a CSS grid
    `minmax(0,0.85fr) minmax(0,1fr)` (`columnsStyle`, `671-676`). Left column =
    `Mascot` (`size={260}`) + `Confetti` + `SpeechBubble` + lesson meta + a
    conditional "Next lesson" button. Right column = `<LessonEditor>`.
  - `Hero` (`326-376`): eyebrow + title + lead + primary CTA + an inline
    `progressMeter` (`563-592`) showing `doneCount / totalCount`. Desktop shows a
    `Mascot mood="cheering" size={300}` with a speech bubble.
  - `LessonRail` (`388-420`): horizontal pill row, one pill per lesson, active =
    gold, done = `surface3` + `✓`, plus a "Reset progress" button.
  - `Confetti` (`427-470`): absolutely-positioned SVG ray-burst on the
    `learnConfetti` keyframe; re-keyed by `confettiKey`.
  - All styles are module-scope `CSSProperties` constants (`489-746`) referencing
    `SHADE` / `TYPE` from `../tokens`.
- **`design/pages/learn/LessonEditor.tsx`** (277 lines): vertical stack —
  header chip + `<GlslHighlight editable>` in a dark well (`editorWellStyle`,
  `flex: 1 1 auto`, `185-194`), a fixed **220×220** preview square
  (`previewWrapStyle`, `216-226`), and Reset / Show me / Check controls. Holds
  `source` state and feeds it to both the highlight overlay and `RawShaderCanvas`.
- **`design/pages/learn/RawShaderCanvas.tsx`** (142 lines): mounts a
  `createRenderer()` from `@/renderer`, compiles raw GLSL source, exposes
  `readPixels()` + `getCanvas()` via `handleRef`. Exports `samplePixel` / `luma`
  helpers. No changes needed.
- **`design/pages/learn/Mascot.tsx`** (42 lines): thin wrapper mapping 5 lesson
  moods onto the real `@/ux` `Mascot`'s 4 base moods. Already flat. No change.
- **`design/pages/learn/SpeechBubble.tsx`** (176 lines): cream bubble with a
  triangle tail; tone tints (`neutral`/`good`/`bad`/`hint`). Uses
  `box-shadow: 0 3px 0 ${SHADE.inkLine}` (a flat offset shadow, not a glow — fine
  to keep). No change required beyond optional token reuse.
- **`design/pages/learn/lessons.ts`** (522 lines): `LESSONS` array (8 lessons),
  the `Lesson` / `CheckResult` types, and `loadProgress` / `saveProgress`
  (`501-521`) keyed on `STORAGE_KEY = 'shade.learn.completed.v1'` (`499`).
- **`design/tokens.ts`**: `SHADE`, `PANEL`, `TYPE`, `RHYTHM` constants. The
  shared layer 05-library-ui.md extracts lives here (or a new `design/style/`
  module — see Dependencies).
- **`ux/Mascot/Mascot.css`** (282 lines): the real mascot's keyframes, already
  honouring `prefers-reduced-motion` (`270-281`). Flat. No change.
- **`design/useIsMobile.ts`**: shared 768px breakpoint hook (already used here).

### The `style.textContent` issue, precisely

The interpolation `0 4px 0 ${SHADE.inkLine}` is not a runtime crash — the
template literal evaluates correctly. The problem is **lifecycle + intent**:

1. The blob is built once and cached behind `getElementById(KEYFRAMES_ID)`
   (`Learn.tsx:47`). If `SHADE` values change (e.g. the 05-library-ui.md token
   extraction renames or re-values `inkLine`/`surface3`), the already-mounted
   `<style>` keeps the old literals — stale CSS in any session that mounted the
   old version, and a hot-reload that injects nothing.
2. It duplicates button styling as global class selectors (`.learn-cta`,
   `.learn-primary-btn`, …) that live far from the buttons they target, so the
   hover/disabled behaviour is invisible at the call site.
3. The hover rules add a `box-shadow` lift on `:hover` — the exact glow-adjacent
   "flashy" treatment called out in the shared UI-polish directive.

The fix is to stop hand-rolling a per-page `<style>` and consume the shared
keyframe + interaction-style layer from 05-library-ui.md.

## Design

### Component structure (target)

```
design/pages/Learn.tsx                 ← orchestrator only (state machine + layout)
design/pages/learn/
  LearnHero.tsx        (new)           ← hero strip (extracted from Hero in Learn.tsx)
  LearnWorkspace.tsx   (new)           ← two-pane workspace shell (extracted from Workspace)
  LessonRail.tsx       (new)           ← extracted from Learn.tsx, + vertical variant
  ProgressBadge.tsx    (new)           ← single source of truth for "N of 8 complete"
  Confetti.tsx         (new)           ← extracted, flat, reduced-motion aware
  LessonEditor.tsx     (existing)      ← preview sizing reworked
  Mascot.tsx           (existing)      ← unchanged
  SpeechBubble.tsx     (existing)      ← unchanged
  RawShaderCanvas.tsx  (existing)      ← unchanged
  lessons.ts           (existing)      ← progress helpers re-keyed only
  progress.ts          (new, optional) ← progress helpers moved out of lessons.ts
```

Extraction keeps `Learn.tsx` focused on the state machine (`activeIdx`, `done`,
mood/bubble, confetti trigger) and hands presentation to small, individually
testable components. None of these reach outside `design/` except for `@/ux`
(Mascot) and `@/renderer` (via the unchanged `RawShaderCanvas`), so the
existing eslint boundary (CONTRACTS.md §"design → ux/cards/renderer/auth")
holds — **no CONTRACTS.md change required**.

### Shared style layer (from 05-library-ui.md)

05-library-ui.md extracts the shared keyframes and interaction styles out of
per-page injected `<style>` blobs into one place (a `design/style/` module or
exported constants in `design/tokens.ts` — that spec owns the exact shape).
This spec **consumes** it:

- `learnFadeUp` and the confetti keyframe move into the shared keyframe sheet
  (mounted once by the shared layer, not by `useLearnChrome`).
- The `.learn-cta` / `.learn-primary-btn` / `.learn-secondary-btn` /
  `.learn-step-pill` hover/active/disabled rules are replaced by the shared
  button-interaction helper. The new buttons drop the `box-shadow` hover lift;
  hover communicates state via a flat background shift + the 1px `translateY`
  press only (no shadow growth).
- `useLearnChrome` shrinks to only: ensure the shared style layer is mounted
  (idempotent call into the shared module), set the page `background`/`color`
  on `document.body`, and restore on unmount. The font `<link>` injection moves
  to the shared layer too (Library, Learn, Docs all want the same fonts).

If 05-library-ui.md lands after this spec, the interim is: keep a *minimal*
`useLearnChrome` that mounts only the two keyframes (`learnFadeUp`, confetti)
**without** any token interpolation in selectors — push token-dependent values
into inline `style` on the elements instead, so there is no stale-token blob.

### Layout

**Hero** (`LearnHero.tsx`): unchanged content, but the progress meter is
replaced by `<ProgressBadge>` (see below) and the CTA loses the hover
`box-shadow`. Mascot stays `cheering`, flat.

**Workspace** (`LearnWorkspace.tsx`): a vertical stack —

1. `<LessonRail>` (horizontal pills on desktop; on mobile, a compact
   "Lesson 3 / 8" stepper with ‹ › arrows instead of an 8-wide wrap).
2. The two-pane body. Replace the `0.85fr / 1fr` grid with a **50/50** split on
   wide screens and let the editor pane own the height:
   - **Left pane** = mascot + speech bubble + lesson meta + Next button
     (a calm narrative column; mascot `size` drops from 260 to ~200 so it
     stops dominating).
   - **Right pane** = `<LessonEditor>` with the editor and preview given a real
     ratio (see LessonEditor changes).
   - On mobile: single column, **editor pane first** (so the user lands on the
     action), narrative collapsed to the speech bubble + a thin mascot band.

**LessonEditor preview sizing**: replace the fixed `220×220`
`previewWrapStyle` with a responsive preview that fills the pane width up to a
cap and keeps a 1:1 aspect via `aspect-ratio: 1 / 1` (fallback: a square sized
off a `ResizeObserver`-measured width). On desktop the editor well and the
preview sit **side by side** (`grid-template-columns: minmax(0,1fr) min(40%, 320px)`)
so the live result is visible while typing; on mobile they stack (editor over
preview). `RawShaderCanvas`'s internal `ResizeObserver` already handles DPR
resize on container change — no canvas API change needed.

### Progress indicator + persistence

`ProgressBadge.tsx` is the single component for completion state. It renders:

- a compact flat bar (`done/total` fill, `SHADE.gold` on `SHADE.surface3`, 1.5px
  `inkLine` border — no shadow), and
- a label "N of 8 lessons complete" (or "All 8 done — replay any time" when full).

Props: `{ done: number; total: number; variant?: 'bar' | 'inline' }`. The hero
uses `variant="bar"`; the workspace rail uses `variant="inline"` (label only).

**Persistence migration.** In `lessons.ts` (or the extracted `progress.ts`):

```ts
const STORAGE_KEY = 'shaddy.lessons.progress.v1';
const LEGACY_KEY  = 'shade.learn.completed.v1';

export function loadProgress(): Set<string> {
  // read STORAGE_KEY; if absent, read LEGACY_KEY, and if found, write it
  // forward under STORAGE_KEY and remove LEGACY_KEY (one-time migration).
}
```

`loadProgress` reads the new key first; if empty it falls back to the legacy
key, migrates the value forward (writes new key, deletes old), and returns it.
`saveProgress` writes only the new key. Both keep the existing try/catch +
`Array.isArray` guards (`lessons.ts:501-521`) so a corrupt blob degrades to an
empty set. Stored shape is unchanged: a JSON array of completed lesson ids.

### Confetti

`Confetti.tsx` extracted from `Learn.tsx:427-470`. Changes:

- **Flat**: keep the SVG ray-burst (it is already flat strokes, no glow) but
  drive it from a keyframe that lives in the shared sheet. Remove any reliance
  on the per-page injected blob.
- **Reliable re-trigger**: it is re-keyed by `confettiKey` from the parent. Keep
  that, but mount it **once** at the workspace level positioned over the mascot
  stage (a dedicated `position: relative` wrapper) rather than nested inside
  `mascotStageStyle`, so re-mount on a new key always plays. The parent sets
  `confettiKey = Date.now()` in `onCheckResult` on pass (`Learn.tsx:170`) —
  unchanged.
- **Reduced motion**: wrap the burst in a `prefers-reduced-motion: reduce`
  guard (matching `Mascot.css:270-281`). When reduced, render nothing (the
  mascot's mood swap to `cheering` is the celebration) — do not animate.

### Mascot

No code change to `Mascot.tsx` / `Mascot.css`. The only mascot-related work is
positional: smaller `size` in the workspace, and ensuring the confetti wrapper
sits behind/around it without a glow box-shadow. The mascot already honours
reduced motion.

## Implementation tasks

Ordered vertical slices; each is independently testable.

- [ ] **1. Re-key progress + migrate.** In `lessons.ts` change `STORAGE_KEY` to
  `shaddy.lessons.progress.v1`, add `LEGACY_KEY`, and implement the one-time
  forward migration in `loadProgress`. Keep guards. (Optionally move the two
  helpers into a new `learn/progress.ts` and re-export from `lessons.ts` so the
  data file is purely lesson data.) Unit-test load/save/migrate.
- [ ] **2. `ProgressBadge.tsx`.** New component with `bar` / `inline` variants,
  flat styling (no shadow). Swap the hero's inline `progressMeter`
  (`Learn.tsx:350-355`, styles `563-592`) for `<ProgressBadge variant="bar">`.
  Component-test the "N of 8" / "all done" copy.
- [ ] **3. Adopt the shared style layer.** Replace `useLearnChrome`'s
  `style.textContent` blob with the shared keyframe/interaction layer from
  05-library-ui.md. Move `learnFadeUp` + confetti keyframe and the
  `.learn-*` button rules into that layer (or, interim, into a token-free
  keyframe-only blob with all token values inlined on elements). Delete the
  hover `box-shadow` lifts. `useLearnChrome` keeps only body bg/color set +
  restore.
- [ ] **4. Extract `LessonRail.tsx`.** Move `LessonRail` out of `Learn.tsx`; add
  the mobile compact stepper (‹ Lesson 3 / 8 ›). Buttons use the shared flat
  interaction styles. Component-test pill active/done states + reset.
- [ ] **5. Extract `LearnHero.tsx` and `LearnWorkspace.tsx`.** Move `Hero` and
  `Workspace` into their own files; `Learn.tsx` becomes the orchestrator. No
  behaviour change beyond the new layout grid (50/50, smaller mascot).
- [ ] **6. Rework `LessonEditor` preview.** Replace the fixed 220×220 preview
  with a responsive square; on desktop put the editor well and preview
  side-by-side, on mobile stacked. Verify `RawShaderCanvas` resizes correctly
  via its `ResizeObserver`.
- [ ] **7. `Confetti.tsx`.** Extract, mount once at workspace level over the
  mascot stage, drive from the shared keyframe, add the
  `prefers-reduced-motion` guard (render nothing when reduced). Verify
  re-trigger fires on each pass.
- [ ] **8. Cleanup pass.** Remove now-dead style constants from `Learn.tsx`
  (`progressMeter*`, the old `columnsStyle` ratio, `mascotStageStyle` confetti
  nesting). Run the eslint boundary check; confirm no deep imports were
  introduced.

## Testing

Vitest 2.1 + @testing-library/react + jsdom; use the existing mock
renderer/editor harness so tests don't need WebGL/CodeMirror.

- **Progress (unit).** `loadProgress` returns `new Set()` when both keys are
  empty; reads `shaddy.lessons.progress.v1` when present; **migrates** from
  `shade.learn.completed.v1` (asserts the new key is written, legacy key
  removed, returned set matches); survives a corrupt blob (returns empty).
  `saveProgress` writes only the new key.
- **ProgressBadge (component).** Renders "3 of 8 lessons complete" for
  `done=3,total=8`; renders the all-done copy at `done=8`; bar fill width
  proportional; no `box-shadow` in computed style.
- **LessonRail (component).** Renders 8 pills; active pill marked; done pills
  show `✓`; clicking a pill calls `onSelect(idx)`; reset calls
  `onResetProgress`. Mobile variant renders the ‹ N / 8 › stepper and the
  arrows call `onSelect`.
- **Learn flow (component, mocked renderer).** Mount `Learn`, click Start →
  workspace appears; stub a lesson `check` to return `{ pass: true }`, click
  Check → mascot mood becomes `cheering`, the lesson id is persisted under the
  new key, the progress badge increments, and `<Confetti>` mounts. Click Check
  on a failing stub → mood `thinking`, hint shown, no progress change.
- **Confetti (component).** With `matchMedia('(prefers-reduced-motion: reduce)')`
  mocked truthy, `<Confetti>` renders nothing; otherwise it renders the SVG
  burst. Re-keying remounts it.
- **No-token-blob regression.** Assert `useLearnChrome` no longer injects a
  `<style>` whose `textContent` contains a `box-shadow` hover rule (guards the
  flat-design requirement and the stale-token fix).

## Risks & open questions

- **Coupling to 05-library-ui.md.** This spec depends on that spec's shared
  style layer existing. If it is not ready, ship the interim token-free
  keyframe-only `useLearnChrome` (no token interpolation in selectors) and
  retrofit the shared layer in a follow-up. Either way the
  `style.textContent`-stale-token problem is gone.
- **Preview compile cost while typing.** Side-by-side preview recompiles on
  every `source` change via `RawShaderCanvas`'s `useMemo(source)` debounce
  (`RawShaderCanvas.tsx:88-94`). That behaviour is unchanged; if it feels janky
  on slow machines we can add a short debounce, but that is out of scope here.
- **Migration timing.** A user who completed lessons on the old key and returns
  after deploy must keep their progress — covered by the one-time forward
  migration in task 1. Open question: do we also keep writing the legacy key for
  one release as a safety net? Decision: no — the migration is read-once and the
  data is non-critical (re-doable lessons), so a clean cut is fine.
- **Mascot size on very small phones.** A 200px mascot plus editor-first layout
  may still crowd a 320px viewport; verify and, if needed, drop the workspace
  mascot to a thin band on the smallest breakpoint (the mobile layout already
  collapses the narrative column).

## Dependencies

- **05-library-ui.md** — owns the shared token/keyframe/interaction-style layer
  this spec consumes (the replacement for the per-page `style.textContent`
  blob and the font `<link>` injection). Hard dependency for the non-interim
  path of task 3.
- **00-overview.md** — initiative context.
- No backend, auth, or gallery dependency: progress is local-only (does not need
  02-backend-srv-dev-01.md or the auth work). No external setup.
- **CONTRACTS.md**: no boundary change — all new files live under
  `design/pages/learn/` and only import `@/ux` and `@/renderer` (via the
  unchanged `RawShaderCanvas`) plus sibling design modules through their public
  surface. If task 5's extraction ever needs to import a new design submodule
  past its `index.ts`, that is a bug — keep imports at the public surface.

## Done when

- [ ] Progress persists under `shaddy.lessons.progress.v1`; a user with the old
  `shade.learn.completed.v1` key keeps their completed lessons after first load,
  and the legacy key is removed.
- [ ] A single, clear "N of 8 lessons complete" indicator is visible in both the
  hero and the workspace, and updates immediately when a lesson is passed.
- [ ] `useLearnChrome` no longer injects a `<style>` whose `textContent`
  interpolates SHADE tokens into selector rules; keyframes/interaction styles
  come from the shared layer (or a token-free interim keyframe sheet). No hover
  `box-shadow` lifts remain on any Learn button.
- [ ] The editor/preview split shows a usefully-sized live preview (responsive
  square, side-by-side with the editor on desktop, stacked on mobile); the
  mascot no longer dominates the column.
- [ ] Passing a lesson triggers a flat confetti burst that fires on every pass
  and renders nothing under `prefers-reduced-motion`.
- [ ] Lesson data (`lessons.ts` lesson bodies/prompts/hints/checks) is byte-for-byte
  unchanged except the progress-helper storage key.
- [ ] All new/updated Vitest suites pass; eslint boundary check is clean.
