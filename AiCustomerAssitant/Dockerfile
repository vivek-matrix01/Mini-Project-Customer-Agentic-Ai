FROM python:3.11-slim

# Phase 4: install curl for Docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (Docker layer caching — faster rebuilds)
COPY requirement.txt .
RUN pip install --no-cache-dir -r requirement.txt

# Copy source
COPY . .

EXPOSE 8000

# Health check (used by docker-compose depends_on: condition: service_healthy)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
