# Production image: API + indexer + finalizer in one process (backend/app/run_all.py).
# Build from the repo root:  docker build -f backend/Dockerfile -t vericanopy-backend .
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git curl && rm -rf /var/lib/apt/lists/*
COPY ai/pyproject.toml /app/ai/pyproject.toml
COPY backend/pyproject.toml /app/backend/pyproject.toml
# install deps first (cache layer), then sources
COPY ai /app/ai
COPY backend /app/backend
RUN pip install -e /app/ai -e "/app/backend[postgres]"
COPY data/demo /app/data/demo
COPY contracts/deployments /app/contracts/deployments
COPY contracts/verifier/Halo2Verifier.json /app/contracts/verifier/Halo2Verifier.json
COPY scripts /app/scripts
RUN git -C /app init -q && git -C /app config user.email ci@vericanopy && git -C /app config user.name ci \
    && git -C /app add -A >/dev/null && git -C /app commit -qm image || true
WORKDIR /app/backend
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://127.0.0.1:${PORT:-8000}/healthz || exit 1
CMD ["python", "-m", "app.run_all"]
