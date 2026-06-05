# Gallery — publish + browse frontend

> Turns the static `/gallery` showcase into a live, account-backed gallery: publish your work, browse what others made, like it, and remix it. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

Today `/gallery` is a self-contained page that maps over a hardcoded array of 14 `CURATED_RECIPES` (`web/src/design/pages/gallery/recipes.ts`) and renders each as a live `MiniRecipeCanvas` tile whose only CTA is "Open in composer". There is no backend, no accounts, no publishing, no likes, and no detail view.

This spec replaces the hardcoded data source with a typed API client that talks to the FastAPI service on `srv-dev-01` (see `02-backend-srv-dev-01.md`), and builds the full browse/publish/detail/profile surface on top of it. The 14 curated recipes stop being a local file — they are seeded server-side under an official `shaddy` account and arrive through the same list endpoint as everything else.

New work, in order of dependency:
1. A new **`web/src/api/` module** (`@/api`) — typed fetch wrappers that attach the Supabase JWT on writes. Requires a CONTRACTS.md + `eslint.config.js` update in the same PR.
2. Rewrite **`Gallery.tsx`** to be API-driven: PNG thumbnails, mode/tag filter chips, search box, sort (recent/liked/trending), cursor-based infinite scroll.
3. New **detail page `/s/:id`** — live `MiniRecipeCanvas`, like button, "Open in composer" remix that stamps `remixed_from`, report button, remix-lineage display.
4. **Publish modal** wired into the existing "Publish to gallery" button in `Properties.tsx` — title/description/tags, thumbnail captured via `renderer.snapshot()`, sign-in gate via `useAuth`.
5. New **author profile page `/u/:handle`**.
6. New routes wired into `web/src/integration/main.tsx`.

## Goals

- A `@/api` client module that is the single seam to the backend, attaches `Authorization: Bearer <supabase-jwt>` on every write, and never deep-imports another track.
- `/gallery` lists published shaders from the API with filters (mode + tags), a search box, three sort orders, and cursor pagination via infinite scroll — using static server-served PNG thumbnails for the grid.
- `/s/:id` shows one shader live (`MiniRecipeCanvas`), supports like/unlike, "Open in composer" remixing with attribution, reporting, and shows "remixed from X" lineage.
- A publish modal that captures a thumbnail from the renderer, posts title/description/tags + the encoded recipe, and gates behind Supabase sign-in.
- `/u/:handle` profile pages listing an author's published shaders and like count.
- All new routes lazy-loaded and registered in `main.tsx`.

## Non-goals

- The backend itself (schema, endpoints, JWT verification, thumbnail storage, seeding) — owned by `02-backend-srv-dev-01.md`. This spec consumes its contract.
- Migrating the auth internals from OIDC/PKCE to `@supabase/supabase-js` — owned by `01-auth-supabase.md`. This spec depends on `useAuth`/`getAccessToken` keeping their current signatures.
- The inspector canvas-param cleanup (tempo removal, real export resolution, `WEBGL · OK` / `v0.4.2` strings) — owned by the polish spec. This spec only *adds* a publish handler to the existing button and reads the recipe; it does not touch the Tempo/Output rows.
- Comments, follows, collections, moderation queues. Reports are fire-and-forget to the backend; soft-delete is author-only via a single endpoint.

## Current state

(Every path/line verified by reading the file.)

