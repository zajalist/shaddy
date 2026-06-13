# Shaddy Editor — UI/UX Overhaul Design

> Date: 2026-05-30
> Status: **Direction approved** (forks resolved). Pending: spec review → phased implementation plans.
> Scope: the `/design` composer editor (shell, palette, canvas, inspector, preview) + a new Object/Scene model and Block Functions. Aesthetic: warm-austere Gaea chrome + colorful Scratch-y blocks.

---

## 1. North star

Shaddy becomes a **scene composer for shaders**: a warm, Scratch-meets-Gaea workshop where a Figma-style infinite canvas holds named **Objects** (sprites/layers), each owning its own top-down block stack (shape → distort → color → effect), all **folded into one shader** by the engine we already have. A calm DCC-style topbar and preview frame the work like a viewport. The left palette scales to thousands of blocks via fuzzy search + recents/favorites/tags + a **⌘K** command palette. Any selected stack can be saved as a parameterized, shareable **Block Function** (UE Material-Function analogue) that drops back into the palette beside built-ins.

The load-bearing insight: **an Object is structurally just a named block sub-chain**, so it reuses the existing per-block blend fold (2D) and `sdSmoothMin` union (3D). Multi-object scenes ship **without a compiler rewrite**. Objects that need their own resolution/feedback get promoted to an existing Buffer pass.

### Aesthetic invariants (carry forward, do not relitigate)
- Warm chrome that **recedes**; color is reserved for content (the category blocks) and live values (amber).
- The recomposed warm panel ladder already in `Properties.tsx` (`DK`): `well #110f0a → sub #181510 → panel #1e1b16 → raised #252017`, amber `value #e6b052`, gold accents. **One source of truth** (`DK` is exported; reused by the preview).
- Rounded, friendly blocks; category colors (shape=blue, distort=pink, color=green, effect=purple). No neon, no starfield.
- Tabbed panels on **both** sides: left `BLOCKS | OBJECTS`, right `BLOCK | CANVAS`.

---

## 2. Reality check — the engine we build on

Today (`web/src/cards/`):

- A **Recipe** is ONE ordered `Card[]` (the image pass) + optional Buffer passes A–D, dispatched by `mode: '2d' | '3d'` (`cards/types.ts`).
- **2D** compiles a single linear chain threading one global accumulator `vec2 uv, float d, vec3 col`; each card mutates these; per-card `alpha`/`blendMode` wrap the body and blend against `_prev_col/_prev_d` (the per-card fold) — `cards/compile.ts`.
- **3D** compiles one `sdScene(p)` that unions every card's `sdfExpr` via `sdSmoothMin(d, expr, k)`; material is **global, last-card-wins**.
- **Buffer passes A–D** each compile as an independent sub-recipe to their own FBO (A→B→C→D→Image), sampled via `sample_buffer_*` cards with ping-pong feedback (`compileMultiPass`, consumed by `RecipeCanvas.tsx:93`).
- **No per-object state** in either mode. **No** transform/blend layer, depth/occlusion, or per-surface material beyond the global.
- Palette ≈ 177 cards, fixed category→subgroup trees, brittle in-order-substring `fuzzyScore` (`components.tsx:~504-514`); no recents/favorites/tags/keyboard-add. The `⌘K` hint at `components.tsx:~707` is **dead** (unwired).
- Block canvas is **non-transformable flex rows** split by portal markers (`DesktopApp.tsx:~2153-2271`). Pan/zoom exists **only** in the fullscreen preview (`DesktopApp.tsx:~1196-1448`: wrapper-div transform, scale 0.25–8, wheel-to-cursor, middle/space drag).
- Persistence is **URL-fragment only** (no localStorage/accounts).

### Two-compiler decision (resolved)
A parallel rebuild lives at `web/src/compiler/` (`recipe.blocks`, ~1,646 lines, well-tested; spec: `docs/superpowers/specs/2026-05-23-compiler-rework.md`). It is **not wired into the app** — only its own tests reference it. **Decision: build all of this on the live `cards/` engine** (`recipe.cards`). The `compiler/` rework stays parked.

**Mitigation for a future swap:** keep the Object/Function model as a *thin state-layer + small compile hooks* expressed in compiler-agnostic terms where practical, so that if the `compiler/` swap ever happens, the Object/Function layer ports cleanly (it is mostly UI/state + `cloneRecipeWithFreshIds`, not codegen).

---

## 3. Design principles

