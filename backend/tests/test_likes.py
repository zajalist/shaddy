import uuid

from tests.conftest import auth


async def _publish(api, token, title="s"):
    r = await api.client.post(
        "/api/shaders", json={"title": title, "recipe": {"cards": []}}, headers=auth(token)
    )
    return r.json()["id"]


async def test_like_requires_auth(api, make_token):
    token, _ = make_token()
    sid = await _publish(api, token)
    assert (await api.client.post(f"/api/shaders/{sid}/like")).status_code == 401


async def test_like_is_idempotent_and_increments_once(api, make_token):
    author, _ = make_token()
    liker, _ = make_token()
    sid = await _publish(api, author)

    r1 = await api.client.post(f"/api/shaders/{sid}/like", headers=auth(liker))
    assert r1.status_code == 200
    assert r1.json() == {"like_count": 1, "liked": True}

    r2 = await api.client.post(f"/api/shaders/{sid}/like", headers=auth(liker))
    assert r2.json()["like_count"] == 1  # idempotent


async def test_unlike_decrements_and_never_negative(api, make_token):
    author, _ = make_token()
    liker, _ = make_token()
    sid = await _publish(api, author)
    await api.client.post(f"/api/shaders/{sid}/like", headers=auth(liker))

    r = await api.client.delete(f"/api/shaders/{sid}/like", headers=auth(liker))
    assert r.json() == {"like_count": 0, "liked": False}

    r2 = await api.client.delete(f"/api/shaders/{sid}/like", headers=auth(liker))
    assert r2.json()["like_count"] == 0  # stays at floor


async def test_like_missing_shader_404(api, make_token):
    token, _ = make_token()
    r = await api.client.post(f"/api/shaders/{uuid.uuid4()}/like", headers=auth(token))
    assert r.status_code == 404


async def test_liked_by_me_in_list(api, make_token):
    author, _ = make_token()
    liker, _ = make_token()
    sid = await _publish(api, author)
    await api.client.post(f"/api/shaders/{sid}/like", headers=auth(liker))

    mine = (await api.client.get("/api/shaders", headers=auth(liker))).json()["items"]
    assert next(it for it in mine if it["id"] == sid)["liked_by_me"] is True

    anon = (await api.client.get("/api/shaders")).json()["items"]
    assert next(it for it in anon if it["id"] == sid)["liked_by_me"] is False
