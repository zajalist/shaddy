# Landing page — refinement

> Tighten the marketing landing page so it tells the truth, links to the real product surfaces (gallery, docs, repo, sign-in), and stops shipping dead `href="#"` anchors. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

`web/src/design/Landing.tsx` is a single 1,444-line file of inline-styled components. It is visually finished but factually stale: a permanent "Work in progress" badge sits under the hero (line 639), both GitHub links point at the literal `https://github.com` org root (lines 239, 338), and the entire footer is a wall of `<FooterLink>` anchors hard-coded to `href="#"` (lines 1146-1184, 1198-1210). Meanwhile two genuinely shippable surfaces — the `/gallery` route and the `@/auth` `SignInButton` — are under-surfaced: the gallery is mentioned only as a dead footer word, and `SignInButton` renders only on desktop (line 258) and inside the mobile drawer (line 352), never as a first-class hero/CTA affordance.

This spec refines copy and wiring only — no new visual language. It (1) replaces every dummy link with a real destination, (2) removes the WIP disclaimer, (3) adds a primary "Browse the gallery" CTA and guarantees `SignInButton` is always reachable in the nav, (4) fixes the two hard-coded GitHub URLs via one shared constant, and (5) extracts the monolith into a `design/landing/` sub-folder of focused components (Hero, FeatureRow, TemplatesGrid, Footer, LandingNav, etc.) so the file stops being a 1.4k-line wall. The dark `#0b0c0e` / cream-gold flat aesthetic and all existing tokens (`SHADE`, `TYPE` from `design/tokens.ts`) are preserved exactly. No glow.

## Goals

- Every link on the landing page resolves to a real destination (`/gallery`, `/docs`, the GitHub repo, sign-in), with zero `href="#"` anchors remaining.
- Remove the hard-coded "Work in progress" disclaimer (Landing.tsx line 639) and any other copy that reads as unfinished.
- Surface the gallery: a primary "Browse the gallery" CTA in the final call-to-action block and a real "Gallery" nav/footer entry.
- Guarantee `SignInButton` from `@/auth` is reachable on every viewport (desktop nav + mobile drawer already; verify and keep), without changing the auth module's public API.
- Replace the two `https://github.com` literals with a single shared `REPO_URL` constant.
- Optionally (own slice) split `Landing.tsx` into a `web/src/design/landing/` folder of components, re-exporting `Landing` so `integration/main.tsx` imports are untouched.
- Keep the flat `#0b0c0e` cream/gold aesthetic; reuse `SHADE`/`TYPE` tokens; add no glow box-shadows.

## Non-goals

- No redesign of the hero portal, fractal, starfield, or any section's visual treatment — `HeroPortal`, `FractalEntity`, `Starfield`, `ShadeCanvas`, `Block`, `TemplatesShared` are untouched.
- No migration from inline styles to Tailwind classes (the file is deliberately inline-styled; keep that convention).
- No changes to the `@/auth` module internals or public surface — this spec only *consumes* `SignInButton`. (Supabase swap is owned by the auth spec.)
- No new routes in `integration/main.tsx`; `/gallery`, `/docs`, `/library`, `/learn` already exist there (lines 77-80).
- No client-side `<Link>` conversion required — the existing pages link cross-route with plain `href="/route"` anchors (e.g. `Gallery.tsx` line 464 `href="/"`, Landing line 260 `href="/design"`); match that convention.

## Current state

(verified by reading the files)

