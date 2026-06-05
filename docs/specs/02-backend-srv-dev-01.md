# Backend — FastAPI + Postgres + thumbnails on srv-dev-01

> A new FastAPI + Postgres service in `backend/` that stores published Recipes, serves the gallery, verifies Supabase JWTs on writes, and ships PNG thumbnails over a Cloudflare Tunnel. Part of the Shaddy publish/gallery/polish initiative — see 00-overview.md.

## Summary

Shaddy is currently a pure client SPA (the original ML backend was deleted — see `docs/decisions/2026-05-23-frontend-only.md` lines 19-24, and `CONTRACTS.md` line 7 still reflects "frontend-only"). This spec reintroduces a server, but a *publishing* server, not an ML one: a FastAPI app over Postgres that persists the `Recipe` JSON (the same shape encoded into share URLs by `web/src/design/recipe-url.ts`) as `jsonb`, plus likes, reports, and author profiles. The shader grid uses static PNG thumbnails captured client-side via the renderer's `snapshot()`; the detail page renders live WebGL. Reads are public; every write verifies a Supabase JWT. The service runs on the user's Ubuntu box `srv-dev-01` via docker-compose (api + postgres + caddy + cloudflared) and is reachable at `https://api.<domain>` through a Cloudflare Tunnel. A seed script imports the 14 curated recipes from `web/src/design/pages/gallery/recipes.ts` under an official `shaddy` account.

This spec owns the **server only**. The frontend API client, the gallery rewiring, and the Supabase auth swap are companion specs (see Dependencies).

## Goals

- A FastAPI service in `backend/` with a clean layout: `app/` (routes, models, auth, db), `scripts/` (seed), `tests/`.
- A Postgres schema with four tables — `profiles`, `shaders`, `likes`, `reports` — with exact columns, types, FKs, and indexes.
- Supabase JWT verification on all writes: validate signature + `aud` + `exp`, extract `sub` (uuid) as the canonical user id.
- Every REST endpoint specified: method, path, auth, request body, response shape — with one master endpoint table.
- Multipart PNG thumbnail upload, on-disk path layout, and serving via Caddy.
- CORS that allows the Vercel origin + localhost dev.
- An idempotent seed for the 14 curated recipes under the `shaddy` account.
- A docker-compose stack and a concrete Cloudflare Tunnel runbook.

## Non-goals

- The frontend API client and gallery rewiring (companion spec `03-gallery-frontend.md`).
- The Supabase auth internal swap of `web/src/auth/oidc.ts` → `@supabase/supabase-js` (companion spec `01-auth-supabase.md`). This spec only consumes the JWT Supabase issues.
- Bringing back the ML optimizer (`POST /optimize`, the PyTorch path) — it stays deferred per the 2026-05-23 decision.
- Server-side WebGL rendering or server-side thumbnail generation. Thumbnails are produced in the browser by `renderer.snapshot()` and uploaded.
- Moderation tooling beyond a `reports` table and a report endpoint.
- Rate limiting / abuse infra beyond Cloudflare's defaults (open question below).

## Current state

(All paths verified by reading the files.)

