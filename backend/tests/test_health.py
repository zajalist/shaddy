async def test_health_returns_ok_and_device(client, monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body == {"ok": True, "device": "cpu"}
