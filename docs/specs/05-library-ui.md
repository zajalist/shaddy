# Library page — UI overhaul

> Restructure and re-skin the `/library` shader encyclopedia — shared style tokens, responsive layout, a cleaner sticky TOC, real (debounced, URL-reflected) search, and a decomposed `Diagram` module — without touching a single sentence of educational content. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

`/library` is the long-form "everything about shaders" encyclopedia: a hero with a search box, a sticky left TOC, and ~34 articles across 7 groups, each mixing prose, code snippets, and hand-drawn SVG diagrams. It works and reads well, but its implementation has three structural problems:

1. **Inline-`CSSProperties` sprawl.** Every visual decision is a one-off object literal scattered across `Library.tsx`, `Article.tsx`, `CodeSnippet.tsx`, `TOC.tsx`, and `Diagram.tsx`. There is no shared type scale, spacing scale, or surface-card token, so "make the card border consistent" means editing five files and guessing the magic numbers (`borderRadius: 10`, `boxShadow: 0 3px 0 ${SHADE.inkLine}`, `1.5px solid ${SHADE.inkLine}` repeated ~20 times).
2. **Fake search.** The hero owns a `query` string that is lowercased and matched with `String.includes` against article *titles only* (`Library.tsx:712-718`). No body-text matching, no debouncing, no URL state — reload and your search and scroll position are gone.
3. **A 1,175-line `Diagram.tsx` monolith** holding 31 SVG components plus a 33-arm `switch`. Adding or fixing one diagram means scrolling a giant file; the `kind` union and the `switch` can silently drift.

This spec extracts a `library/style.ts` token + primitive layer, makes the layout responsive with one source of truth for the breakpoint, rebuilds the TOC sticky/active behaviour, adds debounced search over **title + body text** with the query and active anchor reflected in the URL via `useSearchParams`, and splits `Diagram.tsx` into per-diagram modules behind a registry. All flat, no glow. **Content (every `<P>`, `<Strong>`, code string, and caption) is preserved byte-for-byte.**

## Goals

- Extract a shared visual layer (`library/style.ts`) with a type scale, spacing scale, surface-card style, and the repeated "ink card" recipe — and migrate every inline style to it.
- Make the two-column layout genuinely responsive (not just a hard 768px desktop/mobile fork): the article column should breathe on wide screens and the TOC should never crush the prose.
- Rebuild the sticky TOC so the active-section highlight is reliable, the scroll-spy survives filtering, and clicking an entry updates the URL anchor.
- Replace the title-only `String.includes` filter with **debounced** search over article title **and** body text, and reflect the query (`?q=`) and active anchor (`#id`) in the URL so a link is shareable and survives reload.
- Break `Diagram.tsx` into per-diagram files behind a typed registry, keeping the `Diagram` public component and `DiagramKind` union stable.
- Keep it FLAT/minimal — no glow, no halos, no box-shadow blooms (reuse the existing `0 3px 0` hard-offset shadow language only).

## Non-goals

- **No content changes.** Article copy, code strings, captions, group/article ordering, and IDs are frozen. A diff that changes any `<P>`/`<Strong>`/`CODE_*`/`caption` text is out of scope and should fail review.
- No new diagrams, no redrawn diagrams (pure file moves + a registry; pixel output identical).
- No full-text search index / fuzzy ranking library — a debounced substring match over title + extracted body text is enough.
- No changes to `/learn`, `/gallery`, `/docs`, or `/landing` (those are separate polish specs). Shared tokens we extract live under `design/pages/library/`, not in the global `tokens.ts`, unless a token is obviously app-wide (see Risks).
- No routing-shape change: `/library` stays a single `BrowserRouter` route (`integration/main.tsx:77`); we only read/write its search params + hash.

## Current state

Verified by reading the files:

