# Docker Setup Guide

## Services Overview

The application runs three containerized services:

### 1. PostgreSQL Database (`db`)
- **Image:** postgres:15-alpine
- **Port:** 5432
- **Credentials:**
  - User: `lecture_user`
  - Password: `lecture_password`
  - Database: `lecture_extractor`
- **Volume:** `postgres_data` (persistent storage)
- **Health Check:** Checks database readiness every 10s

### 2. Redis Cache & Message Broker (`redis`)
- **Image:** redis:7-alpine
- **Port:** 6379
- **Purpose:** Celery broker and caching
- **Health Check:** Pings Redis every 10s

### 3. FastAPI Application (`api`)
- **Image:** Custom (built from Dockerfile)
- **Port:** 8000
- **Dependencies:** Waits for `db` and `redis` to be healthy
- **Features:**
  - Python 3.11 with uv package manager
  - FFmpeg for video processing
  - Hot-reload enabled in development
  - Non-root user for security

## Quick Start

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f db
docker-compose logs -f redis

# Stop all services
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

## Service URLs

- **API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

## Database Access

### Via Docker

```bash
# Connect to PostgreSQL
docker-compose exec db psql -U lecture_user -d lecture_extractor

# Run SQL commands
docker-compose exec db psql -U lecture_user -d lecture_extractor -c "SELECT version();"
```

### Via Local Client

```bash
# Using psql
psql -h localhost -p 5432 -U lecture_user -d lecture_extractor

# Using connection string
postgresql://lecture_user:lecture_password@localhost:5432/lecture_extractor
```

## Redis Access

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Test connection
docker-compose exec redis redis-cli ping
# Response: PONG

# Monitor Redis commands in real-time
docker-compose exec redis redis-cli monitor
```

## Troubleshooting

### Services won't start

```bash
# Check service status
docker-compose ps

# Check for port conflicts
lsof -i :8000  # API
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Rebuild containers
docker-compose up --build --force-recreate
```

### Database connection issues

```bash
# Check database health
docker-compose exec db pg_isready -U lecture_user

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Clear all data and restart

```bash
# Stop everything
docker-compose down -v

# Remove all containers and volumes
docker-compose rm -f
docker volume prune

# Restart fresh
docker-compose up --build
```

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

**Important variables:**
- `DATABASE_URL`: Auto-configured for Docker
- `REDIS_URL`: Auto-configured for Docker
- `AWS_ACCESS_KEY_ID`: Required for S3
- `OPENAI_API_KEY`: Required for Whisper
- `GEMINI_API_KEY`: Required for content analysis

## Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect lecture-highlight-extractor_postgres_data

# Remove specific volume
docker volume rm lecture-highlight-extractor_postgres_data

# Remove all unused volumes
docker volume prune
```

## Network Management

```bash
# List networks
docker network ls

# Inspect network
docker network inspect lecture-highlight-extractor_lecture-network

# Connect to network (if needed)
docker network connect lecture-network <container-name>
```

## Development Tips

### Hot Reload

The API service has hot reload enabled. Changes to Python files will automatically restart the server.

```bash
# Watch logs while developing
docker-compose logs -f api
```

### Running Commands in Containers

```bash
# Run Python shell
docker-compose exec api python

# Run tests
docker-compose exec api pytest

# Format code
docker-compose exec api black .

# Lint code
docker-compose exec api ruff check .
```

### Database Migrations

```bash
# Create migration
docker-compose exec api alembic revision --autogenerate -m "add users table"

# Apply migrations
docker-compose exec api alembic upgrade head

# Rollback
docker-compose exec api alembic downgrade -1
```

## Production Considerations

For production deployment:

1. **Use secrets management** - Don't use plain text passwords
2. **Enable SSL** - Configure PostgreSQL SSL
3. **Separate networks** - Isolate database from public access
4. **Use external volumes** - For data persistence
5. **Configure backups** - Regular PostgreSQL backups
6. **Resource limits** - Add memory/CPU limits to services
7. **Health checks** - Monitor all services
8. **Logging** - Configure centralized logging

Example production additions:

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Useful Commands Cheat Sheet

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart single service
docker-compose restart api

# View logs
docker-compose logs -f api

# Execute command in service
docker-compose exec api <command>

# Build without cache
docker-compose build --no-cache

# Scale service (if configured)
docker-compose up -d --scale worker=3

# Show resource usage
docker stats

# Clean up everything
docker-compose down -v
docker system prune -a
```