- **`web/src/design/pages/Gallery.tsx`** (708 lines). `Gallery` (line 421) is the default export. It calls `useGalleryChrome()` (line 34, injects fonts/keyframes/body bg), filters `CURATED_RECIPES` in-memory via `matches()` (line 139) over `ModeFilter` (`'all' | ShaderTemplate`, line 136) and `TaxFilter` (`'all' | 'featured' | 'recent'`, line 137), and renders `RecipeTile` (line 255). `openInComposer` (line 443) clones the recipe with fresh ids (`cloneRecipeWithFreshIds`), calls `useCardsStore.getState().setRecipe(fresh)`, and `navigate('/design')`. Reusable atoms already in this file: `Eyebrow` (151), `Chip` (169), `ModeBadge` (220), `ArrowGlyph` (408), `EmptyState` (639), `BackGlyph` (696). Tokens come from `../tokens` (`SHADE`, `TYPE`).
- **`web/src/design/pages/gallery/recipes.ts`** (256 lines). Exports `CuratedRecipe` (line 22: `{ id, title, tag, author, recipe, featured?, recent? }`) and `CURATED_RECIPES` (line 82) — 14 entries, 11×`recipe2d` + 3×`recipe3d`, each built via `mk(type, overrides)` (line 39) from `CARD_LIBRARY`. **This file is deleted** at the end of this spec; the 14 recipes move to the backend seed.
- **`web/src/design/pages/gallery/MiniRecipeCanvas.tsx`** (163 lines). `MiniRecipeCanvas({ recipe, autoOrbit?, style?, className? })` — self-contained `createRenderer()` instance, `compile(recipe)` (line 49), DPR-aware resize, slow 3D auto-orbit. Reused as-is for `/s/:id` and the publish-modal preview. Note it does **not** currently expose the renderer instance to the parent — the publish flow needs `snapshot()`, addressed in the design below.
- **`web/src/design/recipe-url.ts`** (62 lines). `encodeRecipeToHash(recipe)` (38), `decodeRecipeFromHash(hash)` (45), `recipeShareUrl(recipe)` (60). `serialisable()` (29) strips media data-URLs and live element refs. The API stores the *full Recipe JSON* (jsonb), but we reuse `serialisable()` from here to strip non-portable media before POSTing. Already imported across `design/` (`DesktopApp.tsx`, `components.tsx`).
- **`web/src/design/Properties.tsx`** — `GlobalProps` (line 1593) renders the Canvas-tab global panel. The "Publish to gallery" `<button>` is at lines 1660-1670 inside the `Share` section (header at 1658) and currently has **no `onClick`**. (The Tempo section 1604-1623, the hardcoded `3840×2160` at 1654, and the `WEBGL · OK` / `v0.4.2` footer at 1682-1683 are the polish spec's problem — leave them.)
- **`web/src/cards/state.ts`** — `useCardsStore` (line 286), `setRecipe` (line 406), `CardsState.recipe` (line 150). `useCardsStore.getState().recipe` is the live recipe to publish; `setRecipe(cloneRecipeWithFreshIds(recipe))` is how we load a remix.
- **`web/src/auth/`** — public surface `index.ts`: `useAuth` (returns `{ user, accessToken, isAuthenticated, isLoading, signIn, signOut }`, see `useAuth.ts`), `getAccessToken(): Promise<string | null>` (`oidc.ts:292`, refreshes within 60s of expiry), `getUser()`, `signIn()`, `SignInButton`. `AuthUser.sub` is the canonical user id (becomes the Supabase `user.id` uuid after the auth migration). **This surface stays stable** — we import only from `@/auth`.
- **`web/src/integration/main.tsx`** (89 lines). Route table at lines 73-84; lazy pages via `lazyOrSoon` (31) with a `ComingSoon` fallback. `Gallery` is lazy-loaded at line 39. New routes get added here.
- **`web/eslint.config.js`** — enforces module boundaries. `design/` block (lines 100-109) forbids deep sibling imports and `@/integration`. There is **no `@/api` rule yet** and no `src/api/**` files block — both must be added.
- **`web/vite.config.ts`** line 193: `'@'` aliases to `./src`, so a new `web/src/api/` folder is importable as `@/api` with no config change.

## Design

### 1. New module: `web/src/api/` (`@/api`)

**Decision: a new top-level module, not a `design/` subdir.** Rationale: the client is consumed by `design/` pages today, but it is conceptually a leaf seam (like `shared/`) that any future module could call. Putting it under `design/` would forbid `cards`/`ux` from ever using it and would bury a network boundary inside the composer track. A sibling module with its own `index.ts` matches the CONTRACTS.md pattern exactly.

**CONTRACTS.md + eslint update required in the same PR** (per the "Changing this file" rule):
- Add a `## 6. API ↔ design/integration` section documenting the public surface below.
- `web/eslint.config.js`: add a `src/api/**` files block making `api/` a near-leaf — it may import `@/cards` (entry, for `Recipe` types) and `@/auth` (entry, for the token) and `@/shared`, but **must not** import `@/renderer`, `@/ux`, `@/design`, or `@/integration`. Add `@/api` to the list of entries `design/` is allowed to import (it already may, since the design block only `deepSibling`-restricts named modules; confirm `@/api` is not accidentally caught — it is not, because no rule names it).

Public surface (`web/src/api/index.ts`):

```ts
// web/src/api/index.ts — DO NOT IMPORT ANYTHING ELSE FROM api/
export type GalleryMode = '2d' | '3d';
export type GallerySort = 'recent' | 'liked' | 'trending';

export type GalleryAuthor = {
  id: string;          // supabase uuid
  handle: string;      // url-safe, unique; 'shaddy' for the official account
  displayName: string;
  avatarUrl: string | null;
};

export type GalleryListItem = {
  id: string;          // short slug used in /s/:id
  title: string;
  description: string;
  tags: string[];
  mode: GalleryMode;
  thumbnailUrl: string;   // absolute https URL to the PNG on srv-dev-01
  author: GalleryAuthor;
  likeCount: number;
  likedByMe: boolean;     // false when signed out
  cardCount: number;
  featured: boolean;
  createdAt: string;      // ISO
};

export type GalleryDetail = GalleryListItem & {
  recipe: Recipe;                 // full jsonb, ready for setRecipe()
  remixedFrom: {                  // null for originals
    id: string; title: string; author: GalleryAuthor;
  } | null;
  remixCount: number;
};

export type GalleryPage = {
  items: GalleryListItem[];
  nextCursor: string | null;      // opaque; pass back to fetch the next page
};

export type ListParams = {
  mode?: GalleryMode;
  tags?: string[];                // AND-match
  q?: string;                     // search title/description/tags
  sort?: GallerySort;             // default 'recent'
  cursor?: string | null;
  limit?: number;                 // default 24
};

export type PublishInput = {
  title: string;
  description: string;
  tags: string[];
  mode: GalleryMode;
  recipe: Recipe;                 // caller passes the live recipe; client strips media
  thumbnailDataUrl: string;       // from renderer.snapshot()
  remixedFromId?: string;         // set when publishing a remix
};

export type ApiError = { status: number; message: string };

// reads — public, no token
export function listGallery(p: ListParams): Promise<GalleryPage>;
export function getGalleryItem(id: string): Promise<GalleryDetail>;
export function listByAuthor(handle: string, p?: Omit<ListParams, 'q'>): Promise<GalleryPage>;
export function getAuthor(handle: string): Promise<GalleryAuthor & { shaderCount: number; totalLikes: number }>;

// writes — attach JWT
export function publish(input: PublishInput): Promise<{ id: string }>;
export function like(id: string): Promise<{ likeCount: number }>;
export function unlike(id: string): Promise<{ likeCount: number }>;
export function report(id: string, reason: string): Promise<void>;
export function softDelete(id: string): Promise<void>;       // author-only

export const isApiError: (e: unknown) => e is ApiError;
```

Internals (not exported past `index.ts`):
- `client.ts` — a `request()` helper. Base URL from `import.meta.env.VITE_API_BASE_URL ?? 'https://api.shaddy.dev'` (matches the Cloudflare Tunnel origin; localhost dev points at `http://localhost:8000`). On writes it `await getAccessToken()` from `@/auth`; if null it throws `ApiError{ status: 401 }` so callers can trigger the sign-in gate. Sets `Content-Type: application/json`. Non-2xx → throws `ApiError` with the server's `{ message }`.
- `serialize.ts` — wraps `serialisable()` logic. **Important:** `recipe-url.ts`'s `serialisable()` lives in `design/`, which `api/` may not import. So `api/serialize.ts` re-implements the media-strip (it is ~15 lines, copying `stripMedia` from `recipe-url.ts`) OR — cleaner — the shared `stripMedia`/`serialisable` pair moves to `web/src/shared/recipe-serialize.ts` (types-only-plus-pure-fn is borderline, but `shared/` already allows pure helpers per its README's spirit; if the owner objects, duplicate the 15 lines in `api/`). **Default: duplicate in `api/serialize.ts`** to avoid touching `shared/`'s "no behavior" rule. The recipe is re-validated server-side regardless.

