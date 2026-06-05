import os

from tests.conftest import auth

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
PNG_BYTES = PNG_MAGIC + b"\x00\x00\x00\rIHDR fake-but-magic-valid payload"


async def _publish(api, token):
    r = await api.client.post(
        "/api/shaders", json={"title": "s", "recipe": {"cards": []}}, headers=auth(token)
    )
    return r.json()["id"]


async def test_author_uploads_thumbnail(api, make_token):
    token, _ = make_token()
    sid = await _publish(api, token)

    resp = await api.client.post(
        f"/api/shaders/{sid}/thumb",
        headers=auth(token),
        files={"file": ("t.png", PNG_BYTES, "image/png")},
    )
    assert resp.status_code == 200, resp.text
    thumb_url = resp.json()["thumb_url"]
    assert thumb_url.startswith("https://api.test/thumbs/")

    # file written under THUMBS_DIR with a content-addressed, sharded path
    rel = thumb_url.split("/thumbs/", 1)[1]
    assert os.path.exists(os.path.join(api.settings.thumbs_dir, rel))

    # the shader now exposes the thumbnail
    got = (await api.client.get(f"/api/shaders/{sid}")).json()
    assert got["thumb_url"] == thumb_url


async def test_non_png_rejected_415(api, make_token):
    token, _ = make_token()
    sid = await _publish(api, token)
    resp = await api.client.post(
        f"/api/shaders/{sid}/thumb",
        headers=auth(token),
        files={"file": ("t.png", b"GIF89a not really a png", "image/png")},
    )
    assert resp.status_code == 415


async def test_oversized_thumbnail_rejected_413(api, make_token):
    token, _ = make_token()
    sid = await _publish(api, token)
    big = PNG_MAGIC + b"\x00" * (3 * 1024 * 1024)
    resp = await api.client.post(
        f"/api/shaders/{sid}/thumb",
        headers=auth(token),
        files={"file": ("t.png", big, "image/png")},
    )
    assert resp.status_code == 413


async def test_non_author_cannot_upload_403(api, make_token):
    owner, _ = make_token()
    other, _ = make_token()
    sid = await _publish(api, owner)
    resp = await api.client.post(
        f"/api/shaders/{sid}/thumb",
        headers=auth(other),
        files={"file": ("t.png", PNG_BYTES, "image/png")},
    )
    assert resp.status_code == 403
