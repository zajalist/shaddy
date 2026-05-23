"""Modal deployment for the Shaddy backend.

To deploy (requires `pip install modal` + `modal token new` once):

    cd backend
    modal deploy deploy/modal_app.py

Modal will print a public URL such as
    https://<account>--shaddy-backend-fastapi-app.modal.run
Set that origin on the frontend via VITE_BACKEND_URL.
"""

from pathlib import Path

import modal

_BACKEND_ROOT = Path(__file__).resolve().parent.parent

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements(str(_BACKEND_ROOT / "requirements.txt"))
    .pip_install_from_requirements(str(_BACKEND_ROOT / "requirements-gpu.txt"))
    # Pre-warm LPIPS VGG weights so first request isn't a ~58MB download.
    .run_commands('python -c "import lpips; lpips.LPIPS(net=\'vgg\')"')
    # Bundle our source into the image.
    .add_local_dir(str(_BACKEND_ROOT / "app"), remote_path="/root/app")
    .add_local_dir(str(_BACKEND_ROOT / "optim"), remote_path="/root/optim")
    .add_local_dir(str(_BACKEND_ROOT / "templates"), remote_path="/root/templates")
)

app = modal.App("shaddy-backend", image=image)


@app.function(gpu="A10G", timeout=120, scaledown_window=60)
@modal.asgi_app()
def fastapi_app():
    from app.main import app as fastapi

    return fastapi
