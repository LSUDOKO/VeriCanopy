FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
COPY ai /app/ai
COPY backend /app/backend
COPY data/demo /app/data/demo
COPY contracts/deployments /app/contracts/deployments
RUN pip install --no-cache-dir -e /app/ai -e "/app/backend[postgres]"
WORKDIR /app/backend
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
