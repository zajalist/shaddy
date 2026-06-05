# Shaddy — Publish, Social & Polish initiative (overview)

> The index for turning Shaddy from a local-only shader composer into a
> publishable, account-backed, social product with a polished UI. Read this
> first, then the individual specs. Every spec is self-contained and
> implementable by one engineer.

## What we're building

Six subsystems, in two tracks:

- **Track A — Foundation** (interlocking, build in dependency order): real
  accounts, a server to store published shaders, and a social gallery to
  publish/browse/like/remix them.
- **Track B — UI polish** (independent, parallelizable): fix the inspector's
  global canvas params, and re-skin the Library, Learn, and Landing pages.

```
Track A (sequential):   auth ──▶ backend ──▶ gallery
                          │         │            │
Track B (parallel):  inspector   library   learn   landing
                     (any order, any time — no backend dependency)
```

## Architecture (the decided shape)

```
   Browser  (Vite SPA, served HTTPS on Vercel)
      │
      │  1. sign in  (Google / GitHub / email+password)
      ├──────────────────────────▶  Supabase Auth (cloud)  ──▶  JWT
      │
      │  2. publish / browse / like / remix
      │     reads = public · writes = Authorization: Bearer <supabase JWT>
      └──────────────────────────▶  srv-dev-01  (Ubuntu, via Cloudflare Tunnel
                                     at https://api.<domain>, real TLS)
                                        ├─ FastAPI  (verifies the Supabase JWT)
                                        ├─ Postgres (shaders / profiles / likes / reports)
                                        └─ thumbnails (PNG files, served by Caddy)
```

**Why this split:** Supabase gives reliable public login with social providers;
the shader data and thumbnails live on your own hardware (`srv-dev-01`). The box
trusts Supabase by verifying the JWT Supabase signs. A Cloudflare Tunnel makes
the box reachable over HTTPS without port-forwarding or exposing your home IP —
required because an HTTPS Vercel app cannot call a plain-HTTP origin.

## Locked decisions

| Area | Decision |
|---|---|
| **Auth** | Cloud **Supabase Auth**. Providers: **Google, GitHub, Email+password**. Replaces the self-hosted Authentik/OIDC internals; the `@/auth` module keeps its public API. |
| **Reachability** | **Cloudflare Tunnel** (`cloudflared` on the box) → `https://api.<domain>` with real TLS. |
| **Backend** | **FastAPI + Postgres + local PNG thumbnails** on `srv-dev-01`, deployed via docker-compose (api + postgres + caddy + cloudflared). |
| **Gallery scope** | Full-featured: **likes, search + tags, author profiles (`/u/:handle`), remix lineage**. Static PNG thumbnails in the grid; live WebGL on the detail page. |
| **Publishing model** | **Trust-based** — instant publish, author soft-deletes own work, a **report** button flags for review. |
| **Canvas params** | **Remove tempo + the dead Tap button.** Make real: **export/render resolution, background color + transparency, FPS cap + render scale.** Keep + clean aspect ratio. |
| **UI aesthetic** | Flat & minimal. **No glow / halo / bloom shadows** (hard preference). Reuse existing `SHADE`/`TYPE` tokens. |

## The specs

| # | Spec | Track | Depends on | Needs external setup | Parallelizable |
|---|------|-------|------------|----------------------|----------------|
| 01 | [Auth — Supabase](01-auth-supabase.md) | A | — | Supabase project, Google + GitHub OAuth apps | start anytime |
| 02 | [Backend — FastAPI on srv-dev-01](02-backend-srv-dev-01.md) | A | 01 (for the JWT it verifies) | `srv-dev-01` + Docker, Cloudflare domain + tunnel | start anytime (mock JWTs) |
| 03 | [Gallery — publish + browse frontend](03-gallery-frontend.md) | A | 01 + 02 | `VITE_API_BASE_URL` | after 02 (mock API first) |
| 04 | [Inspector — global canvas params](04-inspector-canvas-params.md) | B | — | none | fully independent |
| 05 | [Library page — UI overhaul](05-library-ui.md) | B | — | none | fully independent |
| 06 | [Learn page — UI overhaul](06-learn-ui.md) | B | 05 (shared style layer*) | none | independent (interim path) |
| 07 | [Landing page — refinement](07-landing-refine.md) | B | — (links to existing routes) | none | fully independent |

Each spec follows the same shape: **Summary → Goals → Non-goals → Current state
(real file paths/lines) → Design → Implementation tasks (checkboxed vertical
slices) → Testing → Risks → Dependencies → Done when.**

## Suggested build order & who picks up what

These are independent enough for 4+ people in parallel:

1. **Person A (auth)** → spec **01**. Unblocks everyone who needs identity.
2. **Person B (backend)** → spec **02**. Can start immediately using fixture
   JWTs; only needs 01 finalized for the live JWT shape (`aud`/`iss`/alg).
