import uuid
from datetime import datetime, timedelta, timezone

from tests.conftest import auth


async def _seed(api, specs):
    from app.models import Profile, Shader

    base = datetime(2026, 1, 1, tzinfo=timezone.utc)
    async with api.Session() as s:
        author = Profile(id=uuid.uuid4(), handle="seed", display_name="Seed")
        s.add(author)
        await s.flush()
        for i, spec in enumerate(specs):
            s.add(
                Shader(
                    author_id=author.id,
                    title=spec.get("title", f"S{i}"),
                    description=spec.get("description"),
                    recipe={"cards": []},
                    mode=spec.get("mode", "2d"),
                    tags=spec.get("tags", []),
                    like_count=spec.get("like_count", 0),
                    created_at=spec.get("created_at", base + timedelta(minutes=i)),
                )
            )
        await s.commit()


async def test_recent_order_and_cursor_pagination(api):
    await _seed(api, [{"title": f"n{i}"} for i in range(5)])  # n0..n4, increasing time
    page1 = (await api.client.get("/api/shaders?limit=2&sort=recent")).json()
    assert [it["title"] for it in page1["items"]] == ["n4", "n3"]
    assert page1["next_cursor"]

    page2 = (
        await api.client.get(f"/api/shaders?limit=2&sort=recent&cursor={page1['next_cursor']}")
    ).json()
    assert [it["title"] for it in page2["items"]] == ["n2", "n1"]


async def test_tags_and_match(api):
    await _seed(api, [{"title": "ab", "tags": ["a", "b"]}, {"title": "a", "tags": ["a"]}])
    body = (await api.client.get("/api/shaders?tags=a,b")).json()
    assert [it["title"] for it in body["items"]] == ["ab"]


async def test_mode_filter(api):
    await _seed(api, [{"title": "two", "mode": "2d"}, {"title": "three", "mode": "3d"}])
    body = (await api.client.get("/api/shaders?mode=3d")).json()
    assert [it["title"] for it in body["items"]] == ["three"]


async def test_full_text_search(api):
    await _seed(api, [{"title": "plasma swirl"}, {"title": "voronoi cells"}])
    body = (await api.client.get("/api/shaders?q=swirl")).json()
    assert [it["title"] for it in body["items"]] == ["plasma swirl"]


async def test_sort_popular(api):
    await _seed(api, [{"title": "low", "like_count": 1}, {"title": "high", "like_count": 50}])
    body = (await api.client.get("/api/shaders?sort=popular")).json()
    assert body["items"][0]["title"] == "high"


async def test_excludes_soft_deleted(api, make_token):
    token, _ = make_token()
    created = await api.client.post(
        "/api/shaders", json={"title": "vis", "recipe": {"cards": []}}, headers=auth(token)
    )
    sid = created.json()["id"]
    await api.client.delete(f"/api/shaders/{sid}", headers=auth(token))
    body = (await api.client.get("/api/shaders")).json()
    assert all(it["id"] != sid for it in body["items"])