- **`web/src/design/pages/Library.tsx`** (1,565 lines). Holds: font/keyframe injection (`useLibraryChrome`, lines 36-69); tiny styled atoms `P`/`Inline`/`Strong`/`Table` with inline styles (lines 73-144); the `GROUPS` article registry (lines 158-237, 7 groups, `ARTICLE_COUNT` = 34 at line 239); ~50 top-level `CODE_*` template strings (lines 243-592); the `Hero` component with a fully inline-styled search box (lines 596-701); the `Library` page (lines 705-1504) which owns `query` state, builds `visibleIds` by **title-only** `includes` (lines 712-718), and wraps each article in a `lib-article-hidden` div (`wrapArt`, lines 727-731); and `BodyLayout` (lines 1509-1562) which hard-forks on `useIsMobile()` — mobile = `<details>` drawer + flat TOC, desktop = `display:flex; gap:36` sticky sidebar + `<main maxWidth:900>`.
- **`web/src/design/pages/library/Diagram.tsx`** (1,175 lines). `DiagramKind` union of 31 kinds (lines 18-49); a `wrap`/`cap` style pair (lines 59-76); a `C` colour-alias object re-typing every `SHADE.*` to `string` (lines 82-98); 31 self-contained SVG renderer components (`Pipeline`, `GpuGrid`, `UvGrid`, … `Plasma`, lines 104-1127); and the `Diagram` router with a 31-case `switch` (lines 1131-1173). Each renderer hardcodes `fontFamily="Geist Mono"`/`"Bricolage Grotesque"`, `strokeWidth={STROKE}` (=1.5), and palette colours. Several embed raw hex arrays (e.g. `VoronoiF1F2` line 1034).
- **`web/src/design/pages/library/TOC.tsx`** (180 lines). Sticky `<aside width:240>` desktop / flat mobile (`isMobile` fork, lines 82-103). Active-section detection via one `IntersectionObserver` with `rootMargin:'-80px 0px -70% 0px'` (lines 34-67). Filters entries by `filter` substring on title (lines 71-78). Clicking an entry calls `preventDefault` + `scrollIntoView({behavior:'smooth'})` + `history.replaceState(null,'','#id')` (lines 161-169) — note it bypasses React Router.
- **`web/src/design/pages/library/Article.tsx`** (77 lines). `<section data-article-id>` with eyebrow + chunky underline + heading + body; all inline styles (`scrollMarginTop:96` at line 26 is the magic offset the scroll-spy depends on).
- **`web/src/design/pages/library/CodeSnippet.tsx`** (73 lines). Dark `SHADE.surface4` `<pre>`; GLSL delegates to `GlslHighlight` from `../../GlslHighlight`; same `0 3px 0` ink card.
- **`web/src/design/tokens.ts`**: `SHADE` (surfaces, ink, text, category colours `catShape/catDistort/catColor/catEffect`, `gold/ember/cream`), `TYPE` (`body`/`display` = Bricolage, `bodyMono` = Geist Mono, `trackTight/trackTighter/trackEyebrow`), and an **already-existing `RHYTHM` scale** (`xs:6, s:10, m:14, l:20, xl:32, xxl:48`, lines 131-138) that the Library currently ignores.
- **`web/src/design/useIsMobile.ts`**: `MOBILE_BREAKPOINT = 768`, resize-listener hook. The only responsive primitive in play.
- **`web/src/index.css`**: Tailwind import + scrollbar styling + two `@keyframes`. No Library-specific CSS (the page injects its own `<style>` at runtime).
- **Routing**: `integration/main.tsx:71-86` uses `BrowserRouter` from `react-router-dom`; `/library` is one lazy route (line 77). `useSearchParams`/`useNavigate`/`useLocation` are available (already used in `Gallery.tsx`, `docs/Sidebar.tsx`, `auth/AuthCallback.tsx`).
- **Module boundary**: `CONTRACTS.md:267-271` — `design/` may compose every other module's public `index.ts`; ESLint forbids deep-imports past a sibling's `index.ts`. The `library/` folder is internal to `design/pages/`, so intra-folder imports are fine and need no CONTRACTS change.

## Design

### 1. Shared style layer — `web/src/design/pages/library/style.ts`

A single module exporting the tokens + style recipes the whole `library/` folder consumes. It builds **on top of** `SHADE`/`TYPE`/`RHYTHM` (does not duplicate colours).

