import base64
import io

from PIL import Image


def png_data_url(size_px: int = 32, fill: tuple[int, int, int] = (128, 64, 200)) -> str:
    """Return a data URL for a solid-color PNG of the given size."""
    img = Image.new("RGB", (size_px, size_px), fill)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def oversized_data_url() -> str:
    """A data URL that is >1MB after base64 decode."""
    payload = b"\x00" * (1_100_000)
    b64 = base64.b64encode(payload).decode("ascii")
    return f"data:application/octet-stream;base64,{b64}"