1. **Smallest engine change** that unlocks the goal — Objects fold into ONE shader; Functions expand into plain cards. No compiler rewrite for v1.
2. **Reuse proven code** — fullscreen transform → block canvas; `cloneRecipeWithFreshIds` → Objects & Functions; existing blend/union fold → Object compositing.
3. **Augment, don't replace** — the palette category spine stays; tags/recents/favorites/ranking are added on top.
4. **Correctness over cleverness** — solo/hide = recompile with the object excluded (alpha-0 is wrong for SDF subtract/intersect; a uniform branch leaves dead SDF terms in smooth-unions).
5. **Type the scene** — a scene is one mode (2D or 3D) in v1; cross-mode mixing is an explicit render-to-layer phase. Never let the UI silently produce no-op unions or compile errors.

---

## 4. Phased plan (build order + effort)

| Phase | Subsystem | Effort | Depends on |
|---|---|---|---|
| **1 — Chrome & navigability** | Topbar redesign | S | — |
| | Preview header + viewport polish | S | — |
| | Palette: fzf search + recents/favorites + tags | M | — |
| | ⌘K command palette | M | palette search |
| **2 — Spatial canvas** | Figma pan/zoom on the block canvas | L | — |
| **3 — Object model (heart)** | Object/Layer fold + left `OBJECTS` tab + solo/hide recompile | XL | spatial canvas |
| | Object → Buffer-pass promotion | M | object model |
| **4 — Reuse & fidelity** | Block Functions (macros) | L | palette search |
| | Per-object 3D materials | L | object model |
| | Cross-mode render-to-layer (2D↔3D mixing) | L | object model |

**v1 cut for the Object model: same-mode native composition** (2D blend layers, or one real 3D shared-world scene with occlusion). Cross-mode 2D↔3D mixing (render-to-layer) is Phase 4.

Phases 1 & 2 are independent visible wins and can land first. Phase 3 is the architectural heart; Phase 4 builds reuse/fidelity on top.

---

## 5. Subsystem designs

### 5.1 Topbar redesign (Phase 1, S)
Rebuild `TopBar` (`components.tsx:~38-139`). Replace the starfield fill with warm parchment + a hairline divider; no neon.
- **Left:** Shaddy wordmark · editable recipe name/breadcrumb (inline rename) · `2D/3D` mode badge.
- **Center:** quiet segmented nav (Compose / Library / Learn / Gallery / Docs), de-emphasized to underline-on-active.
- **Right:** primary actions only — **Share** (gold) and **Sign in**. Collapse secondary tools (Photo→blocks, Paste GLSL) into a single **Import** menu.
- Keep every existing handler (`openPhoto`/`photoBtnRef`, share, signin). Pure chrome — no model change.

### 5.2 Preview header + viewport polish (Phase 1, S)
Redesign the 30px header (currently `record dot · Preview · {tempo} bpm · {blocks} blocks` + lone fullscreen button) into a calm DCC scene strip:
- **Left:** render/record dot + `PREVIEW`.
- **Right cluster:** aspect selector (replacing the static overlay `TogglePill`), fps readout, play/pause, fullscreen, camera-reset (3D).
- **Consolidate** the floating overlay pills (aspect, 60fps) into the header so the stage stays clean. Reuse `DK`/`SHADE` tokens. (The tall-hero stage + letterbox already shipped.)

