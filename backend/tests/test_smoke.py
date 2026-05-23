async def test_app_constructs_and_returns_404_for_unknown_route(client):
    r = await client.get("/__nope__")
    assert r.status_code == 404