The publish payload sends `serialisable(recipe)` as `recipe` and the data-URL PNG as `thumbnailDataUrl`; the backend decodes the PNG to a file and returns its URL.

### 2. `Gallery.tsx` rewrite (API-driven grid)

Keep all the chrome/atoms (`useGalleryChrome`, `Eyebrow`, `Chip`, `ModeBadge`, `EmptyState`, glyphs) — they are presentation and the user wants presentation preserved. Replace the data layer:

- **State:** `mode: GalleryMode | 'all'`, `tags: string[]` (multi-select chips), `q: string` (search box, debounced 300ms), `sort: GallerySort`, plus a paged-list reducer holding `items`, `cursor`, `loading`, `error`, `reachedEnd`.
- **Fetch:** a `useGalleryFeed(params)` hook in `Gallery.tsx` (local, not exported) that calls `listGallery` from `@/api`. Any change to `mode | tags | q | sort` resets the list and refetches page 1. An `IntersectionObserver` sentinel at the bottom of the grid fetches the next page via `nextCursor` until `reachedEnd`.
- **Thumbnails:** the grid tile renders `<img src={item.thumbnailUrl}>` (static PNG) instead of `MiniRecipeCanvas`. This is the speed win — a grid of 24 live WebGL contexts is the current bug. Keep the existing tile chrome (border, shadow, hover lift, `ModeBadge`, featured ribbon). The whole tile is now a `<Link to={`/s/${item.id}`}>`; the hover CTA changes from "Open in composer" to "View" (opening the detail page), since remixing now happens on the detail page where the recipe is loaded.
- **Filter chips:** mode chips (`all` / `2d` / `3d`) drive `mode`. Tag chips are populated from a small fixed taxonomy returned by the backend (or a hardcoded starter list: `gradient`, `noise`, `fractal`, `glitch`, `3d`, `pattern`, `generative`) and toggle membership in `tags`. The old `featured`/`recent` taxonomy chips are replaced by the **sort** control (`recent` / `liked` / `trending`) rendered as a segmented control next to the search box; `featured` becomes a tag-style chip that maps to `sort=trending` + a featured-only flag, or simply a tag.
- **Search box:** a text input in the hero, debounced, sets `q`. Empty `q` lists everything.
- **Counts:** the in-memory `counts` memo (Gallery.tsx:432) is removed — counts now come from the server or are dropped from the chips (chips without counts are fine; the `Chip` atom already makes `count` optional).
- **Empty/error/loading:** reuse `EmptyState` for "no results"; add a thin skeleton (gray tiles) for the first page load and an inline retry row for `error`.