- **`backend/` is an empty scaffold.** `git ls-files` returns no tracked files under `backend/`; on disk there are only stale `__pycache__/*.pyc` artifacts left over from the deleted ML backend (`app/`, `optim/`, `scripts/`, `templates/`, `tests/` dirs exist but hold only `.pyc` + a local `.venv/`). Treat it as greenfield; delete the stale `__pycache__`/`.venv` and `optim/`+`templates/` leftovers as part of slice 1.
- **The Recipe data model** is `web/src/cards/types.ts` lines 9-32: `Recipe = { cards: Card[]; canvasAspect: 'square'|'portrait'|'landscape'; mode?: '2d'|'3d'; passes?: Pass[]; animations?: AnimChain[] }`. ~1 KB of JSON → store as `jsonb`. The server treats it as opaque JSON; it never compiles or inspects card internals.
- **Share-URL serialisation** is `web/src/design/recipe-url.ts`: `encodeRecipeToHash` (line 38) `JSON.stringify`s a media-stripped recipe to base64; `decodeRecipeFromHash` (line 45) rejects recipes whose `validateRecipe(...)` (re-exported at `web/src/cards/index.ts` line 45) returns errors. `stripMedia` (line 12) drops `data:` URLs and live `sourceRef`s. The server stores the same stripped JSON shape; media never reaches the DB.
- **The 14 curated recipes** live in `web/src/design/pages/gallery/recipes.ts`. `CuratedRecipe` (lines 22-30) = `{ id, title, tag, author, recipe: Recipe, featured?, recent? }`; the array `CURATED_RECIPES` (line 82) holds exactly 14 entries (11 `recipe2d`, 3 `recipe3d`). `author` is a display string like `'by Nadia Werth'`; the seed maps all 14 to the single `shaddy` profile and keeps `title`/`tag`/`featured` as metadata.
- **Auth surface that must stay stable** is `web/src/auth/index.ts` (re-exports `useAuth`, `signIn`, `signOut`, `getAccessToken`, `getUser`, `AuthCallback`, `SignInButton`). `getAccessToken()` (`web/src/auth/oidc.ts` line 292) returns the bearer the API client will send. The Supabase swap (companion spec) keeps these signatures; this server only needs to verify whatever JWT `getAccessToken()` yields. Today `AuthUser.sub` (`oidc.ts` line 47-54) is the user id — under Supabase, `sub` is the Supabase `user.id` (uuid).
- **Renderer thumbnail source**: `RendererAPI.snapshot(): Promise<string>` (`CONTRACTS.md` line 56, real impl `web/src/renderer/runtime.ts`) returns a PNG data URL. The publish flow (companion spec) converts that to a `Blob` and POSTs it; this server accepts it as multipart.
- **Module boundaries**: `CONTRACTS.md` lines 1-7, 248-271 — `web/src/integration/` is the only place seams wire up; `design/` composes public `index.ts` entries. The backend is a *new top-level `backend/` tree* outside `web/src/`, so it is outside the eslint module graph. The frontend API client that talks to it belongs in a new `web/src/integration/` (or a new `web/src/api/`) module and is specified in the gallery spec; **CONTRACTS.md must gain a "6. API ↔ Integration" section in that PR**, not this one.

## Design

### Architecture

```
Browser (Vercel SPA)
  │  GET reads (public)            POST/DELETE writes (Bearer <supabase jwt>)
  ▼
Cloudflare Tunnel  ──►  Caddy (:80/:443 inside the box, TLS terminated by CF)
  ├─ /api/*   → FastAPI (uvicorn, :8000)
  └─ /thumbs/* → static files from /data/thumbs  (Caddy file_server)
                          │
                          ▼
                    Postgres 16  (shaders/profiles/likes/reports)
                          ▲
                          └─ seed script (one-shot, idempotent)
```

- **TLS**: Cloudflare terminates HTTPS at the edge; cloudflared dials Caddy over the tunnel. Caddy serves plain HTTP on the loopback/compose network (`http://caddy:80`); no public port is opened on the box.
- **Why Caddy serves thumbnails, not FastAPI**: PNG file serving with byte-range + caching headers is Caddy's job; FastAPI only writes the file and stores its relative path. Keeps the Python process off the hot image path.

### Project / folder layout

```
backend/
  app/
    __init__.py
    main.py            # FastAPI() app, CORS, router includes, /healthz
    config.py          # Settings (pydantic-settings): DB url, SUPABASE_*, CORS origins, THUMBS_DIR
    db.py              # async SQLAlchemy engine + session dependency
    models.py          # SQLAlchemy ORM: Profile, Shader, Like, Report
    schemas.py         # Pydantic request/response models
    auth.py            # Supabase JWT verify dependency (require_user / optional_user)
    thumbnails.py      # multipart validation, on-disk write, path layout
    routers/
      shaders.py       # POST/GET/DELETE /shaders, like, report
      users.py         # GET /users/{handle}, /users/{handle}/shaders
      health.py        # GET /healthz
  scripts/
    seed_curated.py    # idempotent import of the 14 recipes → shaddy account
    curated_recipes.json  # exported snapshot of CURATED_RECIPES (built by a tiny web script)
  migrations/          # Alembic
    env.py
    versions/0001_init.py
  tests/
    conftest.py        # test DB + httpx AsyncClient + fake-JWT fixtures
    test_shaders.py
    test_likes.py
    test_reports.py
    test_users.py
    test_auth.py
    test_health.py
  Dockerfile
  docker-compose.yml
  Caddyfile
  cloudflared/config.yml
  pyproject.toml       # fastapi, uvicorn[standard], sqlalchemy[asyncio], asyncpg,
                       # pydantic-settings, python-jose[cryptography], httpx,
                       # python-multipart, alembic, pytest, pytest-asyncio
  .env.example
```

