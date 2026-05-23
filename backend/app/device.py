from typing import Literal

import torch

Device = Literal["cuda", "cpu"]
RequestedDevice = Literal["auto", "cuda", "cpu"]


class CudaUnavailable(Exception):
    """Raised when 'cuda' is explicitly requested but no GPU is present."""


def detect() -> Device:
    return "cuda" if torch.cuda.is_available() else "cpu"


def resolve(requested: RequestedDevice) -> Device:
    if requested == "auto":
        return detect()
    if requested == "cpu":
        return "cpu"
    # requested == "cuda"
    if not torch.cuda.is_available():
        raise CudaUnavailable("cuda requested but unavailable")
    return "cuda"