- **`web/src/design/Landing.tsx`** (1,444 lines, all inline styles). Top-level export is `Landing` (line 1213) which composes, in order: `LandingNav`, `PageTOC`, `Hero`, `SectionShell`/`FeatureRow`×3, `SectionSeparator`, templates `<section>`, `ComposerShowcase`, `CodePanel`, stats `<section>` with `StatsStrip` + `FractalEntity`, `FAQ`, a final CTA `<section>`, and `Footer`.
  - `PAGE_BG = '#0b0c0e'` (line 20); imports `SHADE`, `TYPE`, `blockById` from `./tokens` (line 3) and `SignInButton` from `@/auth` (line 5).
  - **Dead/false content to fix:**
    - Hero "Work in progress" badge — lines 630-640.
    - GitHub anchor `href="https://github.com"` — desktop nav line 239, mobile drawer line 338.
    - `Footer` — `<FooterCol>`/`<FooterLink>` columns at lines 1146-1166; `FooterLink` component hard-codes `href="#"` at line 1201; bottom-row Privacy/Terms `FooterLink`s at lines 1182-1183.
    - Stats strip claim `'0 kb' / 'Runtime install size'` and `'12' / 'Starter templates'` (lines 1042-1043) — copy is fine but should stay consistent with the templates count used elsewhere.
  - **Nav (`LandingNav`, lines 187-358):** desktop renders the GitHub octocat anchor (lines 238-257) then `<SignInButton />` (line 258, desktop-only) then the gold composer button (`href="/design"`, line 260). Mobile renders a hamburger that opens a drawer containing section links + a GitHub anchor + `<SignInButton />` (line 352). Section links: `#how #compose #code #faq` (lines 230-233). No links to `/gallery`, `/docs`, `/library`, `/learn`.
  - **`PageTOC` (lines 458-554):** fixed left TOC, in-page anchors only (`how templates compose code stats faq`). Fine as-is.
  - **Final CTA `<section>` (lines 1409-1439):** one gold button "Open the composer" → `href="/design"`. This is the natural home for a second "Browse the gallery" CTA.
- **`web/src/integration/main.tsx`** routes `/` and `/landing` → `Landing` (lines 74-75); `/design`, `/library`, `/learn`, `/gallery`, `/docs` all exist (lines 76-80); `/auth/callback` → `AuthCallback` (line 83). Lazy pages fall back to `ComingSoon`.
- **`@/auth`** (`web/src/auth/index.ts`): public API exports `AUTH_CONFIG`, `useAuth`, `signIn/signOut/getAccessToken/getUser`, `AuthCallback`, `SignInButton`, `SignInButtonProps`. `SignInButton` (`SignInButton.tsx`) takes an optional `className` prop; signed-out state is a bordered transparent "Sign in" button (lines 54-76), signed-in is an avatar pill + dropdown. Its inline styles are light-themed (`background: '#fff'`, `border: '#d8cfbf'`) — on the dark landing it currently reads as a pale pill, which is acceptable but worth a `className` hook (see Design).
- **`web/src/design/tokens.ts`**: `SHADE` (gold `#D3A13F`, goldDeep `#8A6418`, cream `#FEE7C7`, topbarText `#e8e2d4`, etc.), `TYPE` (`body`, `bodyMono`, `display`, tracking constants), `PANEL`, `blockById`. These are the only tokens the landing should use.
- **`web/src/index.css`**: just Tailwind import + scrollbar + one shake keyframe; the landing injects its own `<style>` keyframes and Google Fonts link via `useLandingChrome` (lines 25-166). No change needed here.
- **`CONTRACTS.md`**: `design/` is the live composer and may import the public `index.ts` of `ux/ cards/ renderer/ auth/ shared/` (lines 10, 267). No deep-imports past a sibling's `index.ts`. A new `design/landing/` *sub-folder* is internal to `design/` and needs no contract change, but `Landing` must keep being importable as `@/design/Landing` (or the import in `main.tsx` updated).

## Design

### 1. Shared constants

Add a small module `web/src/design/landing/constants.ts` (or, if the extraction slice is skipped, a top-of-file block in `Landing.tsx`):

```ts
export const PAGE_BG = '#0b0c0e';
export const REPO_URL = 'https://github.com/<org>/shaddy'; // single source of truth
export const ROUTES = {
  composer: '/design',
  gallery: '/gallery',
  docs: '/docs',
  library: '/library',
  learn: '/learn',
} as const;
```

Replace both `href="https://github.com"` occurrences with `href={REPO_URL}`. The exact repo slug is supplied at implementation time; until known, keep it as `https://github.com/shaddy-app/shaddy` and leave a one-line comment so it is grep-able. Keep `target="_blank" rel="noreferrer"` on both.

### 2. Remove the WIP disclaimer

Delete the hero badge block (Landing.tsx lines 630-640, the `<div>` containing "Work in progress" with the `shadeFadeIn` animation). Nothing downstream depends on it. The hero then ends after the subtitle `<p>` "Learn how GPU shaders actually work." Leave the `shadeFadeIn` keyframe in `useLandingChrome` (it is harmless and may be reused), but it is no longer referenced.

