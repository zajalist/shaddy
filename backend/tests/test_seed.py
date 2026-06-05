async def test_seed_creates_shaddy_and_is_idempotent(db_session):
    from sqlalchemy import func, select

    from app.models import Profile, Shader
    from scripts.seed_curated import SHADDY_ID, seed

    entries = [
        {"id": "sunset", "title": "Sunset", "recipe": {"cards": [], "mode": "2d"}, "featured": True},
        {"id": "ripple", "title": "Ripple Pond", "recipe": {"cards": [], "mode": "3d"}, "tags": ["water"]},
    ]

    created, updated = await seed(db_session, entries)
    assert (created, updated) == (2, 0)

    # re-running updates in place — no duplicates
    assert await seed(db_session, entries) == (0, 2)

    total = (
        await db_session.execute(select(func.count()).select_from(Shader))
    ).scalar()
    assert total == 2

    shaddy = await db_session.get(Profile, SHADDY_ID)
    assert shaddy is not None and shaddy.handle == "shaddy"

    featured = (
        await db_session.execute(select(Shader).where(Shader.is_featured.is_(True)))
    ).scalars().all()
    assert len(featured) == 1

    modes = {
        s.mode for s in (await db_session.execute(select(Shader))).scalars()
    }
    assert modes == {"2d", "3d"}