### 5.3 Palette at scale (Phase 1, M)
The left panel becomes **tabbed**: `BLOCKS` (today's palette) and `OBJECTS` (§5.6 list). The `BLOCKS` tab:
- **Ranking:** replace `fuzzyScore` with fzf/Fuse-style subsequence scoring — contiguity + word-boundary/start bonus + acronym match + recency/frequency boost + favorite boost. Match over `name + id + tags + aliases`. **Stable category tie-break** so results feel deterministic.
- **Recents:** localStorage MRU ring (~12), pinned at top when the query is empty.
- **Favorites:** star → a pinned Favorites group.
- **Tags:** add `tags?: string[]` to `CardDef`; seed cross-cutting tags (noise / polar / fractal / retro / lighting / mouse / feedback). Tag filter chips cut across the shape/distort/color/effect spine. **Keep the category spine** as orientation (augment, don't replace).
- **Keyboard:** Enter/click appends the top result; drag still works. A "search all" spans the 2D+3D pools.

### 5.4 ⌘K command palette (Phase 1, M)
Wire the dead `⌘K` hint. A global modal (Cmd/Ctrl+K):
- **Add blocks** (reusing the §5.3 ranked search), routed through the object-aware insert (§5.6).
- **Actions:** toggle 2D/3D, jump category, add Object, save Function, fit canvas, etc.
- **Keys:** ↑/↓ navigate, Enter inserts at selection/end, Tab cycles category, number keys jump to favorites. Blender-F3 analogue.
- **Quick win:** even before the full palette, make ⌘K focus the palette search.

### 5.5 Figma-style pan/zoom block canvas (Phase 2, L)
Generalize the **proven fullscreen transform** (`DesktopApp.tsx:~1196-1448`) onto the block canvas:
- **Surface model:** one absolutely-positioned surface div, `transform: translate()scale()`, camera `{x,y,scale}` in one store, imperative rAF-batched writes via `will-change`, scale clamp ~0.05–8. Blocks stay **real DOM in world coords**.
- **Gestures:** middle-drag, space+left-drag, **and right-drag to pan** (explicit ask); wheel **zoom-to-cursor** (reuse the documented anchor math). `Shift+1` fit-all, `Shift+2` fit-selection, `0`→100%, `R` reset.
- **Left-drag** stays for marquee select / block drag with slot-snapping to chain connectors (insertion caret).
- **Scale:** viewport culling + a sub-0.3-scale LOD placeholder; optional minimap once Objects make scenes large.
- **Critical:** transform a **wrapper**, never the WebGL canvas element (the fullscreen code does this deliberately so the `ResizeObserver` doesn't resize the GL buffer). The port must preserve this.

### 5.6 Object / Layer model (Phase 3, XL) — the heart

**Data model** (compiler-agnostic state layer, in `cards/types.ts`):
```ts
type SetOp2D = BlendMode;                 // reuse existing 2D blend modes
type SetOp3D = 'union' | 'smoothUnion' | 'subtract' | 'intersect';

interface SceneObject {
  id: string;
  name: string;
  visible: boolean;        // hide = exclude from the fold (recompile)
  solo: boolean;           // solo = render only soloed objects (recompile)
  op: SetOp2D | SetOp3D;   // how this object composites with the one below
  opacityOrK: number;      // 2D: opacity; 3D: pairwise smooth-union k
  stack: Card[];           // the object's own block sub-chain
}

interface Scene {          // the "Stage" (Scratch) — shared, global
  mode: '2d' | '3d';       // scene is typed; objects must match (v1)
  objects: SceneObject[];  // fold order = list order
  camera; lighting; background; globalPost;  // shared blocks/drivers
}
```
A `Recipe` gains a `scene: Scene` (objects). **Back-compat:** a legacy single-`cards[]` recipe is a Scene with one Object named "Object 1".

**Compile / fold semantics** (no codegen rewrite — reuse existing per-card fold):
- **2D:** each visible object's `stack` produces a `vec4`; objects are composited bottom→top via the **existing `blendMode`/`alpha` fold** (`op`/`opacityOrK`). An Object is just a named sub-chain run inside the existing chain wrap.
- **3D:** each visible object's SDF combines via the **existing `sdSmoothMin`** / set-ops (`op` selects union/smoothUnion/subtract/intersect, `opacityOrK` = pairwise `k`). All objects share one raymarch → **real occlusion**, shared camera/lighting.
- **Reuse** `cloneRecipeWithFreshIds` for object duplication and for legacy migration.

**Solo / hide = recompile** (debounced + cached). Excluding the object from the fold is the only correct option (alpha-0 still carves SDF geometry; a uniform branch leaves dead terms in smooth-unions).

**Reorder semantics:** fold order = list order. **Warn in the UI** that reordering *commutative* ops (add / union) is a visible no-op, while *non-commutative* ops (over / subtract / intersect) are order-sensitive — group/label them so reorder never looks "broken."

**Scene typing:** a scene is one `mode`; objects must match it (v1). Mixing 2D+3D is the Phase-4 render-to-layer path (§5.9). The Object list must **prevent** adding an off-mode object (or offer "render-to-layer" when that ships).

**UI — the `OBJECTS` left tab (the spine):**
- Reorderable rows: each row = object with name, **eye** (hide), **solo** dot, op selector, drag handle.
- Selecting a row scopes the **block canvas** to that object's `stack` (regardless of which left tab is showing).
- Add Object (`+`), duplicate, delete; pairwise-`k`/opacity control between neighbor rows.
- The right inspector's `CANVAS` tab becomes the **Scene** inspector (shared camera/lighting/background/global-post).

### 5.7 Object → Buffer-pass promotion (Phase 3, M)
"Promote to pass" on an Object moves its `stack` into an existing Buffer pass (A–D) writing to an FBO, composited back via the existing `sample_buffer_*` card. Reuses the **whole** existing multipass machinery; only the UI affordance + object→pass mapping are new. This is the escape hatch for objects needing their own resolution/blur/feedback, and keeps the fused fold cheap for the common case. (Caps at 4 passes — surface that limit.)

### 5.8 Block Functions — UE material-function macros (Phase 4, L)
**Data model** (`cards/types.ts`):
```ts
interface FnInput { key; label; type; range?; targets: { cardId; paramKey }[]; }  // one knob → many inner params
interface BlockFunctionDef {
  id; type: `fn_${string}`; version: string; name; icon; category; author;
  body: Card[]; inputs: FnInput[];
}
```
**Lifecycle:**
- **Make Function:** multi-select a chain → dialog to check which params to expose, rename, set ranges → saves `v1.0.0`. It **registers as a synthetic `CardDef`** so palette/adapter/search/icons treat it like a built-in (appears beside built-ins; community installs land under a **Community** group).
- **Instantiate = expand-on-instantiate:** clone `body` with `cloneRecipeWithFreshIds`, seed exposed-input values onto their `targets`. **The compiler sees plain cards → zero codegen change.** URL-share/clone handle macros transparently.
- **Instance UX (Material-Instance feel):** shows only exposed inputs; **Unpack** explodes it back into raw cards. Editing the def opens an isolated mini-composer and **bumps version**; instances pin `type@version` with an "update available" affordance (remap-by-key).
- **v1:** single-output, flat (no nesting), local + URL only. Real community store deferred (§7).

### 5.9 Phase-4 fidelity items
- **Per-object 3D material:** `sdScene` returns `(d, matId)`; shading looks up the owning Object's material instead of one global `g_material`. Unlocks distinct surfaces per 3D object (multi-object 3D looks monochrome until this lands — set expectations or pull forward for 3D-heavy users).
- **Cross-mode render-to-layer (2D↔3D mixing):** the unified layer model — same-mode neighbors compose natively (§5.6); crossing a 2D↔3D boundary auto-inserts a render-to-layer composite (the off-mode object renders to a buffer pass, composited as a 2D layer). Reuses §5.7 machinery. This is what makes "2D + 3D together" real.

### 5.10 QoL (ongoing)
Undo/redo polish, duplicate, multi-select batch edit, alignment, comments/annotations on the canvas, a clear stable sort control on the palette (so recency-boost never feels arbitrary).

---

## 6. Data-model changes (summary, `cards/types.ts`)
- `CardDef.tags?: string[]` (+ seeded tags).
- `SceneObject`, `Scene`; `Recipe.scene` (back-compat: legacy `cards[]` → one Object).
- `BlockFunctionDef`, `FnInput`; synthetic-`CardDef` registration path.
- No `CompiledShader`/uniform contract changes for v1 (Objects fold into the existing chain; Functions expand to cards).

---

## 7. Risks & mitigations
1. **Two compilers** → resolved: build on `cards/`; keep Object/Function as a portable state-layer for an eventual `compiler/` swap.
2. **Recompile jank** on solo/hide/reorder → debounce + cache the fragment build; only structural changes recompile (param values still push as uniforms).
3. **Reorder confusion** (commutative ops look no-op) → group/label ops; show order arrows only where order matters.
4. **2D/3D mixing footguns** → type the scene; block off-mode adds until render-to-layer ships.
5. **Monochrome 3D** until per-object material (§5.9) → set expectations or pull §5.9 forward for 3D users.
6. **Canvas transform vs WebGL sizing** → transform a wrapper, never the GL canvas (preserve the fullscreen pattern).
7. **Function versioning** → instances pin `type@version` + "update available"; don't cut versioning or edited defs silently diverge.
8. **Non-deterministic ranking** → stable category tie-break + visible sort.
9. **No real persistence** (URL-only) → "community" = export/import JSON in v1; a real store/accounts is a prerequisite for true sharing (deferred).

---

## 8. Deferred / open
- `compiler/` (`recipe.blocks`) migration — separate project; its Animation system + cleaner model may be worth adopting later.
- Accounts + a real store for community Functions/Objects (URL/JSON only for now).
- Nested Block Functions; multi-output Functions; true GLSL-function emission (optimization for high instance counts).
- Mixed-mode beyond render-to-layer (e.g. 2D objects projected into a 3D scene).

---

## 9. Aesthetic mockups (to produce during Phase 1)
Localhost static mockups (the established workflow) for: the topbar, the preview header, the `BLOCKS|OBJECTS` tabbed left panel, and the `OBJECTS` row design — reviewed before implementing each.
