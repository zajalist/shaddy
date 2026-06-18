# Shaddy backend — publishing API

FastAPI + Postgres service that stores published shader Recipes, serves the
gallery, verifies Supabase JWTs on writes, and serves PNG thumbnails. Runs on
`srv-dev-01` behind a Cloudflare Tunnel. Spec: `../docs/specs/02-backend-srv-dev-01.md`.

## Layout

```
app/
  main.py        FastAPI app, CORS, /healthz, startup schema-create (lifespan)
  config.py      pydantic-settings (env-driven)
  db.py          async SQLAlchemy engine + session dependency + Base
  models.py      profiles / shaders / likes / reports
  schemas.py     Pydantic request/response models
  auth.py        Supabase JWT verification (RS256/JWKS + HS256), require_user
  queries.py     shared keyset-paginated shader listing
  serialize.py   ORM -> response shaping
  thumbnails.py  PNG validation + content-addressed storage
  routers/       shaders.py, users.py
scripts/
  seed_curated.py  idempotent curated seed under the official "shaddy" account
tests/             pytest suite (47 tests)
Dockerfile, docker-compose.yml, docker-compose.prod.yml, Caddyfile, cloudflared/
```

## Local development

Everything runs in Docker (matches the box; avoids local Python-version drift).

```bash
# from backend/
docker compose run --rm api pytest -q          # run the test suite (47 tests)
docker compose up -d                           # run the API at http://localhost:8000
curl localhost:8000/healthz                    # {"status":"ok","db":true,...}
docker compose down
```

The app creates any missing tables on startup, so no migration step is needed.

## Configuration

Copy `.env.example` → `.env` and fill in. Key vars:

| var | meaning |
|-----|---------|
| `DATABASE_URL` | async Postgres URL (`postgresql+asyncpg://…`) |
| `SUPABASE_URL` | Supabase project URL (issuer + JWKS source) |
| `SUPABASE_JWT_ALG` | `RS256` (new projects, JWKS) or `HS256` (legacy secret) |
| `SUPABASE_JWT_SECRET` | only for `HS256` |
| `CORS_ORIGINS` | comma list: the Vercel origin + `http://localhost:5181` |
| `THUMBS_DIR` | on-disk thumbnail root (default `/data/thumbs`) |
| `PUBLIC_BASE_URL` | public origin, e.g. `https://api.<domain>` (builds thumb URLs) |

## API

Reads are public; writes need `Authorization: Bearer <supabase-jwt>`.

| method | path | auth | notes |
|--------|------|------|-------|
| GET | `/healthz` | – | liveness + DB ping |
| POST | `/api/shaders` | yes | publish (recipe ≤256KB, ≤8 tags) |
| GET | `/api/shaders` | opt | `q`, `tags` (AND), `mode`, `sort=recent\|popular`, `cursor`, `limit` |
| GET | `/api/shaders/{id}` | opt | detail (includes recipe) |
| DELETE | `/api/shaders/{id}` | yes | author-only soft-delete |
| POST | `/api/shaders/{id}/thumb` | yes | author-only PNG upload (multipart `file`) |
| POST/DELETE | `/api/shaders/{id}/like` | yes | idempotent |
| POST | `/api/shaders/{id}/report` | yes | dedup per reporter |
| GET | `/api/users/{handle}` | opt | profile + `shader_count`/`total_likes` |
| GET | `/api/users/{handle}/shaders` | opt | that author's shaders (paginated) |

## Deploy on srv-dev-01

### 1. Cloudflare Tunnel (one-time)

```bash
# install cloudflared on the host (to create the tunnel)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb

cloudflared tunnel login                       # authorise your zone in a browser
cloudflared tunnel create shaddy-api           # prints a UUID + writes ~/.cloudflared/<UUID>.json
cloudflared tunnel route dns shaddy-api api.<your-domain>

# wire it into the compose stack
cp ~/.cloudflared/<UUID>.json backend/cloudflared/credentials.json
cp backend/cloudflared/config.yml.example backend/cloudflared/config.yml
# edit config.yml: set tunnel: <UUID> and hostname: api.<your-domain>
```

### 2. Env

```bash
cp backend/.env.example backend/.env
# fill DATABASE_URL (point at the postgres service), SUPABASE_URL, JWT alg/secret,
# CORS_ORIGINS (the Vercel origin), PUBLIC_BASE_URL=https://api.<your-domain>
```

### 3. Bring it up

```bash
cd backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# verify from the public internet:
curl https://api.<your-domain>/healthz        # {"status":"ok","db":true,...}
```

### 4. Seed the curated gallery (so it's not empty)

```bash
# regenerate the snapshot from the web app's curated set, then load it:
npx tsx web/scripts/export-curated.ts          # writes backend/scripts/curated_recipes.json
docker compose run --rm api python -m scripts.seed_curated
```

## Notes / deviations from the spec

- **Schema bootstrap via `create_all` on startup** instead of Alembic migrations.
  Simpler to operate and needs no migration step; the models in
  `app/models.py` are the single source of truth. Adding Alembic later is a clean
  follow-up (the schema is already index-complete, incl. the GIN/partial indexes).
- **`NullPool`** on the async engine (fresh connection per use) — fine at homelab
  scale and avoids cross-event-loop pool reuse in the test suite.
- The connection between an HTTPS Vercel app and this box requires the box be
  reachable over **HTTPS** (the Cloudflare Tunnel handles TLS); a plain-HTTP
  origin would be blocked as mixed content.
