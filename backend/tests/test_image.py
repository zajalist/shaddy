import base64
import io

import torch
from PIL import Image

from optim import image as imgmod


def test_decode_returns_hwc_float_in_zero_one():
    img = Image.new("RGB", (8, 12), color=(255, 128, 0))  # WxH
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw = buf.getvalue()

    t = imgmod.decode_to_tensor(raw, device="cpu", size=(16, 16))
    assert t.shape == (16, 16, 3)
    assert t.dtype == torch.float32
    assert t.min() >= 0.0 and t.max() <= 1.0
    # Center pixel should still be orange-ish after resize.
    assert t[8, 8, 0] > 0.5
    assert t[8, 8, 2] < 0.5


def test_encode_jpeg_b64_round_trip():
    t = torch.full((32, 32, 3), 0.5)
    s = imgmod.encode_jpeg_b64(t, quality=85)
    assert s.startswith("data:image/jpeg;base64,")
    raw = base64.b64decode(s.split(",", 1)[1])
    img = Image.open(io.BytesIO(raw))
    assert img.format == "JPEG"
    assert img.size == (32, 32)


def test_encode_jpeg_b64_clamps_out_of_range():
    t = torch.tensor([[[2.0, -1.0, 0.5]]], dtype=torch.float32)
    s = imgmod.encode_jpeg_b64(t)
    assert s.startswith("data:image/jpeg;base64,")  # didn't crash