### Postgres schema

Postgres 16. UUIDs via `gen_random_uuid()` (pgcrypto). Timestamps are `timestamptz`. Defined as Alembic migration `0001_init`.

**`profiles`** — one row per Supabase user; `id` IS the Supabase `user.id`.

| column        | type          | constraints / notes |
|---------------|---------------|---------------------|
| `id`          | `uuid`        | PK. Equals Supabase `sub`. NOT auto-generated — set from the JWT on first write. |
| `handle`      | `text`        | UNIQUE, NOT NULL. URL slug for `/u/:handle`. `^[a-z0-9_-]{2,32}$` (checked app-side). |
| `display_name`| `text`        | NOT NULL. |
| `avatar_url`  | `text`        | NULL. |
| `created_at`  | `timestamptz` | NOT NULL DEFAULT `now()`. |

Indexes: `profiles_handle_key` (unique). Seed inserts the `shaddy` profile with a fixed sentinel uuid `00000000-0000-0000-0000-000000000001`.

**`shaders`** — one row per published recipe.

| column         | type          | constraints / notes |
|----------------|---------------|---------------------|
| `id`           | `uuid`        | PK DEFAULT `gen_random_uuid()`. |
| `author_id`    | `uuid`        | NOT NULL. FK → `profiles(id)` ON DELETE CASCADE. |
| `title`        | `text`        | NOT NULL. 1-120 chars (app-checked). |
| `description`  | `text`        | NULL. ≤ 2000 chars. |
| `recipe`       | `jsonb`       | NOT NULL. The media-stripped `Recipe` JSON (`web/src/cards/types.ts`). |
| `mode`         | `text`        | NOT NULL DEFAULT `'2d'`. `'2d'`\|`'3d'`, mirrors `recipe.mode ?? '2d'` for fast filtering. CHECK in (`'2d'`,`'3d'`). |
| `tags`         | `text[]`      | NOT NULL DEFAULT `'{}'`. Lowercased, ≤ 8 tags, each ≤ 24 chars. |
| `thumb_path`   | `text`        | NULL until upload. Relative path under `THUMBS_DIR`, e.g. `ab/abcd…ef.png`. |
| `like_count`   | `integer`     | NOT NULL DEFAULT 0. Denormalised; kept in sync in the like/unlike transaction. |
| `remix_of`     | `uuid`        | NULL. FK → `shaders(id)` ON DELETE SET NULL. Lineage / "remixed from X". |
| `is_featured`  | `boolean`     | NOT NULL DEFAULT false. Set true for the 14 curated. |
| `deleted_at`   | `timestamptz` | NULL. Soft-delete tombstone; reads filter `deleted_at IS NULL`. |
| `created_at`   | `timestamptz` | NOT NULL DEFAULT `now()`. |

Indexes:
- `shaders_author_created_idx` on `(author_id, created_at DESC)` — author profile lists.
- `shaders_created_idx` on `(created_at DESC) WHERE deleted_at IS NULL` — default "recent" feed + cursor pagination.
- `shaders_likes_idx` on `(like_count DESC, created_at DESC) WHERE deleted_at IS NULL` — "popular" sort.
- `shaders_mode_idx` on `(mode) WHERE deleted_at IS NULL`.
- `shaders_tags_gin` GIN on `tags` — tag filtering (`tags && ARRAY[...]`).
- `shaders_search_gin` GIN on `to_tsvector('simple', title || ' ' || coalesce(description,''))` — full-text `q` search. Created via an expression index (or a generated `tsv` column; expression index is fine for v1).

**`likes`** — one row per (user, shader). Join table.

