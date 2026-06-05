async def test_healthz_returns_ok(client):
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_healthz_includes_version(client):
    body = (await client.get("/healthz")).json()
    assert isinstance(body.get("version"), str) and body["version"]


async def test_cors_allows_configured_origin(client):
    resp = await client.get("/healthz", headers={"Origin": "http://localhost:5181"})
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:5181"


async def test_healthz_reports_db_connectivity(client):
    body = (await client.get("/healthz")).json()
    assert body["db"] is True  # postgres is up during the docker test run