### 3. Surface the gallery + auth

- **Nav section links:** add a "Gallery" entry. Because the gallery is a *route* (not an in-page anchor), it must be a real anchor `href={ROUTES.gallery}`, distinct from the `#how`/`#compose`/`#code`/`#faq` in-page anchors. Add it to both the desktop centred cluster (after the section links, lines 230-233) and the mobile drawer array (lines 314-319). Likewise add a "Docs" entry → `href={ROUTES.docs}`. The in-page anchors stay `#`-prefixed; the route anchors get full paths.
- **`SignInButton` placement:** it already renders on desktop (line 258) and in the mobile drawer (line 352). Keep both. The only refinement: pass a `className` so we can give it a dark-on-dark treatment that matches the nav (the component already forwards `className` to its root button). Add a CSS rule in `useLandingChrome`'s injected `<style>` — e.g. `.landing-signin button { ... }` flat dark pill, cream text, 1px `rgba(255,255,255,0.12)` border, no glow — and render `<SignInButton className="landing-signin" />`. Do **not** modify the auth module.
- **Primary "Browse the gallery" CTA:** in the final CTA `<section>` (lines 1409-1439), keep "Open the composer" as the primary gold button and add a secondary "Browse the gallery" button beside it (`href={ROUTES.gallery}`). Style the secondary as a flat outlined button (transparent bg, `1px solid rgba(255,255,255,0.18)` border, cream text) so the gold composer button stays the single loud accent. Wrap both in a flex row with `gap` and `flexWrap: 'wrap'` for mobile. No glow on either.

### 4. Real footer

Rewrite `Footer` (lines 1129-1187) and `FooterLink` (lines 1198-1210) so every link resolves:

| Column | Links (label → href) |
|---|---|
| Product | Composer → `/design`, Gallery → `/gallery`, Library → `/library` |
| Learn | Docs → `/docs`, Tutorials → `/learn`, Shader basics → `/docs` (anchor to the basics page) |
| Open source | GitHub → `REPO_URL`, Issues → `REPO_URL + '/issues'`, License → `REPO_URL + '/blob/main/LICENSE'` |
| About | (drop the dead "Team/Brand/Contact" column, or repoint Contact → `REPO_URL + '/discussions'`; remove Team/Brand which have no destination) |

Change `FooterLink` to accept `href` (and optional `external`) instead of hard-coding `#`:

```tsx
const FooterLink = ({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) =>
  <a href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} style={{ /* unchanged styles */ }}>{children}</a>;
```

Bottom-row "Privacy"/"Terms" (lines 1182-1183): these have no real pages. Either remove them or point both at `REPO_URL` until legal pages exist. Removing is cleaner — do that; keep only the brand mark + copyright line. Keep the `Starfield` background and brand row visuals untouched.

### 5. Optional extraction (own slice, behaviour-preserving)

Split `Landing.tsx` into `web/src/design/landing/`:

```
design/landing/
  index.tsx          // export { Landing } — composes the sections
  constants.ts       // PAGE_BG, REPO_URL, ROUTES
  chrome.ts          // useLandingChrome, useNavScroll  (the hooks)
  LandingNav.tsx     // nav + mobile drawer + NavLink
  PageTOC.tsx        // fixed left TOC
  Hero.tsx           // hero section
  FeatureRow.tsx     // FeatureRow + SectionShell + the three feature visuals
  ComposerShowcase.tsx
  CodePanel.tsx
  TemplatesGrid.tsx  // TEMPLATES + TemplatesGrid wrapper
  StatsStrip.tsx
  Faq.tsx
  Footer.tsx
  Separator.tsx      // SectionSeparator
```