```ts
import { SHADE, TYPE, RHYTHM } from '../../tokens';
import type { CSSProperties } from 'react';

// Type scale — names map to the sizes already in use across the page.
export const LIB_TYPE = {
  display:  { fontFamily: TYPE.display, fontWeight: 700, letterSpacing: TYPE.trackTight },
  h1:       { fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.02 },   // hero
  h2:       { fontSize: 30, lineHeight: 1.1 },                          // article heading
  body:     { fontSize: 16, lineHeight: 1.7, letterSpacing: '-0.005em', fontFamily: TYPE.body },
  bodySm:   { fontSize: 13.5 },                                         // tables
  eyebrow:  { fontFamily: TYPE.bodyMono, fontSize: 10.5, fontWeight: 600,
              letterSpacing: TYPE.trackEyebrow, textTransform: 'uppercase' as const },
  caption:  { fontFamily: TYPE.bodyMono, fontSize: 11.5, letterSpacing: '0.04em' },
  mono:     { fontFamily: TYPE.bodyMono },
} satisfies Record<string, CSSProperties>;

// Spacing — alias RHYTHM so call sites read intent, not raw px.
export const SPACE = RHYTHM;            // xs6 s10 m14 l20 xl32 xxl48
export const BLOCK_GAP = 18;            // the recurring vertical gap between cards

// The single "ink card" recipe repeated ~20× inline today.
export const inkCard = (overrides?: CSSProperties): CSSProperties => ({
  background: SHADE.surface1,
  border: `1.5px solid ${SHADE.inkLine}`,
  borderRadius: 10,
  boxShadow: `0 3px 0 ${SHADE.inkLine}`,   // FLAT hard-offset — the only shadow allowed
  ...overrides,
});

// Diagram-specific colour aliases (moves the `C` object out of Diagram.tsx).
export const DIA = {
  ink: SHADE.inkLine, shape: SHADE.catShape, distort: SHADE.catDistort,
  color: SHADE.catColor, effect: SHADE.catEffect, gold: SHADE.gold,
  ember: SHADE.ember, cream: SHADE.cream, text: SHADE.text,
  textDim: SHADE.textDim, textFaint: SHADE.textFaint,
  surface1: SHADE.surface1, surface2: SHADE.surface2,
  surface3: SHADE.surface3, border: SHADE.border,
} as Record<string, string>;

export const DIA_STROKE = 1.5;
export const DIA_FONT_MONO = 'Geist Mono';
export const DIA_FONT_DISPLAY = 'Bricolage Grotesque';

export const fontLink = '…';  // the FONTS_HREF string, moved here
```

Every magic number that appears 2+ times (`1.5px ink`, `0 3px 0` shadow, `borderRadius:10`, `Geist Mono`, `STROKE=1.5`, `scrollMarginTop:96`) gets a name here. No new colour values are invented.

### 2. Responsive layout — `web/src/design/pages/library/Layout.tsx`

Replace `BodyLayout` with a small CSS-grid shell driven by **container width**, not a binary mobile flag:

- Desktop (≥ ~960px): `grid-template-columns: 240px minmax(0, 1fr)` with `max-width: 1240px` centred, `column-gap: 36px`. The article column gets `max-width: 72ch` (replaces the hard `maxWidth:900`) so line length stays readable on ultra-wide screens; the grid track absorbs the slack.
- Narrow (< ~960px): collapse to a single column; the TOC becomes the top-of-page `<details>` drawer (keep the existing affordance from `Library.tsx:1520-1544`).
- Keep `useIsMobile()` (768px) **only** for the touch-target sizing inside the TOC (the `minHeight:36`/`fontSize:14` branch in `TOC.tsx:129-133`); the layout fork itself moves to the ~960px content breakpoint so the article never gets squeezed in the 768–960 band where the sidebar still fits but the prose is starved. Export a `LIBRARY_LAYOUT_BREAKPOINT = 960` constant from `Layout.tsx`.

Implementation detail: use a real CSS class injected once (extend the existing `useLibraryChrome` `<style>` block, or add a tiny rule to `index.css`) rather than a JS resize fork for the grid, so it reflows without a React re-render. The `<details>` drawer stays JS-gated on the 960 breakpoint via a `useMediaQuery('(max-width: 959px)')` helper (thin wrapper over `matchMedia`, colocated in `library/`).

