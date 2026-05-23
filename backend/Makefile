.PHONY: install install-gpu dev test lint clean

install:
	pip install -r requirements.txt

install-gpu: install
	pip install -r requirements-gpu.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -q

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
