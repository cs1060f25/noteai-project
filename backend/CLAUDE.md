# Backend Engineering Guide

**Role**: Senior backend engineer maintaining a production-ready FastAPI + Celery backend for AI-powered lecture video processing.

---

## Project Overview

Transform long lecture videos into short, AI-curated highlight clips with subtitles.

**Flow**: React uploads → S3 pre-signed URL → Celery pipeline (silence → transcript → content analysis → segmentation → compilation) → WebSocket progress → Results in S3

**Stack**: FastAPI, Celery, Redis, PostgreSQL/SQLite, AWS S3, Docker, Google Gemini AI, FFmpeg, PyDub, MoviePy

---

## Repository Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI entrypoint
│   ├── api/routes/                  # 8 route modules (upload, jobs, results, websocket, admin)
│   ├── api/dependencies/            # Auth (Clerk JWT), authorization (admin)
│   ├── models/                      # SQLAlchemy ORM + Pydantic schemas
│   ├── services/                    # Repository pattern, S3, WebSocket, validation, metrics
│   └── core/                        # Settings, database, logging, security, rate limiting
├── pipeline/
│   ├── celery_app.py                # Celery config with Prometheus
│   ├── tasks.py                     # Task definitions (BaseProcessingTask, agent tasks)
│   └── orchestrator.py              # Pipeline startup
├── agents/                          # 6 processing agents
│   ├── silence_detector.py          # PyDub audio silence detection
│   ├── transcript_agent.py          # Google Gemini transcription (chunking, timestamp remapping)
│   ├── layout_detector.py           # OpenCV layout analysis (placeholder)
│   ├── content_analyzer.py          # Gemini AI content analysis
│   ├── segment_extractor.py         # Highlight selection with silence optimization
│   ├── video_compiler.py            # FFmpeg video rendering
│   └── utils/ffmpeg_helper.py       # FFmpeg wrapper
├── tests/                           # Pytest unit/integration tests
├── scripts/                         # Dev utilities (check-all.sh, test.sh, lint.sh, format.sh)
├── docs/                            # Detailed docs (DATABASE, DOCKER, OBSERVABILITY, etc.)
├── Dockerfile                       # Multi-stage production build
├── Dockerfile.dev                   # Dev build with hot-reload
├── docker-compose.yml               # 8-service stack (API, worker, DBs, monitoring)
└── pyproject.toml                   # uv config (deps, ruff, black, mypy)
```

---

## Architecture Patterns

1. **Repository Pattern**: All database access via typed repositories in `DatabaseService`
2. **Service Layer**: Business logic separated from routes
3. **Dependency Injection**: FastAPI `Depends()` for sessions, auth
4. **Task Queue**: Long-running ops offloaded to Celery
5. **Pub/Sub**: Redis for WebSocket real-time updates
6. **Pre-signed URLs**: Direct client-S3 uploads (no proxy)
7. **Sequential Pipeline**: Chain of Celery tasks (silence → transcript → content → segment → compile)

---

## Database Models

**8 SQLAlchemy Models**:

- `Job`: Master record (status, progress, metadata)
- `Transcript`: Speech-to-text segments with timestamps
- `SilenceRegion`: Detected silence intervals
- `LayoutAnalysis`: Video layout detection (screen/camera regions)
- `ContentSegment`: AI-analyzed educational segments (importance scores, topics)
- `Clip`: Generated highlights with S3 keys
- `ProcessingLog`: Audit trail
- `User`: Clerk integration with roles

**Strategy**: Dev uses SQLite, prod uses PostgreSQL with Alembic migrations.

---

## Processing Pipeline

**Sequential Chain** (Celery):

1. **Silence Detection**: PyDub detects silence regions, stores in DB
2. **Transcription**: Gemini transcribes non-silent segments only (queries silence from DB), remaps timestamps
3. **Content Analysis**: Gemini identifies 5-15 educational segments with importance scores
4. **Segment Extraction**: Selects top 5 highlights, optimizes boundaries using silence
5. **Video Compilation**: FFmpeg generates clips, uploads to S3, marks job complete

**BaseProcessingTask**: All tasks inherit this for progress tracking, error handling, WebSocket updates, Prometheus metrics.

---

## Clean Code Standards

- **Type hints everywhere**: No `Any` unless justified
- **Pydantic models**: All I/O boundaries validated
- **Small functions**: Single responsibility
- **Docstrings**: Google-style on all public functions/classes
- **Separation of concerns**: Routes thin → services do work → agents isolated
- **Descriptive names**: No abbreviations
- **Fail fast**: Validate inputs early
- **Comments**: Lower-case, high-signal only (explain "why", not "what")

**Style**: 100 char line length, Black formatting, Ruff linting, Mypy strict mode

---

## Security

- **Auth**: Clerk JWT tokens on all routes, admin role checks
- **Validation**: Whitelist file types, size limits, content-type checks
- **Rate Limiting**: SlowAPI with Redis (3/min on upload confirm)
- **Secrets**: Environment variables only (`.env`), never log secrets
- **S3**: Pre-signed URLs with expiry (1 hour default)
- **CORS**: Explicit origins, no `*` in prod

---

## Docker Setup

**8 Services** in `docker-compose.yml`:

- `db`: PostgreSQL 15
- `redis`: Redis 7
- `api`: FastAPI (port 8000)
- `worker`: Celery worker (concurrency=2)
- `prometheus`: Metrics (port 9090)
- `grafana`: Dashboards (port 3000)
- `postgres-exporter`: DB metrics
- `loki` + `promtail`: Log aggregation

**Run Locally**:

```bash
cp .env.example .env
# Edit .env with AWS, Gemini, Clerk credentials
docker-compose up -d
docker-compose exec api alembic upgrade head
# API: http://localhost:8000/docs
# Grafana: http://localhost:3000 (admin/admin)
```

## Common Pitfalls

- Do not use `Any` type
- Do not query DB in loops (use bulk queries)
- Do not block request handlers (use Celery)
- Do not forget temp file cleanup (`finally` blocks)
- Do not expose internal errors to users
- Do not skip progress updates
- Do not hardcode config (use settings)
- Do not commit secrets
- Do not modify existing tests without user request

---

## Review Checklist

- [ ] Type hints on all functions
- [ ] Docstrings on public functions/classes
- [ ] Inputs validated (Pydantic or explicit)
- [ ] Auth/authorization on endpoints
- [ ] Tasks idempotent and retriable
- [ ] Progress updates emitted
- [ ] Temp files cleaned up
- [ ] Structured logging with job_id
- [ ] Passes `./scripts/check-all.sh`
- [ ] All tests pass

---

## Additional Resources

- **Detailed Docs**: `backend/docs/` (DATABASE, DOCKER, OBSERVABILITY, TESTING, TROUBLESHOOTING)
- **API Docs**: Run backend, visit `/docs` (Swagger) or `/redoc`
- **Tech Docs**: FastAPI, Celery, SQLAlchemy, Pydantic, Google Gemini, Clerk

---

**Last Updated**: 2025-01-06