### 3. Detail page `/s/:id` (`web/src/design/pages/GalleryDetail.tsx`)

- Reads `:id` from the route, `getGalleryItem(id)` on mount. While loading, skeleton; on 404, a "this shader was removed or never existed" state with a link back to `/gallery`.
- **Live render:** `MiniRecipeCanvas recipe={detail.recipe}` at large size (respect `detail.mode` for the 3D orbit). This is the one place we pay for live WebGL.
- **Like button:** heart + `likeCount`. Optimistic toggle calling `like`/`unlike` from `@/api`; on `ApiError{status:401}` open the sign-in gate (call `useAuth().signIn()`). Reflect `likedByMe`.
- **"Open in composer" (remix):** clones `detail.recipe` with `cloneRecipeWithFreshIds`, `useCardsStore.getState().setRecipe(fresh)`, then `navigate('/design')`. To stamp lineage, stash the source id in a module-level `pendingRemix` ref exported from `@/api` (or in `sessionStorage` under `shaddy.remix.from`) so that when the user later opens the publish modal, `remixedFromId` is prefilled. Simpler and explicit: store `{ remixedFromId: detail.id }` in `sessionStorage`; the publish modal reads-and-clears it.
- **Report:** a small "Report" link → a one-field reason prompt → `report(id, reason)`. Gated by sign-in like the others; on success show a "thanks, we'll look" toast.
- **Remix lineage:** if `detail.remixedFrom`, render a "Remixed from [title] by [author]" line linking to `/s/:remixedFrom.id`. Show `remixCount` ("N remixes") as read-only meta.
- **Author + share:** author chip links to `/u/:handle`. A "Copy link" button copies `window.location.origin + '/s/' + id`. Optionally a "Copy composer link" that uses `recipeShareUrl(detail.recipe)` (the hash format) for a backend-free share — reuse `recipeShareUrl` from `../recipe-url`.

