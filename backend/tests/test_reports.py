import uuid

from tests.conftest import auth


async def _publish(api, token):
    r = await api.client.post(
        "/api/shaders", json={"title": "s", "recipe": {"cards": []}}, headers=auth(token)
    )
    return r.json()["id"]


async def test_report_requires_auth(api, make_token):
    token, _ = make_token()
    sid = await _publish(api, token)
    r = await api.client.post(f"/api/shaders/{sid}/report", json={"reason": "spam"})
    assert r.status_code == 401


async def test_report_valid_then_dedup_per_reporter(api, make_token):
    author, _ = make_token()
    reporter, _ = make_token()
    sid = await _publish(api, author)

    r = await api.client.post(
        f"/api/shaders/{sid}/report",
        json={"reason": "nsfw", "detail": "bad"},
        headers=auth(reporter),
    )
    assert r.status_code == 202

    # same reporter again -> accepted but no duplicate row
    r2 = await api.client.post(
        f"/api/shaders/{sid}/report", json={"reason": "spam"}, headers=auth(reporter)
    )
    assert r2.status_code == 202

    from sqlalchemy import func, select

    from app.models import Report

    async with api.Session() as s:
        count = (
            await s.execute(
                select(func.count())
                .select_from(Report)
                .where(Report.shader_id == uuid.UUID(sid))
            )
        ).scalar()
    assert count == 1


async def test_report_invalid_reason_422(api, make_token):
    author, _ = make_token()
    reporter, _ = make_token()
    sid = await _publish(api, author)
    r = await api.client.post(
        f"/api/shaders/{sid}/report", json={"reason": "banana"}, headers=auth(reporter)
    )
    assert r.status_code == 422
