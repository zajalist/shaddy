import pytest
from app import device


def test_detect_returns_cpu_when_cuda_unavailable(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    assert device.detect() == "cpu"


def test_detect_returns_cuda_when_cuda_available(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.detect() == "cuda"


def test_resolve_auto_picks_detected_device(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    assert device.resolve("auto") == "cpu"
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("auto") == "cuda"


def test_resolve_cpu_always_returns_cpu(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("cpu") == "cpu"


def test_resolve_cuda_when_available(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: True)
    assert device.resolve("cuda") == "cuda"


def test_resolve_cuda_when_unavailable_raises(monkeypatch):
    monkeypatch.setattr("torch.cuda.is_available", lambda: False)
    with pytest.raises(device.CudaUnavailable):
        device.resolve("cuda")
