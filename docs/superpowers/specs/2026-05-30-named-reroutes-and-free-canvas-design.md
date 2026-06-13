# Named Reroutes + Free-Move Canvas — Design

Date: 2026-05-30
Status: approved (forks locked via grilling)

## Problem

The chain editor laid blocks into auto-arranged **rows** split on `portal`
marker cards, with cross-chain connections drawn as bezier **wires** and two
chunky **end-cap buttons** (`+card`, `+portal`). The user rejected all three:
no wires/"edge loops", no chunky buttons, and **no row organization at all**.

The user wants, instead:

1. **Free-move puzzle blocks** — every block lives at its own `(x, y)`; you
   drag any block anywhere; blocks snap edge-to-edge into stacks when dropped
   near each other; dragging a block carries everything snapped after it.
2. **Named reroutes** (Unreal-style) replace wires. A `+` *declares* a named
   reroute that taps a stack's output; you drop *usages* of it anywhere by
   finding the name in ⌘K or the left palette. No wires ever cross the canvas.

## Locked decisions

- **Reroute look:** *Bold name banner.* Same puzzle-block silhouette (so it
  still snaps), a reserved accent color used by no block category, the NAME
  set large across it, and a portal-arrow glyph. Declaration = filled accent
  with `⤺`; usage = outline accent with `⤻`. Flat, no glow.
- **Declare trigger:** *Both.* A faint `+` fades in just past a stack's last
  block on hover → click spawns a reroute declaration with its name field
  focused. Right-click any block → context menu → "Capture as reroute"
  (menu also holds Duplicate / Lock (F) / Delete).
- **Snapping:** *Free + snap when near (~16px).* Drop a block; if its edge
  lands near another block's notch/tab it snaps into that stack, else it
  floats alone. Dragging a block carries the blocks snapped after it.

## Data model

`recipe.cards` stays **one linear array** = compile order = "the long line
chain". Two new library cards, special-cased in the compiler exactly like the
existing zero-GLSL `portal` marker:

- `reroute_decl` — params: `{ name: text }`. Compiles to `vec3 rr_<name> = col;`
  (taps the running colour, passes it through unchanged).
- `reroute_use` — params: `{ ref: text }`. A **source** card: compiles to
  `col = rr_<ref>;` (starts a line from the named tap, ignoring prior input).

`<name>`/`<ref>` are sanitized to a valid GLSL identifier (`[A-Za-z0-9_]`,
non-leading-digit) and prefixed `rr_`. Because the array is linear, a decl is
always emitted before its uses → the variable is in scope. A use whose ref has
no matching decl earlier compiles to `col = vec3(0.0);` with a diagnostic.

Requires a new `ParamDef` kind **`text`** (free string), since the existing
union (`float|color|select|image|video|buffer`) has none. `glslTypeForParam`
treats `text` as compile-only (no uniform emitted — the value is inlined as a
GLSL identifier, never a uniform).

Per-block canvas position is **UI state** (a `Record<cardId, {x,y}>` in the
editor), not recipe state, for v1. (Persisting positions into the shared
recipe is a follow-up.)

## Compile semantics

`emitTypedCard` special-cases the two types before the normal snippet path
(mirrors the `portal` special-case at compile.ts:518):

- `reroute_decl`: emit body `vec3 rr_<id> = col;` where `<id>` = sanitized
  name. Deterministic → round-trips through `reparse` (body matches
  `Span.expectedBody`, same as portal).
- `reroute_use`: emit body `col = rr_<id>;`.

No change to the field-threading model, multi-pass, or 3D. Output/preview keeps
reusing the existing hover-select + F-lock (`previewUpToId`).

## Palette + ⌘K (dynamic usage entries)

One dynamic entry per declared reroute name is injected into the same
`BLOCK_LIB`-derived lists both surfaces read:

- A `getRerouteBlocks(recipe)` helper scans `recipe.cards` for `reroute_decl`
  cards and returns a synthetic `BlockDef[]` (one per unique name) under a
  reserved **"Reroutes"** group, label = the name, accent = reserved color.
- Selecting one inserts a `reroute_use` card with `ref` = that name (and calls
  `pushRecent`). Search ranks them via `scoreBlock` (name is the block name).

The static `+ reroute` (declaration) also appears as a normal library card so
it's insertable from the palette, in addition to the hover-`+`/right-click.

## Canvas + snapping (DesktopApp `Chain` → free field)

- Remove the row/portal-split model (`pieces`, `rowSegs`, `segPos`,
  `isPortalCard` splitting). Each card renders at `pos[card.id]`.
- A **stack** = a maximal run of cards adjacent in the array whose successive
  positions are snapped (a per-card `snappedToPrev` flag derived on drop).
- **Drag:** moving a block moves it and every block snapped after it. On drop,
  if the block's left edge is within ~16px of another block's right tab (and
  not already its neighbor), reorder it (and its trailing snapped run) to
  directly follow that block in the array and mark it snapped; else it floats
  (`snappedToPrev=false`) at the drop point.
- **Variants:** within a snapped run, interior edges render `notch`/`tab`; run
  ends render `flat`. Floating singletons are `flat`/`flat`.
- **Reroute render:** `reroute_decl`/`reroute_use` use the bold-name-banner
  styling in Block.tsx (reserved accent, large name, `⤺`/`⤻`).
- **Affordances:** hover a stack → faint `+` past its tail → declare reroute
  capturing that stack. Right-click a block → context menu (Capture as
  reroute / Duplicate / Lock / Delete).

## Phasing

1. **Engine** — `text` ParamDef, `reroute_decl`/`reroute_use` cards, compile
   special-casing, registry; tests (library/compile/reparse round-trip).
2. **Reroute visual** — bold-name-banner in Block.tsx.
3. **Palette/⌘K** — dynamic usage entries by name.
4. **Free canvas** — per-block positions, snapping, drag-carries-run.
5. **Declare affordances** — hover-`+` and right-click menu.

## Testing

- `library.test.ts`: both types registered, `lookupCardDef` resolves them.
- `compile.test.ts`: decl emits `rr_<id> = col`, use emits `col = rr_<id>`,
  unknown-ref use emits the safe fallback + diagnostic.
- `reparse.test.ts`: a recipe with decl+use round-trips (no wildcard drift).
- Live: insert via palette, name a reroute, drop a usage by name from ⌘K,
  drag/snap blocks, verify preview updates and the shader renders.