This page lives in `design/` (it composes `@/cards`, `@/renderer` via `MiniRecipeCanvas`, `@/api`, `@/auth`) and reuses `useGalleryChrome`-style chrome. Factor the font/keyframe/body-bg effect out of `Gallery.tsx` into `web/src/design/pages/gallery/chrome.ts` so both pages share it.

### 4. Publish modal (`web/src/design/pages/gallery/PublishModal.tsx`)

- Triggered by the existing button in `Properties.tsx` (lines 1660-1670). Add an `onClick` that opens the modal (lift open-state into `GlobalProps` or a tiny zustand/`useState` + portal). The modal is rendered by `design/` so it can read `useCardsStore.getState().recipe` and the renderer.
- **Sign-in gate:** on open, if `!useAuth().isAuthenticated`, show a "Sign in to publish" panel with a button calling `signIn()` (which redirects to Supabase; on return the user re-clicks publish). If authenticated, show the form.
- **Form fields:** `title` (required, ≤80 chars), `description` (≤280), `tags` (chip input, max 6, lowercased, from/free-form against the taxonomy), and a read-only `mode` derived from `recipe.mode ?? '2d'`.
- **Thumbnail capture:** the modal needs a PNG. The live composer canvas is `RecipeCanvas` in `DesktopApp.tsx`, which owns a `RendererAPI` (`DesktopApp.tsx:2299` keeps a `validatorRef`/renderer ref). Cleanest path: render a hidden `MiniRecipeCanvas` in the modal at 512×512 with `autoOrbit={false}` and a fixed 3D camera, then call its renderer's `snapshot()`. **`MiniRecipeCanvas` must expose its renderer** — add an optional `onReady?(api: Pick<RendererAPI,'snapshot'>)` callback prop (or a forwarded `ref`) that fires after mount. The modal waits one frame after compile, calls `snapshot()`, and shows the resulting data-URL as a preview the user can re-capture. (Alternative: have `DesktopApp` pass its existing renderer's `snapshot` down via context; the hidden-canvas approach is self-contained and avoids threading through the composer.)
- **Submit:** `publish({ title, description, tags, mode, recipe: useCardsStore.getState().recipe, thumbnailDataUrl, remixedFromId })`. `remixedFromId` read-and-cleared from `sessionStorage['shaddy.remix.from']`. On success, `navigate('/s/' + id)`. On `ApiError{401}`, fall back to the sign-in gate. Show validation + server errors inline.

### 5. Author profile `/u/:handle` (`web/src/design/pages/AuthorProfile.tsx`)

