from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, optional_user
from app.config import Settings, get_settings
from app.db import get_session
from app.models import Profile, Shader
from app.queries import shader_page
from app.schemas import ProfileOut, ShaderPage

router = APIRouter(prefix="/api/users", tags=["users"])


async def _load_profile(session: AsyncSession, handle: str) -> Profile:
    profile = (
        await session.execute(select(Profile).where(Profile.handle == handle))
    ).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="user not found")
    return profile


@router.get("/{handle}", response_model=ProfileOut)
async def get_user(
    handle: str, session: AsyncSession = Depends(get_session)
) -> ProfileOut:
    profile = await _load_profile(session, handle)
    count, total = (
        await session.execute(
            select(
                func.count(Shader.id),
                func.coalesce(func.sum(Shader.like_count), 0),
            ).where(Shader.author_id == profile.id, Shader.deleted_at.is_(None))
        )
    ).one()
    return ProfileOut(
        id=profile.id,
        handle=profile.handle,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
        created_at=profile.created_at,
        shader_count=int(count),
        total_likes=int(total),
    )


@router.get("/{handle}/shaders", response_model=ShaderPage)
async def get_user_shaders(
    handle: str,
    sort: str = "recent",
    cursor: str | None = None,
    limit: int = 24,
    user: CurrentUser | None = Depends(optional_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ShaderPage:
    profile = await _load_profile(session, handle)
    return await shader_page(
        session,
        settings,
        user=user,
        author_id=profile.id,
        sort=sort,
        cursor=cursor,
        limit=limit,
    )