3. **Person C (gallery)** → spec **03**. Builds against the `@/api` types with a
   mocked client first, wires to the real API once 02 is up.
4. **Person D (polish)** → specs **04 / 05 / 07** in any order (none depend on
   the backend), then **06** once 05's shared style layer lands.

Tracer-bullet order for the whole initiative: **01 → 02 → 03**, with **04/05/07**
running alongside from day one and **06** following 05.

## Cross-spec coordination points (read before you start)

These are the only seams where two specs must agree — pin them early:

1. **REST contract (02 ↔ 03).** The backend spec defines paths under
   `/api/shaders/*`, `/api/users/*`. The gallery spec's **`@/api` TypeScript
   surface is the agreed contract boundary** — its request/response *shapes*
   (`GalleryListItem`, `GalleryDetail`, cursor, `PublishInput`) and the backend's
   Pydantic models must be ratified jointly before either side ships. Both specs
   flag this as their top risk. Lock the JSON shapes in a 15-minute sync; the
   `@/api` types are the single point of change thereafter.
2. **Shared style layer (05 ↔ 06).** Learn (06) wants to consume the shared
   keyframe/interaction-style layer that Library (05) extracts. Spec 05 keeps its
   `style.ts` **library-local** by default. **Decision the team must make up
   front:** if Learn should share it, host the keyframe/interaction part in a
   shared spot (`design/style/` or `design/tokens.ts`) instead of under
   `library/`. If you don't, 06 ships its documented token-free interim path.
   Cheapest correct move: agree to put the shared keyframes + button-interaction
   helper in `design/style/` and have both pages import it.
3. **`CONTRACTS.md` edits.** Three specs touch the module-boundary law and must
   update `CONTRACTS.md` **in the same PR** (the repo rule):
   - **03** adds the new `@/api` module + an ESLint `src/api/**` block (new §6).
   - **04** adds four additive `RendererAPI` methods (§1) and three `cards`
     exports (§3).
   - **02**'s server is outside the web ESLint graph, but the API↔integration
     seam it introduces is documented by 03's `CONTRACTS.md` update.
   Specs 01, 05, 06, 07 require **no** `CONTRACTS.md` change (verified in each).

## One-time external setup checklist

Owned by whoever sets up infra; specs 01 and 02 have the step-by-step.

- [ ] **Supabase project** created; copy **Project URL** + **anon key**.
- [ ] Supabase **Email** provider enabled (Confirm-email OFF for the hackathon).
- [ ] **Google OAuth** client created (Google Cloud Console) → client id/secret
      pasted into Supabase; redirect = `https://<ref>.supabase.co/auth/v1/callback`.
- [ ] **GitHub OAuth** app created → client id/secret into Supabase; same callback.
- [ ] Supabase **URL Configuration**: Site URL = Vercel prod origin; Redirect
      allow-list = `http://localhost:5181/auth/callback` + Vercel prod + preview
      wildcard `/auth/callback`.
- [ ] **Cloudflare**: a zone for `<domain>`; `cloudflared tunnel login/create
      shaddy-api`; `tunnel route dns shaddy-api api.<domain>`; drop credentials
      into `backend/cloudflared/`.
- [ ] **srv-dev-01**: Docker + docker-compose installed; `backend/.env` filled;
      `docker compose up -d`; verify `https://api.<domain>/healthz` from outside.
- [ ] Run the **curated seed** so `/gallery` isn't empty on day one.

## Environment variables

**Frontend** (`web/.env.local` + Vercel prod/preview/dev):

| Var | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | spec 01 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | safe in the client bundle |
| `VITE_API_BASE_URL` | `https://api.<domain>` (prod) / `http://localhost:8000` (dev) | spec 03 |
| `VITE_OAUTH_REDIRECT_URI` | optional override of `…/auth/callback` | usually omit |

Retire `VITE_OAUTH_ISSUER` / `VITE_OAUTH_CLIENT_ID` / `VITE_OAUTH_SCOPES`.

**Backend** (`backend/.env`):

| Var | Value |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://…` |
| `SUPABASE_URL` | Supabase Project URL (for JWKS / issuer check) |
| `SUPABASE_JWT_ALG` | `RS256` (new projects) or `HS256` (legacy) |
| `SUPABASE_JWT_SECRET` | only if `HS256` |
| `CORS_ORIGINS` | Vercel origin(s) + `http://localhost:5181` |
| `THUMBS_DIR` | `/data/thumbs` |
| `PUBLIC_BASE_URL` | `https://api.<domain>` (used to build thumbnail URLs) |

## Status

Specs written 2026-06-04. Design approved. Not yet implemented — each spec's
"Implementation tasks" are the per-slice checklist to work through.
