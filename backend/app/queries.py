import base64
import json
import uuid
from datetime import datetime

from sqlalchemy import select, text, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser
from app.config import Settings
from app.models import Like, Profile, Shader
from app.schemas import ShaderPage
from app.serialize import shader_out


def encode_cursor(values: list) -> str:
    return base64.urlsafe_b64encode(json.dumps(values).encode()).decode()


def decode_cursor(cursor: str) -> list:
    return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())


async def shader_page(
    session: AsyncSession,
    settings: Settings,
    *,
    user: CurrentUser | None = None,
    author_id: uuid.UUID | None = None,
    q: str | None = None,
    tags: str | None = None,
    mode: str | None = None,
    sort: str = "recent",
    cursor: str | None = None,
    limit: int = 24,
) -> ShaderPage:
    """Keyset-paginated, filtered list of non-deleted shaders.

    Shared by GET /api/shaders and GET /api/users/{handle}/shaders.
    """
    limit = max(1, min(limit, 48))
    sort = "popular" if sort in ("popular", "liked", "trending") else "recent"

    stmt = select(Shader).where(Shader.deleted_at.is_(None))
    if author_id is not None:
        stmt = stmt.where(Shader.author_id == author_id)
    if mode in ("2d", "3d"):
        stmt = stmt.where(Shader.mode == mode)
    if tags:
        taglist = [t.strip().lower() for t in tags.split(",") if t.strip()]
        if taglist:
            stmt = stmt.where(Shader.tags.contains(taglist))  # ARRAY @> (AND-match)
    if q and q.strip():
        stmt = stmt.where(
            text(
                "to_tsvector('simple', title || ' ' || coalesce(description,'')) "
                "@@ plainto_tsquery('simple', :q)"
            ).bindparams(q=q)
        )

    if sort == "popular":
        if cursor:
            lc, ca, cid = decode_cursor(cursor)
            stmt = stmt.where(
                tuple_(Shader.like_count, Shader.created_at, Shader.id)
                < tuple_(lc, datetime.fromisoformat(ca), uuid.UUID(cid))
            )
        stmt = stmt.order_by(
            Shader.like_count.desc(), Shader.created_at.desc(), Shader.id.desc()
        )
    else:
        if cursor:
            ca, cid = decode_cursor(cursor)
            stmt = stmt.where(
                tuple_(Shader.created_at, Shader.id)
                < tuple_(datetime.fromisoformat(ca), uuid.UUID(cid))
            )
        stmt = stmt.order_by(Shader.created_at.desc(), Shader.id.desc())

    rows = list((await session.execute(stmt.limit(limit + 1))).scalars().all())
    has_more = len(rows) > limit
    rows = rows[:limit]

    authors: dict = {}
    if rows:
        author_ids = {r.author_id for r in rows}
        for p in (
            await session.execute(select(Profile).where(Profile.id.in_(author_ids)))
        ).scalars():
            authors[p.id] = p

    liked: set = set()
    if user and rows:
        shader_ids = [r.id for r in rows]
        liked = set(
            (
                await session.execute(
                    select(Like.shader_id).where(
                        Like.user_id == user.id, Like.shader_id.in_(shader_ids)
                    )
                )
            ).scalars()
        )

    items = [
        shader_out(r, authors[r.author_id], settings, liked_by_me=(r.id in liked))
        for r in rows
    ]

    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        if sort == "popular":
            next_cursor = encode_cursor(
                [last.like_count, last.created_at.isoformat(), str(last.id)]
            )
        else:
            next_cursor = encode_cursor([last.created_at.isoformat(), str(last.id)])

    return ShaderPage(items=items, next_cursor=next_cursor)