- `getAuthor(handle)` for the header (avatar, displayName, `shaderCount`, `totalLikes`); `listByAuthor(handle, { sort })` for a grid identical to the gallery grid (extract a shared `<GalleryGrid items onLoadMore … />` component into `web/src/design/pages/gallery/GalleryGrid.tsx` so `/gallery`, `/u/:handle` reuse it). The official `shaddy` account (which owns the 14 seeded recipes) is just another profile at `/u/shaddy`.
- If the viewed profile is the signed-in user, each tile gets a "Delete" affordance calling `softDelete(id)` with a confirm.

### 6. Routes (`web/src/integration/main.tsx`)

Add three lazy pages alongside the existing `Gallery`:

```tsx
const GalleryDetail = lazyOrSoon(() => import('@/design/pages/GalleryDetail'));
const AuthorProfile = lazyOrSoon(() => import('@/design/pages/AuthorProfile'));
```
and routes:
```tsx
<Route path="/s/:id" element={<GalleryDetail />} />
<Route path="/u/:handle" element={<AuthorProfile />} />
```
`GalleryDetail` and `AuthorProfile` must default-export their component (the `lazyOrSoon` helper expects `{ default }`). Both read route params via `useParams` from `react-router-dom` (already a dependency).

### Data flow summary

```
publish:  composer recipe ──serialisable──▶ @/api.publish ──JWT──▶ FastAPI ──▶ {id} ──▶ /s/:id
browse:   /gallery ──listGallery──▶ FastAPI ──▶ GalleryPage(items, nextCursor) ──▶ <img thumbnails>
detail:   /s/:id ──getGalleryItem──▶ GalleryDetail{recipe} ──▶ MiniRecipeCanvas (live)
remix:    /s/:id "Open in composer" ──setRecipe(fresh)+sessionStorage(from)──▶ /design ──▶ publish stamps remixed_from
profile:  /u/:handle ──getAuthor + listByAuthor──▶ reused GalleryGrid
seed:     14 curated recipes ──server seed under 'shaddy' account──▶ appear via listGallery (featured)
```

## Implementation tasks

