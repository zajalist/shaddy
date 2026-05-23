import base64
import io

import torch
from PIL import Image


def decode_to_tensor(image_bytes: bytes, device: str, size: tuple[int, int]) -> torch.Tensor:
    """PIL-decode raw bytes -> RGB float tensor [H, W, 3] in [0, 1] at given size.

    `size` is (W, H) per PIL convention; the returned tensor is shaped [H, W, 3].
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(size, Image.BILINEAR)
    arr = torch.frombuffer(bytearray(img.tobytes()), dtype=torch.uint8)
    arr = arr.view(size[1], size[0], 3).to(torch.float32) / 255.0
    return arr.to(device)


def encode_jpeg_b64(tensor: torch.Tensor, quality: int = 85) -> str:
    """[H, W, 3] float in [0, 1] -> 'data:image/jpeg;base64,...' at given JPEG quality."""
    t = tensor.detach().clamp(0.0, 1.0).cpu()
    arr = (t * 255).to(torch.uint8).contiguous()
    img = Image.fromarray(arr.numpy(), mode="RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"
