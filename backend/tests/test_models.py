import uuid


async def test_shader_roundtrip_with_recipe_jsonb(db_session):
    from app.models import Profile, Shader

    author = Profile(id=uuid.uuid4(), handle="alice", display_name="Alice")
    db_session.add(author)
    await db_session.flush()

    recipe = {
        "cards": [
            {"kind": "typed", "id": "c1", "type": "plasma", "enabled": True, "params": {}}
        ],
        "canvasAspect": "square",
        "mode": "2d",
    }
    shader = Shader(
        author_id=author.id,
        title="My Shader",
        recipe=recipe,
        mode="2d",
        tags=["plasma", "2d"],
    )
    db_session.add(shader)
    await db_session.flush()
    await db_session.refresh(shader)

    assert isinstance(shader.id, uuid.UUID)
    assert shader.like_count == 0
    assert shader.deleted_at is None
    assert shader.is_featured is False
    assert shader.recipe["cards"][0]["type"] == "plasma"
    assert shader.tags == ["plasma", "2d"]
    assert shader.created_at is not None


async def test_like_composite_pk_dedupes(db_session):
    from sqlalchemy import select
    from sqlalchemy.dialects.postgresql import insert

    from app.models import Like, Profile, Shader

    author = Profile(id=uuid.uuid4(), handle="bob", display_name="Bob")
    db_session.add(author)
    await db_session.flush()
    shader = Shader(author_id=author.id, title="S", recipe={"cards": []}, mode="2d")
    db_session.add(shader)
    await db_session.flush()

    # Inserting the same (user, shader) twice is a no-op via ON CONFLICT.
    stmt = insert(Like).values(user_id=author.id, shader_id=shader.id)
    await db_session.execute(stmt.on_conflict_do_nothing())
    await db_session.execute(stmt.on_conflict_do_nothing())

    rows = (await db_session.execute(select(Like))).scalars().all()
    assert len(rows) == 1
