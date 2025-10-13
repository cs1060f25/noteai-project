# Database Usage Guide

## File Structure

```
backend/app/
├── core/
│   └── database.py          # Database engine, session factory, init_db()
├── models/
│   ├── database.py          # SQLAlchemy ORM models (tables)
│   └── schemas.py           # Pydantic models (API validation)
```

## Purpose of Each File

### 1. `app/core/database.py` - Database Connection

**Purpose:** Database engine and session management

**Contains:**
- `engine` - SQLAlchemy engine with connection pooling
- `SessionLocal` - Session factory
- `get_db()` - FastAPI dependency for getting DB sessions
- `init_db()` - Initialize database tables

**Usage in routes:**
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

@router.get("/jobs/{job_id}")
async def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.job_id == job_id).first()
    return job
```

---

### 2. `app/models/database.py` - ORM Models

**Purpose:** SQLAlchemy table definitions and relationships

**Contains:**
- `Base` - Declarative base for all models
- `Job` - Jobs table ORM model
- `Transcript` - Transcripts table ORM model
- `SilenceRegion` - Silence regions table ORM model
- `LayoutAnalysis` - Layout analysis table ORM model
- `ContentSegment` - Content segments table ORM model
- `Clip` - Clips table ORM model
- `ProcessingLog` - Processing logs table ORM model

**Usage:**
```python
from app.models.database import Job, Clip
from sqlalchemy.orm import Session

# Create
job = Job(
    job_id="job_123",
    filename="video.mp4",
    status="queued"
)
db.add(job)
db.commit()

# Query
job = db.query(Job).filter(Job.job_id == "job_123").first()

# Update
job.status = "running"
db.commit()

# Delete (cascades to related records)
db.delete(job)
db.commit()
```

---

### 3. `app/models/schemas.py` - Pydantic Models

**Purpose:** API request/response validation and serialization

**Contains:**
- Request models: `UploadRequest`, `JobCreate`
- Response models: `JobResponse`, `ClipMetadata`, `ResultsResponse`
- Enums: `JobStatus`, `ProcessingStage`
- WebSocket models: `WSMessage`, `WSProgressUpdate`

**Usage in routes:**
```python
from app.models.schemas import JobResponse, JobCreate

@router.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    # Pydantic validates input
    job = Job(**job_data.dict())
    db.add(job)
    db.commit()
    
    # Pydantic serializes output
    return JobResponse(**job.to_dict())
```

---

## Common Patterns

### Creating a New Job

```python
from app.core.database import get_db
from app.models.database import Job
from app.models.schemas import JobCreate, JobResponse
from fastapi import Depends
from sqlalchemy.orm import Session

@router.post("/jobs", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db)
):
    # create database record
    job = Job(
        job_id=generate_uuid(),
        filename=job_data.filename,
        file_size=job_data.file_size,
        original_s3_key=job_data.s3_key,
        content_type="video/mp4",
        status="queued"
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # return pydantic response
    return JobResponse(**job.to_dict())
```

### Querying with Relationships

```python
from app.models.database import Job, Clip

# get job with all clips
job = db.query(Job).filter(Job.job_id == job_id).first()
clips = job.clips  # Uses relationship

# or explicit join
results = (
    db.query(Job, Clip)
    .join(Clip, Job.job_id == Clip.job_id)
    .filter(Job.job_id == job_id)
    .all()
)
```

### Converting Between Models

```python
# Database → API Response
job_db = db.query(Job).first()
job_response = JobResponse(**job_db.to_dict())

# API Request → Database
job_create = JobCreate(filename="video.mp4", file_size=1000, s3_key="uploads/...")
job_db = Job(
    job_id=generate_uuid(),
    **job_create.dict()
)
```

---

## Database Initialization

The database is automatically initialized on application startup in `app/main.py`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from app.core.database import init_db
    init_db()  # Creates all tables
    yield
    # Shutdown
```

---

## Migration Workflow (Alembic)

Once Alembic is set up:

```bash
# Create migration
alembic revision --autogenerate -m "add new field"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Testing

```python
from app.core.database import SessionLocal
from app.models.database import Job

def test_create_job():
    db = SessionLocal()
    try:
        job = Job(job_id="test_123", filename="test.mp4", status="queued")
        db.add(job)
        db.commit()
        
        assert db.query(Job).filter(Job.job_id == "test_123").first() is not None
    finally:
        db.close()
```

---

## Best Practices

1. **Always use `Depends(get_db)`** for route handlers
2. **Close sessions** - The `get_db()` dependency handles this automatically
3. **Use Pydantic models** for all API input/output
4. **Use SQLAlchemy models** for all database operations
5. **Never expose internal DB fields** (like `id`, `celery_task_id`) in API responses
6. **Use relationships** instead of manual joins when possible
7. **Call `.to_dict()`** on SQLAlchemy models to convert to Pydantic-compatible dicts

---

## Connection Pooling

Configured in `app/core/database.py`:

- `pool_pre_ping=True` - Verifies connections are alive before using
- `pool_recycle=3600` - Recycles connections after 1 hour
- Default pool size: 5 connections
- Max overflow: 10 additional connections

---

## Summary

| File | Purpose | Usage |
|------|---------|-------|
| `core/database.py` | Engine & sessions | Import `get_db`, `init_db` |
| `models/database.py` | Table definitions | Import ORM classes: `Job`, `Clip`, etc. |
| `models/schemas.py` | API validation | Import Pydantic models for routes |

**The flow:**
```
API Request (JSON) → Pydantic (schemas.py) validates
                                 ↓
                     Business Logic (routes)
                                 ↓
                     SQLAlchemy (database.py) persists
                                 ↓
                     PostgreSQL Database
                                 ↓
                     SQLAlchemy (database.py) queries
                                 ↓
                     Business Logic (routes)
                                 ↓
API Response (JSON) ← Pydantic (schemas.py) serializes
```
