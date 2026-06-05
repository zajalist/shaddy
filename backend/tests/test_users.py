from tests.conftest import auth


async def _publish(api, token, title="s"):
    r = await api.client.post(
        "/api/shaders", json={"title": title, "recipe": {"cards": []}}, headers=auth(token)
    )
    return r.json()


async def test_user_profile_with_aggregates(api, make_token):
    author, _ = make_token()
    liker, _ = make_token()
    s1 = await _publish(api, author, "a")
    await _publish(api, author, "b")
    await api.client.post(f"/api/shaders/{s1['id']}/like", headers=auth(liker))

    handle = s1["author"]["handle"]
    prof = (await api.client.get(f"/api/users/{handle}")).json()
    assert prof["handle"] == handle
    assert prof["shader_count"] == 2
    assert prof["total_likes"] == 1


async def test_user_missing_404(api):
    assert (await api.client.get("/api/users/nobody-here")).status_code == 404


async def test_list_author_shaders_only(api, make_token):
    author, _ = make_token()
    other, _ = make_token()
    a1 = await _publish(api, author, "mine1")
    await _publish(api, author, "mine2")
    await _publish(api, other, "theirs")

    handle = a1["author"]["handle"]
    body = (await api.client.get(f"/api/users/{handle}/shaders")).json()
    titles = {it["title"] for it in body["items"]}
    assert titles == {"mine1", "mine2"}


async def test_author_shaders_exclude_deleted(api, make_token):
    author, _ = make_token()
    keep = await _publish(api, author, "keep")
    gone = await _publish(api, author, "del")
    await api.client.delete(f"/api/shaders/{gone['id']}", headers=auth(author))

    handle = keep["author"]["handle"]
    body = (await api.client.get(f"/api/users/{handle}/shaders")).json()
    assert [it["title"] for it in body["items"]] == ["keep"]