### 3. TOC rebuild — `web/src/design/pages/library/TOC.tsx`

Keep the public `TOCProps` (`groups`, `filter`) but add `activeId` lifting and URL wiring:

- **Scroll-spy:** keep the single `IntersectionObserver` approach but (a) re-create the observer when the visible set changes (filtering hides articles via `display:none`, which makes them stop intersecting — current observer is created once at mount with `[]` deps at `TOC.tsx:67`, so after a filter the spy can point at a hidden article). Add `filter` (or a `visibleIds` signature) to the effect deps. (b) Move the `-80px`/`-70%` rootMargin and the `scrollMarginTop:96` offset into named constants in `style.ts` so they stay in sync.
- **Click → URL:** replace the raw `history.replaceState` (`TOC.tsx:167`) with a callback prop `onNavigate(id)` that the page implements via `setSearchParams` / `navigate(\`?${params}#${id}\`, { replace: true })`. The smooth-scroll stays.
- **Active highlight from URL on mount:** if the page loads with `#id`, set it active and `scrollIntoView` after first paint (respect `prefers-reduced-motion`: `behavior: motionOK ? 'smooth' : 'auto'`).
- Pull the sticky/flat style fork into `style.ts` helpers (`tocAsideDesktop`, `tocAsideDrawer`).

### 4. Real search — `web/src/design/pages/library/useLibrarySearch.ts`

A hook that owns query + URL + debounce, replacing the `useState('')` + `useMemo` in `Library.tsx:707-718`:

```ts
export function useLibrarySearch(searchText: Record<string, string>) {
  // searchText: articleId -> concatenated lowercased searchable text
  const [params, setParams] = useSearchParams();
  const urlQ = params.get('q') ?? '';
  const [raw, setRaw] = useState(urlQ);          // immediate input value
  const debounced = useDebounced(raw, 180);      // 180ms debounce
  // write debounced query back to ?q= (replace history, drop empty)
  useEffect(() => { …setParams(next, { replace: true })… }, [debounced]);
  const q = debounced.trim().toLowerCase();
  const visibleIds = useMemo(() => {
    const s = new Set<string>();
    for (const [id, text] of Object.entries(searchText))
      if (q === '' || text.includes(q)) s.add(id);
    return s;
  }, [q, searchText]);
  return { raw, setRaw, q, visibleIds };
}
```

