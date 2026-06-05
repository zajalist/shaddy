"""Idempotent seed of the curated recipes under the official ``shaddy`` account.

Two-step pipeline (the TypeScript source can't be imported from Python):

    1. Regenerate the snapshot from the web app's CURATED_RECIPES:
         npx tsx web/scripts/export-curated.ts        # writes curated_recipes.json
    2. Load it into the database (idempotent — safe to re-run):
         docker compose run --rm api python -m scripts.seed_curated

Each curated entry gets a deterministic uuid5 id, so re-running updates rows
in place instead of creating duplicates.
"""

import asyncio
import json
import os
import uuid

from app.db import SessionLocal
from app.models import Profile, Shader

# Fixed identities so re-seeding is stable.
SHADDY_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
SEED_NAMESPACE = uuid.UUID("00000000-0000-0000-0000-0000000005ee")


def shader_id_for(entry_id: str) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, f"shaddy:{entry_id}")


async def _ensure_shaddy(session) -> None:
    if await session.get(Profile, SHADDY_ID) is None:
        session.add(Profile(id=SHADDY_ID, handle="shaddy", display_name="Shaddy"))
        await session.flush()


async def seed(session, entries: list[dict]) -> tuple[int, int]:
    """Upsert curated entries. Returns (created, updated)."""
    await _ensure_shaddy(session)
    created = updated = 0
    for entry in entries:
        sid = shader_id_for(entry["id"])
        recipe = entry["recipe"]
        values = dict(
            author_id=SHADDY_ID,
            title=entry["title"],
            description=entry.get("description"),
            recipe=recipe,
            mode=recipe.get("mode") or "2d",
            tags=entry.get("tags", []),
            is_featured=bool(entry.get("featured", False)),
        )
        existing = await session.get(Shader, sid)
        if existing is not None:
            for key, value in values.items():
                setattr(existing, key, value)
            updated += 1
        else:
            session.add(Shader(id=sid, **values))
            created += 1
    await session.commit()
    return created, updated


async def main() -> None:
    snapshot = os.path.join(os.path.dirname(__file__), "curated_recipes.json")
    if not os.path.exists(snapshot):
        raise SystemExit(
            f"missing {snapshot}; run `npx tsx web/scripts/export-curated.ts` first"
        )
    with open(snapshot, encoding="utf-8") as fh:
        entries = json.load(fh)
    async with SessionLocal() as session:
        created, updated = await seed(session, entries)
    print(f"seed complete: created {created}, updated {updated} ({len(entries)} entries)")


if __name__ == "__main__":
    asyncio.run(main())