1. [ ] **Create `@/api` module + contracts.** Add `web/src/api/{index.ts,client.ts,serialize.ts}` with the surface above (`listGallery`/`getGalleryItem`/`listByAuthor`/`getAuthor`/`publish`/`like`/`unlike`/`report`/`softDelete`, `isApiError`). `client.ts` `request()` attaches `getAccessToken()` on writes and throws typed `ApiError`. Add `VITE_API_BASE_URL`. Update `CONTRACTS.md` (new §6) and `web/eslint.config.js` (new `src/api/**` block) in the same commit. Unit-test the client with a mocked `fetch`.
2. [ ] **Extract shared gallery pieces.** Move the chrome effect to `web/src/design/pages/gallery/chrome.ts` (`useGalleryChrome`) and extract a reusable `GalleryGrid` + `RecipeTile` (PNG-thumbnail variant) into `web/src/design/pages/gallery/GalleryGrid.tsx`. Keep `Eyebrow`/`Chip`/`ModeBadge`/glyphs exported from a `gallery/atoms.tsx`.
3. [ ] **Rewrite `Gallery.tsx`** to use `useGalleryFeed` + `listGallery`: mode chips, tag chips, debounced search box, `recent/liked/trending` sort segmented control, infinite scroll via `IntersectionObserver`, skeleton + error states. Tiles link to `/s/:id` with `<img>` thumbnails. Remove the `CURATED_RECIPES` import and the `counts` memo.
4. [ ] **Build `/s/:id` detail page** (`GalleryDetail.tsx`, default export): `getGalleryItem`, live `MiniRecipeCanvas`, like/unlike (optimistic + 401 → sign-in), "Open in composer" remix (`setRecipe` + `sessionStorage['shaddy.remix.from']`), report flow, remix-lineage line, author chip, copy-link buttons. Loading/404 states.
5. [ ] **Expose `snapshot()` from `MiniRecipeCanvas`** via an optional `onReady(api)` prop (additive, default behavior unchanged). Verify the existing `/gallery` callers compile without passing it.
6. [ ] **Build the publish modal** (`PublishModal.tsx`): sign-in gate via `useAuth`, form (title/description/tags/derived mode), hidden 512×512 `MiniRecipeCanvas` for `snapshot()`, preview + re-capture, submit via `publish` reading `useCardsStore.getState().recipe` and `sessionStorage` remix source, navigate to `/s/:id`. Wire `onClick` onto the existing Properties.tsx button (lines 1660-1670) — open-state only, no other edits to `GlobalProps`.
7. [ ] **Build `/u/:handle` profile page** (`AuthorProfile.tsx`, default export): header via `getAuthor`, reused `GalleryGrid` via `listByAuthor`, owner-only delete affordance via `softDelete`.
8. [ ] **Wire routes** in `web/src/integration/main.tsx`: lazy `GalleryDetail` + `AuthorProfile`, `<Route path="/s/:id">` and `<Route path="/u/:handle">`.
9. [ ] **Delete `web/src/design/pages/gallery/recipes.ts`** and its test, remove the `CURATED_RECIPES` import from `Gallery.tsx`. Confirm the 14 recipes now arrive from the API seed (coordination point with `02-backend-srv-dev-01.md`'s seed task). Grep for any other importers of `recipes.ts` before deleting.
10. [ ] **Type/lint/build gate:** `npm run lint` (boundary rules), `tsc -b`, `vite build` all green; manually confirm `@/api` is reachable from `design/` and rejected from `cards/`/`renderer/`.

## Testing

Vitest 2.1 + `@testing-library/react` + jsdom; the renderer mock harness (`web/src/renderer/__mocks__/renderer.ts`) covers WebGL-free component tests.

- **`api/client.test.ts`** — mock global `fetch`: reads issue no `Authorization`; writes call `getAccessToken` (mock `@/auth`) and set `Bearer`; null token on a write throws `ApiError{401}`; non-2xx maps to `ApiError` with the server message; `listGallery` round-trips `nextCursor`. Mock `@/auth`'s `getAccessToken`.
- **`api/serialize.test.ts`** — a recipe with a `data:` media param value comes out stripped; structure (cards/passes/mode/aspect) preserved. Mirror the assertions in `recipe-url.test.ts`.
- **`Gallery.test.tsx`** — mock `@/api.listGallery`; assert: initial page renders N tiles with `<img>` thumbnails (not canvases); changing mode/tag/sort refetches with the right params; typing in search debounces then refetches; the `IntersectionObserver` sentinel triggers a second `listGallery` call with `nextCursor`; empty result shows `EmptyState`; rejected promise shows the retry row. Stub `IntersectionObserver`.
- **`GalleryDetail.test.tsx`** — mock `getGalleryItem`; renders a live `MiniRecipeCanvas` (mock renderer); like button optimistic-updates and calls `like`; a `like` rejection with 401 calls `signIn` (mock `useAuth`); "Open in composer" calls `setRecipe` and navigates with `sessionStorage` set; remix-lineage line appears only when `remixedFrom` is non-null.
- **`PublishModal.test.tsx`** — signed-out shows the gate and calls `signIn`; signed-in renders the form; submit calls `publish` with the store recipe + a `thumbnailDataUrl` from the mocked `snapshot()`; title-required validation blocks submit; `remixedFromId` is read from `sessionStorage`. Mock `useAuth`, `@/api`, and `useCardsStore`.
- **`AuthorProfile.test.tsx`** — mock `getAuthor` + `listByAuthor`; header counts render; owner sees delete, non-owner does not; `softDelete` removes the tile.
- **Route smoke** — render `main`'s `Routes` at `/s/x` and `/u/shaddy` behind mocks; assert the right page mounts (covers the lazy wiring + default exports).

## Risks & open questions

- **Backend contract drift.** The `GalleryListItem`/`GalleryDetail`/cursor shapes here are this spec's *proposal*; they must be ratified against `02-backend-srv-dev-01.md`. Lock the JSON shapes jointly before either side ships. Mitigation: the `@/api` types are the single point of change.
- **`serialisable()` duplication.** Re-implementing media-strip in `api/serialize.ts` risks divergence from `recipe-url.ts`. Acceptable for now (15 lines, server re-validates); revisit by promoting the helper to `shared/` if it changes again.
- **Thumbnail timing.** `snapshot()` after a fresh compile can capture a blank/first frame; the modal must wait at least one `requestAnimationFrame` (ideally a couple) post-compile before capturing, and let the user re-capture. 3D recipes need a fixed camera for a representative still.
- **JWT freshness on slow publishes.** `getAccessToken()` refreshes within 60s of expiry, but a user idling in the modal could still 401 at submit. Handle 401 on submit by re-gating, not just erroring.
- **Auth migration coupling.** This spec assumes `useAuth`/`getAccessToken` keep their signatures through the Supabase migration (`01-auth-supabase.md`). If `AuthUser.sub` is no longer the canonical id, `@/api` is unaffected (it only reads the token), but the profile-ownership check (`detail.author.id === user.id`) depends on the post-migration `user.id` being the Supabase uuid.
- **CORS / mixed content.** The API must allow the Vercel origin and `localhost`; thumbnails must be served over the same HTTPS origin so the grid `<img>`s aren't blocked. Owned by the backend spec but verify early.
- **Open: tag taxonomy source.** Hardcode a starter tag list client-side, or fetch a `/tags` endpoint? Default to a hardcoded list for v1; add `/tags` later if it grows.

## Dependencies

- **`02-backend-srv-dev-01.md`** — provides every endpoint (`GET /gallery`, `GET /gallery/:id`, `GET /authors/:handle`, `POST /gallery`, `POST /gallery/:id/like` + `DELETE`, `POST /gallery/:id/report`, `DELETE /gallery/:id`), JWT verification, PNG thumbnail storage/serving, and the **seed of the 14 curated recipes under the `shaddy` account**. Hard blocker for anything past task 1's mocked tests.
- **`01-auth-supabase.md`** — keeps `@/auth`'s public surface (`useAuth`, `getAccessToken`, `signIn`, `SignInButton`) stable while swapping internals to Supabase. The sign-in gate and write-auth depend on it.
- **External setup:** `VITE_API_BASE_URL` env var (Vercel + local), the Cloudflare Tunnel `api.<domain>` reachable with CORS for the Vercel + localhost origins, Supabase project issuing the JWT the API verifies.
- **`00-overview.md`** — initiative context and the polish spec that owns the inspector canvas-param cleanup (Tempo/Output/`v0.4.2`).

## Done when

- [ ] `@/api` exists with the documented surface, attaches the Supabase JWT on all writes, throws typed `ApiError`, and `CONTRACTS.md` + `eslint.config.js` are updated in the same PR (lint enforces that `cards/`/`renderer/` cannot import `@/api` and `design/` can).
- [ ] `/gallery` lists published shaders from the live API with PNG `<img>` thumbnails, mode + tag filters, a debounced search box, `recent/liked/trending` sort, and working cursor-based infinite scroll; empty/loading/error states all render.
- [ ] `/s/:id` renders the shader live via `MiniRecipeCanvas`, supports like/unlike (optimistic, sign-in-gated), "Open in composer" remixing that stamps `remixed_from` on the next publish, report, and shows remix lineage.
- [ ] The "Publish to gallery" button in `Properties.tsx` opens a modal that gates on Supabase sign-in, captures a thumbnail via `renderer.snapshot()`, posts title/description/tags + the media-stripped recipe, and navigates to the new `/s/:id` on success.
- [ ] `/u/:handle` shows an author's published shaders and like totals; `/u/shaddy` shows the 14 seeded curated recipes; owners can soft-delete their own work.
- [ ] All three new routes are lazy-loaded and registered in `main.tsx`; `web/src/design/pages/gallery/recipes.ts` is deleted and no code imports `CURATED_RECIPES`.
- [ ] `npm run lint`, `tsc -b`, and `vite build` are green; the Vitest suites in this spec pass against the mocked API + mock renderer.