- **Searchable text source:** matching on titles only is too thin (searching "ping-pong" or "Schlick" finds nothing today). Build a static `SEARCH_TEXT: Record<string, string>` map at module scope: `id -> (title + " " + plain-text body + " " + code-string keywords).toLowerCase()`. Generate it once from the article registry. Because the body is JSX, the cleanest approach is to **co-locate a short `keywords` string with each article's metadata** in the registry (a curated 1-line list of terms per article: e.g. `"schlick fresnel grazing reflection f0"`) rather than scraping rendered DOM. This keeps it deterministic, testable, and avoids re-rendering hidden DOM. Title still always matches.
- **Debounce:** a 5-line `useDebounced(value, ms)` hook (colocated). 180ms.
- **URL reflection:** `?q=foo` round-trips — typing updates the URL (debounced, `replace:true` so back-button isn't spammed); loading `/library?q=foo` pre-fills the box and pre-filters. Empty query removes the param.
- The page still applies `lib-article-hidden` via `visibleIds` (unchanged mechanism, so anchors + observer keep working); the "no matches" empty state in the TOC (`TOC.tsx:147-154`) is preserved, and the article column shows a matching empty-state line when `visibleIds.size === 0`.

### 5. Diagram decomposition — `web/src/design/pages/library/diagrams/`

Split the monolith without changing rendered output:

```
library/diagrams/
  index.ts            // export { Diagram, type DiagramKind } — the public surface
  registry.ts         // DIAGRAMS: Record<DiagramKind, () => ReactNode>
  frame.tsx           // <figure> + inkCard wrap + <figcaption> (was Diagram's return + wrap/cap)
  shared.ts           // DIA colours, DIA_STROKE, fonts, small svg helpers (re-export from style.ts)
  fundamentals.tsx    // Pipeline, GpuGrid, UvGrid
  math.tsx            // TrigWave, DotProduct, SmoothstepCurve, NoiseStack, FbmOctaves
  sdf.tsx             // SdfRings, SdfPrimitives2D/3D, SdfBoolean, SdfSmoothUnion, DomainRepeat, Raymarch
  lighting.tsx        // Lambert, FresnelCurve, AoSamples
  color.tsx           // GammaCurve, TonemapCurves, CosinePalette, HsvWheel
  fractals.tsx        // Mandelbrot, Julia, BurningShip, IfsTriangle
  recipes.tsx         // VoronoiF1F2, DomainWarp, ReactionDiffusion, Plasma
```

- `registry.ts` maps each `DiagramKind` to its component. The `Diagram` component becomes: look up `DIAGRAMS[kind]`, render inside `frame`. The 31-arm `switch` disappears.
- **Exhaustiveness:** type `DIAGRAMS` as `Record<DiagramKind, ...>` so TypeScript fails the build if a kind is added to the union without a registry entry — fixing the silent-drift risk the `switch`'s `default: null` hides today.
- `Diagram.tsx` becomes a 3-line re-export shim (`export * from './diagrams'`) so existing imports (`Library.tsx:26`) keep working through the migration, then call sites are repointed to `./diagrams` and the shim deleted in the final slice.
- The `IfsTriangle` and `ReactionDiffusion` renderers use `Math.random()` / a seeded LCG — preserve exactly (they are decorative; snapshot tests must tolerate the random one — see Testing).

### 6. Atoms extraction — `web/src/design/pages/library/atoms.tsx`

Move `P`, `Inline`, `Strong`, `Table` out of `Library.tsx` (lines 73-144) into `atoms.tsx`, restyled via `style.ts`. Article bodies in `Library.tsx` keep importing them by the same names, so the giant JSX body is otherwise untouched (critical for the "no content change" guarantee — the article JSX moves not at all in this slice).

### Resulting file map

```
design/pages/
  Library.tsx                 // page shell: registry + article JSX + wiring (much thinner)
  library/
    style.ts                  // NEW — tokens, type/space scale, inkCard, DIA aliases
    atoms.tsx                 // NEW — P / Inline / Strong / Table
    Layout.tsx                // NEW — responsive grid + drawer (was BodyLayout)
    useLibrarySearch.ts       // NEW — query + debounce + URL
    useMediaQuery.ts          // NEW — tiny matchMedia hook
    Article.tsx               // restyled via style.ts (no API change)
    CodeSnippet.tsx           // restyled via style.ts (no API change)
    TOC.tsx                   // rebuilt scroll-spy + onNavigate
    diagrams/                 // NEW — split Diagram.tsx (see §5)
```

No new top-level `design/` module and no cross-module imports change, so **CONTRACTS.md does not need editing**. (If review prefers `style.ts` tokens to live in the app-wide `tokens.ts` instead of under `library/`, that is the only path that would touch a shared surface — call it out in the PR; default is to keep them library-local.)

## Implementation tasks

Ordered so the page renders correctly after every slice (each is independently shippable and testable).

- [ ] **Slice 1 — style layer (no behaviour change).** Add `library/style.ts` with `LIB_TYPE`, `SPACE`, `BLOCK_GAP`, `inkCard`, `DIA`, `DIA_STROKE`, font constants, and the scroll-spy offset constants. Add a Vitest snapshot for `inkCard()` output (locks the FLAT shadow). No call sites change yet.
- [ ] **Slice 2 — atoms.** Create `library/atoms.tsx` (`P`/`Inline`/`Strong`/`Table`) consuming `style.ts`; delete the inline versions in `Library.tsx` and import them. Verify the page renders identically (component test: render `Library`, assert article paragraph text + count unchanged).
- [ ] **Slice 3 — Article + CodeSnippet restyle.** Repoint `Article.tsx` and `CodeSnippet.tsx` to `style.ts` (inkCard, type scale, `scrollMarginTop` constant). No prop changes. Snapshot test both.
- [ ] **Slice 4 — Diagram split.** Create `library/diagrams/` with `frame.tsx`, `registry.ts`, the 7 group files, and `index.ts`. Move all 31 renderers verbatim (only swap `C`→`DIA`, `STROKE`→`DIA_STROKE`, inline font strings → constants). Replace `Diagram.tsx` body with `export * from './diagrams'`. Add the exhaustive `Record<DiagramKind, …>` type. Confirm `pnpm tsc` passes and a render-all-kinds test produces non-null SVG for every kind.
- [ ] **Slice 5 — responsive Layout.** Add `useMediaQuery.ts` and `library/Layout.tsx` (grid + `72ch` column + 960 breakpoint drawer). Swap `BodyLayout` for `Layout` in `Library.tsx`. Inject the grid CSS via `useLibraryChrome`'s `<style>` (or `index.css`). Test: at ≥960 the TOC + main both render; below 960 the `<details>` drawer renders.
- [ ] **Slice 6 — search hook + URL.** Add `useDebounced` + `useLibrarySearch.ts`. Add a curated `keywords` field to each entry in the `GROUPS` registry and build `SEARCH_TEXT`. Replace the page's `query`/`visibleIds` with the hook. Wire `?q=` round-trip. Test: typing filters after debounce; `?q=fresnel` pre-filters on load; clearing removes the param.
- [ ] **Slice 7 — TOC scroll-spy + anchor URL.** Add `filter`/`visibleIds` to the observer deps; add `onNavigate(id)` prop; have the page write `#id` (and keep `?q=`) via `setSearchParams`/`navigate`. On mount, honour an incoming `#id` (scroll + active), respecting `prefers-reduced-motion`. Test the deps-rebuild and the reduced-motion branch.
- [ ] **Slice 8 — cleanup.** Repoint all `Diagram` imports to `./diagrams`, delete the `Diagram.tsx` shim. Grep `Library.tsx` for any remaining raw `boxShadow`/`borderRadius:10`/`1.5px solid` literals and route them through `inkCard`/`style.ts`. Final pass: confirm zero content-text diffs vs `main` for all `CODE_*`, `<P>`, `<Strong>`, and `caption` strings (`git diff` review gate).

## Testing

Stack: Vitest 2.1 + `@testing-library/react` + jsdom (mock renderer/editor harness available; the Library page does not touch the renderer so no WebGL mock is needed). Place tests next to the units (`*.test.ts(x)`).

- **`style.test.ts`** — `inkCard()` returns the exact FLAT `0 3px 0 ${SHADE.inkLine}` shadow and `1.5px solid` border; snapshot guards against an accidental glow/blur creeping in.
- **`atoms.test.tsx`** — render `P`/`Inline`/`Strong`/`Table`; assert tags + text pass through.
- **`diagrams/registry.test.tsx`** — iterate `Object.keys(DIAGRAMS)` (or the `DiagramKind` union), render each, assert it produces a non-empty `<svg>`. Type-level: a compile check (or `expectTypeOf`) that `DIAGRAMS` is exhaustive over `DiagramKind`. Exclude/relax the two `Math.random`-based diagrams from strict snapshotting (assert shape, not pixels) — or seed via a test-time `Math.random` stub.
- **`useLibrarySearch.test.tsx`** — wrap in `MemoryRouter`; type into the input, advance fake timers 180ms, assert `visibleIds` narrows and `?q=` is written; mount at `?q=fresnel` and assert only matching IDs are visible and the input is pre-filled; clear and assert the param is removed. Use `vi.useFakeTimers()` for the debounce.
- **`TOC.test.tsx`** — mock `IntersectionObserver`; assert the observer is re-created when `filter`/`visibleIds` changes (capture `disconnect`/`observe` call counts); assert `onNavigate(id)` fires on click; assert `prefers-reduced-motion` (via a `matchMedia` mock) switches `scrollIntoView` to `behavior:'auto'`.
- **`Library.test.tsx`** (page-level) — render under `MemoryRouter`; assert all 34 articles present in the DOM, the TOC lists 7 groups, and a known prose sentence (e.g. "runs once per pixel") is present — the content-preservation regression guard. Assert the responsive layout renders the grid container at desktop width.

## Risks & open questions

- **Content-preservation drift.** The biggest risk is an accidental copy edit during the move. Mitigation: the article JSX in `Library.tsx` is *not* rewritten — only the surrounding shell, atoms, and styles change. Slice 8 includes a `git diff` gate on all text strings. Keep article IDs and order frozen (the TOC, anchors, and the search map all key on them).
- **`keywords` curation vs. true full-text.** Co-locating a curated `keywords` line per article is deterministic and testable but means search quality depends on those terms. Alternative: scrape `textContent` of each hidden article at runtime — rejected because it forces all hidden DOM to mount and is brittle. Open question for review: ship curated keywords now, or also index the `CODE_*` strings (they're already module-scope and easy to fold in)? Recommendation: fold the `CODE_*` strings in (free, high value for searches like "smoothstep" or "schlick").
- **Scroll-spy after filtering.** Hiding articles with `display:none` removes them from the observer. Re-creating the observer on `visibleIds` change fixes the active highlight but causes a brief observer churn; acceptable. Confirm no flph (flash of wrong highlight) by setting active synchronously from the URL hash on filter-clear.
- **960 vs 768 breakpoints.** Introducing a second breakpoint (960 layout, 768 touch sizing) adds a band to reason about. Documented as constants; if review wants one breakpoint, collapse to 768 and accept the squeezed 768–960 prose.
- **Tokens location.** Keeping `style.ts` under `library/` avoids touching the shared `tokens.ts`. If a future spec (learn/landing polish) wants the same `inkCard`, promote it to `tokens.ts` then and update CONTRACTS.md — not in this PR.

## Dependencies

- **None blocking.** This is a self-contained `design/pages/library/` refactor. It does not depend on the backend, auth, or gallery specs.
- Shared with **04-inspector-canvas.md** / other UI-polish specs only in spirit (the "FLAT, no glow, reuse SHADE/TYPE tokens" rule from 00-overview.md); no code coupling. If `inkCard` is later promoted to app-wide tokens, coordinate with whichever polish spec consumes it.
- External setup: none. Uses existing `react-router-dom` (`useSearchParams`/`useNavigate`) already in the bundle (`integration/main.tsx`, `Gallery.tsx`).
- `CONTRACTS.md`: **no change required** (all new files are internal to `design/pages/library/`). Note in the PR description that this was checked.

## Done when

- [ ] `web/src/design/pages/library/style.ts` exists and is the single source for the type scale, spacing, `inkCard`, and diagram colour/stroke/font constants; no `0 3px 0`/`1.5px solid ${SHADE.inkLine}`/`borderRadius: 10` literal is duplicated across the library files.
- [ ] `Diagram.tsx` is gone (or a deleted shim); `library/diagrams/` holds per-group files + an exhaustive `Record<DiagramKind, …>` registry; adding a `DiagramKind` without a renderer fails `tsc`.
- [ ] The layout is a responsive grid: TOC + `≤72ch` article column on wide screens, single-column `<details>` drawer below 960px; the article column never collapses to a one-word ribbon.
- [ ] Search is debounced (180ms), matches article **title + body keywords + code**, and reflects state in the URL: typing updates `?q=`, `/library?q=fresnel` pre-filters and pre-fills, clearing removes the param, and the active TOC entry writes `#id` (with `?q=` preserved).
- [ ] Clicking a TOC entry smooth-scrolls (auto under `prefers-reduced-motion`), highlights, and updates the URL anchor; loading with `#id` scrolls there; the scroll-spy stays correct after filtering.
- [ ] All 34 articles, 7 groups, every `CODE_*` string, every `<P>`/`<Strong>`, and every diagram caption are byte-for-byte unchanged vs `main` (verified by diff).
- [ ] Page is visually FLAT — no glow, blur, or bloom shadows introduced; only the existing `0 3px 0` hard-offset card shadow is used.
- [ ] Vitest suite (`style`, `atoms`, `diagrams/registry`, `useLibrarySearch`, `TOC`, `Library`) passes; `pnpm tsc` is clean.