Rules for the extraction:
- It is a **pure move** — no copy or style changes land in the same commit as the move (do the content fixes in slices 1-4 first, *then* extract; or extract first then fix — but never mix, so review stays trivial).
- Keep all imports going through public entries (`@/auth`, `./tokens`, sibling components like `./Block`, `./TemplatesShared`, `./Starfield`, `./HeroPortal`, `./FractalEntity`, `./ShadeCanvas`, `./icons`, `./useIsMobile`). These are all *within* `design/`, so no CONTRACTS change.
- Re-export so `integration/main.tsx` keeps working. Two options: (a) leave a one-line `web/src/design/Landing.tsx` that does `export { Landing } from './landing';`, or (b) update `main.tsx` line 20 to `import { Landing } from '@/design/landing';`. Prefer (a) — zero churn outside the folder.
- No new ESLint boundary is crossed; `CONTRACTS.md` does **not** need updating for this (the new folder is internal to `design/`). Only update `CONTRACTS.md` if you decide to promote `landing/` to a tracked sub-module — not recommended for this spec.

### Aesthetic guardrails

- Reuse `SHADE.gold` / `SHADE.goldDeep` / `SHADE.cream` / `SHADE.topbarText` and `TYPE.*` — no new color literals except the existing `rgba(...)` overlay families already in the file.
- The gold composer button keeps its existing `boxShadow` (an inset highlight + 2px drop shadow — that is a bevel, not a glow). The new secondary CTA and footer links get **no** box-shadow. Do not add `0 0 Npx <gold>` blur shadows anywhere.

## Implementation tasks

Ordered, each independently testable:

- [ ] **Slice 1 — shared constants.** Add `REPO_URL` + `ROUTES` (top of `Landing.tsx` for now, or `landing/constants.ts` if doing extraction first). Replace both `https://github.com` literals (lines 239, 338) with `href={REPO_URL}`. Verify the two GitHub anchors still open in a new tab. No visual change.
- [ ] **Slice 2 — kill the WIP badge.** Delete the hero "Work in progress" `<div>` (lines 630-640). Confirm the hero still vertically balances (it is `justifyContent: 'flex-end'`, so removing the badge just shortens the stack — fine).
- [ ] **Slice 3 — nav route links + auth className.** Add "Gallery" (`/gallery`) and "Docs" (`/docs`) to the desktop nav cluster and the mobile drawer array. Give `SignInButton` a `className="landing-signin"` and add a flat dark-pill CSS rule in `useLandingChrome`'s injected `<style>`. Verify on mobile the drawer still shows the sign-in control.
- [ ] **Slice 4 — final CTA gallery button.** In the final CTA `<section>`, add a secondary outlined "Browse the gallery" button (`/gallery`) beside "Open the composer", wrapped in a `flex` row with `gap` + `flexWrap`. No glow.
- [ ] **Slice 5 — real footer.** Rewrite `FooterLink` to take `href`/`external`; repoint all four columns per the table; drop dead links (Team/Brand, Privacy/Terms) or repoint to repo. Verify no `href="#"` remains anywhere in the file (`grep '#"'`).
- [ ] **Slice 6 — copy consistency pass.** Re-read every string for "coming soon"/"WIP"/"todo"/placeholder vibes; ensure the templates count is consistent (the hero stats say `12 Starter templates` and the templates section header says "12 starter templates" — keep both at the same number, or switch both to the live curated count). Ensure FAQ answers still match shipped behaviour.
- [ ] **Slice 7 (optional) — extraction.** Move sections into `web/src/design/landing/` per the layout above; leave a one-line `Landing.tsx` re-export. Pure move, no content change in this commit. Run typecheck + the full landing test to prove behaviour is unchanged.

## Testing

Stack: Vitest 2.1 + `@testing-library/react` + jsdom (per shared context). Add `web/src/design/landing/Landing.test.tsx` (or `design/Landing.test.tsx` if not extracting). The hero portal / fractal use WebGL — render the `Landing` tree and assert on DOM, not on canvas pixels; the mock renderer harness covers the canvas components.

- **No dead links (regression for the core bug):** render `<Landing />` inside a `MemoryRouter`, query `container.querySelectorAll('a')`, assert **none** has `getAttribute('href') === '#'` and none has `href === 'https://github.com'` (the bare org root).
- **GitHub points at the repo:** assert at least one anchor's `href` equals `REPO_URL` and that `REPO_URL` contains a path segment after `github.com/` (i.e. not the bare host).
- **Gallery is surfaced:** assert there is at least one anchor with `href="/gallery"` reachable from the nav/CTA, and one footer anchor with `href="/gallery"`.
- **Docs link present:** assert an anchor with `href="/docs"` exists.
- **No WIP copy:** assert `container.textContent` does **not** match `/work in progress/i` and does not contain "coming soon" / "TODO".
- **Sign-in reachable:** assert the "Sign in" button text renders (signed-out default of `SignInButton`) — mock `useAuth` to return unauthenticated. (The auth module already has its own tests; here we only assert the landing *mounts* it.)
- **Footer external links:** assert the GitHub/Issues/License anchors carry `target="_blank"` and `rel="noreferrer"`, and the internal route anchors (`/design`, `/gallery`, `/docs`) do **not**.
- **Extraction (slice 7):** the same test file must pass unchanged before and after the move — that is the proof the extraction is behaviour-preserving.

