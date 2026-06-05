from tests.conftest import auth, simple_recipe


async def test_publish_requires_auth(api):
    resp = await api.client.post(
        "/api/shaders", json={"title": "x", "recipe": simple_recipe()}
    )
    assert resp.status_code == 401


async def test_publish_then_fetch(api, make_token):
    token, sub = make_token()
    resp = await api.client.post(
        "/api/shaders",
        json={"title": "Sunset", "description": "warm", "recipe": simple_recipe(), "tags": ["Gradient", "warm"]},
        headers=auth(token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["title"] == "Sunset"
    assert body["mode"] == "2d"
    assert body["tags"] == ["gradient", "warm"]  # lowercased
    assert body["like_count"] == 0
    assert body["author"]["id"] == sub
    shader_id = body["id"]

    got = await api.client.get(f"/api/shaders/{shader_id}")
    assert got.status_code == 200
    assert got.json()["recipe"]["cards"][0]["type"] == "plasma"


async def test_mode_derived_from_recipe(api, make_token):
    token, _ = make_token()
    resp = await api.client.post(
        "/api/shaders",
        json={"title": "3D thing", "recipe": simple_recipe(mode="3d")},
        headers=auth(token),
    )
    assert resp.json()["mode"] == "3d"


async def test_get_missing_is_404(api):
    import uuid

    resp = await api.client.get(f"/api/shaders/{uuid.uuid4()}")
    assert resp.status_code == 404


async def test_recipe_without_cards_rejected(api, make_token):
    token, _ = make_token()
    resp = await api.client.post(
        "/api/shaders",
        json={"title": "bad", "recipe": {"not": "a recipe"}},
        headers=auth(token),
    )
    assert resp.status_code == 422


async def test_oversized_recipe_rejected(api, make_token):
    token, _ = make_token()
    big = {"cards": [], "blob": "x" * (300 * 1024)}
    resp = await api.client.post(
        "/api/shaders", json={"title": "big", "recipe": big}, headers=auth(token)
    )
    assert resp.status_code == 413


async def test_author_can_soft_delete(api, make_token):
    token, _ = make_token()
    created = await api.client.post(
        "/api/shaders", json={"title": "del", "recipe": simple_recipe()}, headers=auth(token)
    )
    sid = created.json()["id"]
    deleted = await api.client.delete(f"/api/shaders/{sid}", headers=auth(token))
    assert deleted.status_code == 204
    # soft-deleted -> gone from reads
    assert (await api.client.get(f"/api/shaders/{sid}")).status_code == 404


async def test_non_author_cannot_delete(api, make_token):
    owner_token, _ = make_token()
    other_token, _ = make_token()
    created = await api.client.post(
        "/api/shaders", json={"title": "mine", "recipe": simple_recipe()}, headers=auth(owner_token)
    )
    sid = created.json()["id"]
    resp = await api.client.delete(f"/api/shaders/{sid}", headers=auth(other_token))
    assert resp.status_code == 403