| column       | type          | constraints / notes |
|--------------|---------------|---------------------|
| `user_id`    | `uuid`        | FK → `profiles(id)` ON DELETE CASCADE. |
| `shader_id`  | `uuid`        | FK → `shaders(id)` ON DELETE CASCADE. |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()`. |

PK = composite `(user_id, shader_id)` (this *is* the idempotency + uniqueness guard). Index `likes_shader_idx` on `(shader_id)` for "did I like this" / counts.

**`reports`** — abuse reports; many per shader.

| column        | type          | constraints / notes |
|---------------|---------------|---------------------|
| `id`          | `uuid`        | PK DEFAULT `gen_random_uuid()`. |
| `shader_id`   | `uuid`        | NOT NULL. FK → `shaders(id)` ON DELETE CASCADE. |
| `reporter_id` | `uuid`        | NULL. FK → `profiles(id)` ON DELETE SET NULL. (NULL ⇒ anonymous; v1 requires auth so always set.) |
| `reason`      | `text`        | NOT NULL. CHECK in (`'spam'`,`'nsfw'`,`'stolen'`,`'broken'`,`'other'`). |
| `detail`      | `text`        | NULL. ≤ 1000 chars. |
| `created_at`  | `timestamptz` | NOT NULL DEFAULT `now()`. |

Index `reports_shader_idx` on `(shader_id)`. Unique `(shader_id, reporter_id)` to stop a user re-reporting the same shader.

### Supabase JWT verification

Supabase issues an RS256 (or, on older projects, HS256) JWT. The API verifies it on every write.

- **Key material** — support both, picked by `SUPABASE_JWT_ALG`:
  - **RS256 (preferred)**: fetch the JWKS from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, cache it in-process with a TTL (default 10 min) keyed by `kid`. On a `kid` miss, refetch once (key rotation). Verify the signature against the matching JWK.
  - **HS256 (legacy projects)**: verify with the symmetric `SUPABASE_JWT_SECRET` from the project settings.
- **Claims validated** (using `python-jose`):
  - signature (per algorithm above),
  - `exp` (not expired; small leeway 0),
  - `aud == "authenticated"` (Supabase's default audience),
  - `iss == ${SUPABASE_URL}/auth/v1` (defence in depth).
- **User id** = the `sub` claim (a uuid). Email/role/`user_metadata` are read opportunistically for first-write profile creation but `sub` is the only trusted identity.
- **Dependencies** (FastAPI):
  - `require_user` — extracts `Authorization: Bearer <jwt>`, verifies, returns a `CurrentUser{ id: UUID, email: str|None, claims: dict }`. 401 on missing/invalid/expired. Used by all writes.
  - `optional_user` — same but returns `None` when no header (used by GET endpoints that personalise `liked_by_me`).
  - **Profile upsert on first write**: `require_user` (or a thin wrapper) ensures a `profiles` row exists for `sub`. If absent, create one with a derived handle (`user_metadata.user_name` / email local-part, slugified, de-duplicated with a numeric suffix) and `display_name`. This is the only place rows are auto-created. Idempotent.
- The JWKS cache, leeway, and audience are all config-driven so tests can inject a local RSA keypair and a fake issuer.

### REST API

Base path `/api`. All JSON. Errors use a uniform body `{ "error": { "code": str, "message": str } }` with the documented status. Reads are public; writes need `Bearer`.

**Endpoint table**

| Method | Path | Auth | Body / query | Success | Notes |
|--------|------|------|--------------|---------|-------|
| GET | `/healthz` | none | — | 200 `{status,db,version}` | liveness + DB ping |
| POST | `/api/shaders` | required | `CreateShader` JSON | 201 `Shader` | publish; trust-based, instant |
| GET | `/api/shaders` | optional | `q,tags,mode,sort,cursor,limit` | 200 `ShaderPage` | list/search/feed |
| GET | `/api/shaders/{id}` | optional | — | 200 `ShaderDetail` | 404 if deleted/missing |
| DELETE | `/api/shaders/{id}` | required | — | 204 | soft-delete; author only |
| POST | `/api/shaders/{id}/thumb` | required | multipart `file` (PNG) | 200 `{thumb_url}` | author only; sets `thumb_path` |
| POST | `/api/shaders/{id}/like` | required | — | 200 `{like_count,liked:true}` | idempotent |
| DELETE | `/api/shaders/{id}/like` | required | — | 200 `{like_count,liked:false}` | idempotent |
| POST | `/api/shaders/{id}/report` | required | `CreateReport` JSON | 202 `{ok:true}` | dedup per reporter |
| GET | `/api/users/{handle}` | optional | — | 200 `Profile` | 404 if missing |
| GET | `/api/users/{handle}/shaders` | optional | `cursor,limit,sort` | 200 `ShaderPage` | that author's public shaders |

**Request / response shapes** (Pydantic; JSON field names as shown).

```
CreateShader   { title: str(1..120), description?: str(<=2000),
                 recipe: object (Recipe JSON), tags?: str[(<=8, each <=24)],
                 remix_of?: uuid }
  → server derives `mode` from recipe.mode ?? "2d"; validates recipe is an object
    with an array `cards` (mirror of decodeRecipeFromHash's guard, recipe-url.ts:51);
    does NOT compile cards. Rejects recipe > 256 KB (413).

CreateReport   { reason: 'spam'|'nsfw'|'stolen'|'broken'|'other', detail?: str(<=1000) }

Shader (list item)   { id, title, mode, tags, thumb_url|null, like_count,
                       liked_by_me: bool, is_featured, created_at,
                       author: { handle, display_name, avatar_url } }

ShaderDetail   = Shader + { description, recipe (object), remix_of: {id,title,author}|null }

ShaderPage     { items: Shader[], next_cursor: str|null }

Profile        { id, handle, display_name, avatar_url, created_at,
                 shader_count, total_likes }
```

**`GET /api/shaders` query semantics**

- `q` — full-text over title+description (uses `shaders_search_gin`). Empty ⇒ no text filter.
- `tags` — comma-separated; matches shaders whose `tags` array contains ALL given tags (`tags @> ARRAY[...]`).
- `mode` — `2d` | `3d` | omitted (all).
- `sort` — `recent` (default, `created_at DESC`) | `popular` (`like_count DESC, created_at DESC`).
- `cursor` — opaque base64 of `(sort_key, id)` from the last item; keyset pagination (no OFFSET). `limit` — 1-48, default 24.
- Always `WHERE deleted_at IS NULL`. Featured shaders are normal rows; the gallery's "featured" rail is `is_featured=true` filtered client-side or via a future `featured=true` param (not required for v1).
- `liked_by_me` is computed only when `optional_user` resolves; otherwise always `false`.

**Authorisation rules**

- `DELETE /shaders/{id}` and `POST /shaders/{id}/thumb`: 403 unless `current_user.id == shader.author_id`.
- Soft delete sets `deleted_at = now()`; the row and its thumbnail file remain on disk (a future GC sweep can purge old tombstones — out of scope).
- Like/unlike use the composite-PK upsert/delete and adjust `like_count` in the same transaction (`INSERT ... ON CONFLICT DO NOTHING` then conditional `UPDATE ... SET like_count = like_count ± 1`).

### Thumbnails

- **Upload**: `POST /api/shaders/{id}/thumb`, `multipart/form-data`, field `file`. Accept `image/png` only; reject > 2 MB (413) and non-PNG (415, sniff the 8-byte PNG magic, do not trust the content-type header alone). Optional dimension sanity check (reject > 4096px on a side).
- **On-disk layout**: `THUMBS_DIR` (default `/data/thumbs`, a docker volume). File name = `<sha256(bytes)>.png`; path is sharded by the first two hex chars: `THUMBS_DIR/<ab>/<sha>.png`. Sharding keeps directories small. Content-addressing makes re-uploads idempotent and dedupes identical thumbnails.
- **DB**: store the *relative* path `ab/<sha>.png` in `shaders.thumb_path`.
- **Serving**: Caddy `file_server` roots `/thumbs` at `THUMBS_DIR`. `thumb_url` in responses = `${PUBLIC_BASE_URL}/thumbs/<thumb_path>`. Caddy sets `Cache-Control: public, max-age=31536000, immutable` (safe because the name is the content hash).
- A shader with no thumbnail yet returns `thumb_url: null`; the gallery falls back to a placeholder. The publish flow uploads the thumb immediately after `POST /shaders` returns the id.

### CORS

`fastapi.middleware.cors.CORSMiddleware`, origins from `CORS_ORIGINS` (comma list). Defaults: the Vercel production origin (`https://shaddy.vercel.app` — confirm exact domain), Vercel preview wildcard handled by an explicit regex `https://shaddy-.*\.vercel\.app`, and `http://localhost:5181` + `http://localhost:5173` for dev. Allow methods `GET,POST,DELETE,OPTIONS`, headers `Authorization,Content-Type`, `allow_credentials=false` (we use bearer tokens, not cookies). Caddy must NOT also inject CORS headers for `/api` (avoid duplicates) but DOES add permissive `Access-Control-Allow-Origin` for `/thumbs` (static images, `*` is fine).

### Seed script (idempotent)

`scripts/seed_curated.py` imports the 14 curated recipes under the `shaddy` account.

- **Source of truth**: `web/src/design/pages/gallery/recipes.ts` is TypeScript, not importable from Python. Add a tiny web-side export (`web/scripts/export-curated.ts`, run with `tsx`) that `JSON.stringify`s `CURATED_RECIPES` (after `mk()` fills defaults) to `backend/scripts/curated_recipes.json`. The Python seed reads that JSON. Document this two-step in the script header so the snapshot can be regenerated when recipes change.
- **Idempotency**: upsert the `shaddy` profile (fixed uuid `…0001`, handle `shaddy`, display name `Shaddy`). For each curated entry use a *deterministic* shader id derived from its string `id` (e.g. `uuid5(NAMESPACE, 'shaddy:'+entry.id)`), so re-running updates rather than duplicates. Set `is_featured = entry.featured ?? false`, `title = entry.title`, `tags = [slug(entry.tag-derived)]` or `[]`, `mode = recipe.mode ?? '2d'`, `recipe = entry.recipe`. `ON CONFLICT (id) DO UPDATE`.
- Thumbnails for curated shaders: out of scope for the seed (no renderer in Python). Either leave `thumb_path` null (placeholder) or run a one-off browser capture script that uploads via the thumb endpoint. v1: leave null; the live detail page still renders.
- Runnable as `docker compose run --rm api python -m scripts.seed_curated`. Exits 0 on success, prints a summary (`created N, updated M`).

### docker-compose stack

`docker-compose.yml` services:

- **`postgres`** — `postgres:16`, env `POSTGRES_DB/USER/PASSWORD`, volume `pgdata:/var/lib/postgresql/data`, healthcheck `pg_isready`.
- **`api`** — built from `Dockerfile` (python:3.12-slim, install via `pyproject.toml`, run `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port 8000`). Mounts `thumbs:/data/thumbs`. `depends_on: postgres (healthy)`. Env from `.env`.
- **`caddy`** — `caddy:2`, mounts `Caddyfile` + the shared `thumbs` volume (read-only). Reverse-proxies `/api/*` → `api:8000`, serves `/thumbs/*` from the volume.
- **`cloudflared`** — `cloudflare/cloudflared:latest`, `command: tunnel run`, mounts `cloudflared/config.yml` + the tunnel credentials JSON. `depends_on: caddy`.

`Caddyfile` (the box's internal vhost, HTTP only — CF terminates TLS):

```
:80 {
    handle_path /thumbs/* {
        root * /data/thumbs
        file_server
        header Cache-Control "public, max-age=31536000, immutable"
        header Access-Control-Allow-Origin "*"
    }
    handle /api/* {
        reverse_proxy api:8000
    }
    handle /healthz {
        reverse_proxy api:8000
    }
}
```

Volumes `pgdata`, `thumbs` are named docker volumes (persist across redeploys).

### Cloudflare Tunnel runbook

On `srv-dev-01` (Ubuntu), one-time setup, then it runs as a compose service:

1. **Install cloudflared** (host, just to create the tunnel; the container runs it day-to-day):
   `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb && sudo dpkg -i cf.deb`
2. **Login** (opens a browser to authorise the zone): `cloudflared tunnel login` → writes `~/.cloudflared/cert.pem`.
3. **Create the tunnel**: `cloudflared tunnel create shaddy-api` → prints a tunnel UUID and writes `~/.cloudflared/<UUID>.json` (the credentials). Copy that JSON into `backend/cloudflared/credentials.json` (gitignored).
4. **Route DNS**: `cloudflared tunnel route dns shaddy-api api.<domain>` → creates the `api.<domain>` CNAME to `<UUID>.cfargotunnel.com`.
5. **`cloudflared/config.yml`**:
   ```yaml
   tunnel: <UUID>
   credentials-file: /etc/cloudflared/credentials.json
   ingress:
     - hostname: api.<domain>
       service: http://caddy:80
     - service: http_status:404
   ```
6. **Run**: `docker compose up -d`. Verify `https://api.<domain>/healthz` returns 200 from the public internet.
7. **Supabase callback / CORS**: add `https://api.<domain>` to `CORS_ORIGINS` only if the API itself is ever browsed cross-origin; the SPA origin (Vercel) is what matters for CORS. Add the Vercel origin to Supabase's allowed redirect URLs is the auth spec's job, not this one.

Document a teardown note: `docker compose down` stops the tunnel; the DNS record persists until `cloudflared tunnel route dns` is removed or the tunnel is deleted.

## Implementation tasks

- [ ] **Slice 1 — scaffold + health.** Clean the stale `backend/__pycache__`/`.venv`/`optim`/`templates` leftovers. Create `pyproject.toml`, `app/main.py` with `FastAPI()`, CORS middleware (config-driven), and `GET /healthz` returning `{status:'ok', db:<bool>, version}`. `app/config.py` with pydantic-settings. Dockerfile + a minimal `docker-compose.yml` (api + postgres). `pytest` + `test_health.py` green against a throwaway DB.
- [ ] **Slice 2 — schema + migrations.** SQLAlchemy models for `profiles/shaders/likes/reports`; Alembic `0001_init` with every column, FK, CHECK, and index above (incl. the two GIN indexes and pgcrypto/`gen_random_uuid`). `db.py` async engine + session dependency. Test: migration applies clean, a round-trip insert/select of a shader with a real Recipe JSON works.
- [ ] **Slice 3 — Supabase JWT auth.** `app/auth.py`: JWKS fetch+cache (RS256) and HS256 secret path, `require_user`/`optional_user` dependencies, claim validation (sig/exp/aud/iss), profile upsert-on-first-write. Tests inject a local RSA keypair + fake issuer; cover valid, expired, wrong-aud, bad-sig, missing-header.
- [ ] **Slice 4 — shaders CRUD.** `routers/shaders.py`: `POST /shaders` (validate, derive mode, size cap, 201), `GET /shaders/{id}` (404 on deleted), `DELETE /shaders/{id}` (author-only soft delete). Pydantic schemas. Tests for each + the recipe-shape guard mirroring `recipe-url.ts:51`.
- [ ] **Slice 5 — list/search/pagination.** `GET /shaders` with `q/tags/mode/sort/cursor/limit`, keyset cursor encode/decode, `liked_by_me` via `optional_user`. Tests: tag AND-match, text search, both sorts, cursor stability across inserts.
- [ ] **Slice 6 — likes + reports.** `POST|DELETE /shaders/{id}/like` (idempotent, transactional `like_count`), `POST /shaders/{id}/report` (dedup per reporter). Tests: double-like is a no-op, count stays correct, duplicate report rejected.
- [ ] **Slice 7 — thumbnails.** `thumbnails.py` + `POST /shaders/{id}/thumb`: PNG magic sniff, size cap, content-address + shard write, store `thumb_path`, author-only. `Caddyfile` serves `/thumbs`. Tests: upload sets path, non-PNG → 415, oversize → 413, non-author → 403, re-upload is idempotent.
- [ ] **Slice 8 — users / profiles.** `routers/users.py`: `GET /users/{handle}` (with `shader_count`/`total_likes` aggregates), `GET /users/{handle}/shaders` (paginated). Tests for both, including a missing handle → 404.
- [ ] **Slice 9 — seed.** `web/scripts/export-curated.ts` (tsx) → `curated_recipes.json`; `scripts/seed_curated.py` idempotent upsert under `shaddy`. Tests: seeding twice yields 14 rows (no dupes), `is_featured` set from `entry.featured`.
- [ ] **Slice 10 — full compose + tunnel.** Add `caddy` + `cloudflared` services, `Caddyfile`, `cloudflared/config.yml`. Write `backend/README.md` with the tunnel runbook. Manually verify `https://api.<domain>/healthz` from outside. Update root `CONTRACTS.md` with the new "API ↔ Integration" section (in the gallery-spec PR, cross-referenced here).

## Testing

Stack: `pytest` + `pytest-asyncio` + `httpx.AsyncClient` against the FastAPI app (Python — the web Vitest stack does not cover the server). Frontend tests for the API client live in the gallery spec under Vitest 2.1.

- **`conftest.py`**: spins a disposable Postgres (testcontainers, or a `docker compose` test DB, or a CI Postgres service); applies Alembic migrations per test session; yields an `AsyncClient`. Provides a `make_jwt(sub, aud, exp, alg)` helper signing with a fixture RSA key so `auth.py` can verify without hitting Supabase (config points `SUPABASE_JWKS` at the fixture's public JWK).
- **Unit**: JWT verify (valid/expired/wrong-aud/bad-sig/missing), cursor encode/decode round-trip, thumbnail PNG-magic sniff, handle slugify/dedupe, recipe-shape guard.
- **Integration (route-level)**: publish → fetch → list → like → unlike → report → soft-delete, asserting status codes, `like_count`, `liked_by_me`, and that deleted shaders drop out of `GET /shaders`. Author-only guards (403) for delete + thumb. Idempotency of like + seed.
- **Seed test**: run the seed against a clean DB twice; assert exactly 14 `shaders` rows owned by the `shaddy` profile, correct `is_featured` counts (6 featured per `recipes.ts`), and `mode` split (11×`2d`, 3×`3d`).
- CI: a `backend:` job (the one removed per `docs/decisions/2026-05-23-frontend-only.md` line 22 is reinstated) runs `pytest` with a Postgres service.

## Risks & open questions

- **JWT algorithm**: confirm whether the Supabase project issues RS256 (JWKS) or legacy HS256 (shared secret). The auth code supports both, but the deploy config must pick one. New Supabase projects default to ES256/RS256 with a JWKS endpoint.
- **Domain**: `api.<domain>` and the exact Vercel production origin are placeholders — fill the real `<domain>` and Vercel URL into `CORS_ORIGINS`, the Caddyfile/cloudflared config, and `PUBLIC_BASE_URL`.
- **Handle collisions on first write**: two users with the same email local-part need deterministic de-duplication (numeric suffix). Edge case: a user wants to *choose* their handle — there is no "edit profile" endpoint in v1. Open question: add `PATCH /users/me` now or later?
- **Recipe validation depth**: the server only checks "object with array `cards`" (mirroring `recipe-url.ts:51`), not full `validateRecipe()` (which lives in `web/src/cards`). A malformed-but-shaped recipe could be stored and fail to compile in the browser. Acceptable for trust-based publishing; revisit if abuse appears.
- **Abuse / rate limiting**: trust-based instant publish + a report button is the v1 stance. No server-side rate limit beyond Cloudflare. Open question: cap shaders-per-user-per-hour?
- **srv-dev-01 availability**: a home box behind a tunnel is a single point of failure for the gallery. The SPA must degrade gracefully (the composer + share-URL still work fully offline) when the API is down — the gallery spec owns that fallback.
- **Thumbnail trust**: thumbnails are user-uploaded PNGs; we sniff magic bytes and cap size but do not re-encode. A malformed PNG is served as-is by Caddy (static, no execution) — low risk, but consider server-side re-encode (Pillow) if needed.

## Dependencies

- **`01-auth-supabase.md`** — swaps `web/src/auth` internals to `@supabase/supabase-js` (Google/GitHub/Email) while keeping the `web/src/auth/index.ts` public API stable. This server consumes the JWT that `getAccessToken()` returns; the two specs must agree on `aud`, `iss`, and the algorithm.
- **`03-gallery-frontend.md`** (companion) — the frontend API client + publish flow + gallery/profile rewiring. Owns the new `web/src/integration` (or `web/src/api`) module, the `recipe.snapshot()` → thumbnail upload, and the **CONTRACTS.md "API ↔ Integration" section update** (per `CONTRACTS.md` lines 248-271, new seams must be documented there in the same PR).
- **External setup**: a Supabase project (URL + JWKS/secret, `aud="authenticated"`); a Cloudflare account + zone for `<domain>`; the `srv-dev-01` Ubuntu box with Docker + docker-compose. The 14-recipe snapshot regenerates from `web/src/design/pages/gallery/recipes.ts` via the new `web/scripts/export-curated.ts`.

## Done when

- [ ] `backend/` holds a runnable FastAPI service; `docker compose up -d` brings up api + postgres + caddy + cloudflared with no manual steps beyond `.env` + tunnel credentials.
- [ ] `https://api.<domain>/healthz` returns 200 from the public internet through the Cloudflare Tunnel.
- [ ] Alembic `0001_init` creates `profiles/shaders/likes/reports` with every column, FK, CHECK, and index in this spec (verified by `\d+` and the migration test).
- [ ] A write with a valid Supabase JWT succeeds and auto-creates the author profile; an expired/forged/missing-`aud` token returns 401; reads work with no token.
- [ ] Every endpoint in the table is implemented and covered by a passing `pytest` test; the reinstated CI `backend:` job is green.
- [ ] `POST /shaders` stores the Recipe `jsonb`, `POST /shaders/{id}/thumb` content-addresses the PNG under `THUMBS_DIR`, and `thumb_url` resolves to a Caddy-served image with an immutable cache header.
- [ ] `GET /shaders` supports `q`, `tags` (AND), `mode`, `sort=recent|popular`, and keyset `cursor` pagination; soft-deleted shaders never appear.
- [ ] Running the seed twice leaves exactly 14 `shaders` rows under the `shaddy` profile (6 featured, 11×`2d`/3×`3d`), with no duplicates.
- [ ] CORS allows the Vercel origin + localhost dev and rejects others; thumbnails are publicly cacheable.