Run: `cd web && npm run test -- design/Landing` and `npm run typecheck` (or the repo's configured scripts) green; `npm run lint` clean (the new sub-folder must satisfy the `design/` import-boundary rule).

## Risks & open questions

- **Exact repo slug** for `REPO_URL` is unknown at spec time. Implementation must set the real `github.com/<org>/<repo>`; the test asserting "has a path segment" guards against regressing to the bare host.
- **`SignInButton` is light-themed.** Its inline styles (`#fff` bg) come from the auth module, which this spec must not touch. The `className` hook lets us restyle the *outer* button, but the signed-in dropdown popover stays light. Acceptable for now; if it looks wrong on the dark landing, that is a follow-up in the auth-polish spec, not here.
- **Do the `/docs` "Shader basics" and `/learn` "Tutorials" deep anchors exist?** `/docs` and `/learn` routes exist (`main.tsx` 78-80) but specific in-page anchors (e.g. a "basics" section id) may not. Link to the page root if no stable anchor exists; do not invent fragment ids.
- **Templates count drift:** the landing's `TEMPLATES` teaser is 12 hand-authored entries (Landing.tsx lines 1015-1028), separate from the gallery's curated recipe list. Keep the landing copy self-consistent at 12; do not couple it to the gallery's count (that belongs to the gallery spec).
- **Extraction churn vs. risk:** slice 7 touches ~20 files. If time-boxed, ship slices 1-6 (the substantive fixes) and defer 7 — the dead-link/WIP fixes are the user-visible win.

## Dependencies

- **`@/auth` (`SignInButton`)** — consumed as-is; its public API stays stable per shared context. The Supabase internals swap is owned by the auth spec and does not block this work (the `SignInButton` import contract is unchanged).
- **`/gallery` route** — already wired in `integration/main.tsx` (line 79) and implemented at `web/src/design/pages/Gallery.tsx`. The full-featured gallery (likes/search/profiles) is a separate spec; this spec only links to the route that exists today.
- **`/docs`, `/library`, `/learn` routes** — already wired (`main.tsx` 77-80).
- **No backend dependency** — every change here is static client wiring; nothing touches `02-backend-srv-dev-01.md` or the publish flow.
- **`CONTRACTS.md`** — no update required (the new `design/landing/` folder is internal to the `design/` track). Only revisit if `landing/` is promoted to a tracked sub-module (out of scope).

## Done when

- [ ] `grep -R 'href="#"' web/src/design/Landing.tsx web/src/design/landing/` returns nothing.
- [ ] No anchor on the rendered landing has `href === 'https://github.com'` (bare host); both GitHub links resolve to the real repo via `REPO_URL`.
- [ ] The "Work in progress" badge no longer appears anywhere on the page (`textContent` has no `/work in progress/i`).
- [ ] The nav contains reachable links to `/gallery` and `/docs`; the final CTA shows a "Browse the gallery" button → `/gallery`; the footer columns all point at real destinations.
- [ ] `SignInButton` renders in the nav on desktop and in the drawer on mobile, styled flat to match the dark theme (no glow).
- [ ] All footer external links carry `target="_blank" rel="noreferrer"`; internal route links do not.
- [ ] The aesthetic is unchanged: `#0b0c0e` background, `SHADE`/`TYPE` tokens only, no new `0 0 Npx` glow shadows; the only loud accent is the existing gold composer button.
- [ ] `npm run test -- design/Landing`, `npm run typecheck`, and `npm run lint` are all green.
- [ ] (If slice 7 shipped) `integration/main.tsx` still imports `Landing` without change, and the same `Landing.test.tsx` passes before and after the move.
