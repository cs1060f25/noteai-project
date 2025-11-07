# Video Processing Pipeline Optimization Plan

**Status**: 🔵 Planning Phase
**Date**: 2025-01-06
**Priority**: High (Performance & Cost)

---

## Executive Summary

### Current Problems
1. **Triple Download**: Same video downloaded 3x from S3 (silence, transcription, compilation)
2. **Unnecessary S3 Storage**: Originals uploaded to S3, then downloaded 3x for processing
3. **Worker Competition**: `concurrency=2` allows jobs to compete for resources

### Proposed Solution
**Phase 1: Single-Worker Job Affinity**
- Orchestrator task downloads video once, runs entire pipeline
- `concurrency=1` per worker → one job per worker
- Parallel sub-tasks within jobs (Gemini API calls)

**Phase 2: Source-Direct Processing**
- Workers download directly from YouTube or user upload
- No S3 storage for originals (only clips/thumbnails)
- Ephemeral pre-signed URLs for user uploads (1-hour expiry)

### Impact

| Metric | Current | After Phase 1 | After Phase 2 |
|--------|---------|---------------|---------------|
| S3 Downloads/job | 3 × 1GB | 1 × 1GB | 0 |
| S3 Storage/job | 1.5GB | 1.5GB | 0.5GB |
| Pipeline Duration | 16 min | 12 min | 10 min |
| S3 Cost (1000 videos) | $774/year | $549/year | $183/year |

**Total Savings: $591/year (76% reduction)**

---

## Phase 1: Orchestrator Pattern

### 1. Create Orchestrator Task
**File**: `backend/pipeline/tasks.py`

```python
@celery_app.task(bind=True, base=BaseProcessingTask)
def process_video_optimized(self, job_id: str) -> dict[str, Any]:
    """Download once, run entire pipeline on single worker."""

    # Download video once
    video_path = download_video_from_s3_to_temp(job_id)

    try:
        # Run all agents with local video path
        silence_result = detect_silence(None, job_id, local_video_path=video_path)
        transcript_result = generate_transcript(None, job_id, local_video_path=video_path)
        content_result = analyze_content({}, job_id)
        segment_result = extract_segments({}, {}, {}, job_id)

        db = get_task_db()
        try:
            compilation_result = compile_clips(job_id, db, local_video_path=video_path)
        finally:
            db.close()

        self.mark_job_completed(job_id)
        return {"job_id": job_id, "status": "completed"}

    finally:
        # Cleanup temp file
        if video_path and os.path.exists(video_path):
            os.unlink(video_path)
```

### 2. Refactor Agent Functions
**Files**: `silence_detector.py`, `transcript_agent.py`, `video_compiler.py`

Add `local_video_path` parameter to each agent:

```python
def detect_silence(s3_key: str, job_id: str, local_video_path: str | None = None) -> dict:
    """Detect silence - use local path if provided, else download from S3."""

    if local_video_path and os.path.exists(local_video_path):
        temp_video_path = local_video_path
        cleanup_required = False
    else:
        temp_video_path = download_video_from_s3(s3_key)
        cleanup_required = True

    try:
        # ... existing logic ...
        return result
    finally:
        if cleanup_required and os.path.exists(temp_video_path):
            os.unlink(temp_video_path)
```

### 3. Enable Parallel Content Analysis
**File**: `content_analyzer.py`

```python
from concurrent.futures import ThreadPoolExecutor

def analyze_content(transcript_data: dict, job_id: str) -> dict:
    """Analyze content with parallel Gemini API calls for large transcripts."""

    transcript_text = format_transcript_for_gemini(transcripts)

    # Parallel analysis for large transcripts
    if len(transcript_text) > 10000:
        chunks = split_into_chunks(transcript_text, chunk_size=5000)

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(analyze_chunk, chunk, job_id) for chunk in chunks]
            results = [f.result() for f in futures]

        merged_segments = merge_results(results)
    else:
        merged_segments = analyze_with_gemini(transcript_text, job_id)

    store_content_segments(merged_segments, job_id)
    return {"segments_created": len(merged_segments)}
```

### 4. Update Docker Configuration
**File**: `docker-compose.yml`

```yaml
worker:
  command: celery -A pipeline.celery_app worker --loglevel=info --concurrency=1
  deploy:
    replicas: 3  # Scale to 3 workers for parallelism across jobs
```

**Scale workers**: `docker-compose up --scale worker=5 -d`

---

## Phase 2: Source-Direct Processing

### 1. Database Migration
**File**: `alembic/versions/0008_video_source_tracking.py`

```python
def upgrade():
    # Add source tracking fields
    op.add_column('jobs', sa.Column('video_source_type', sa.String(20), nullable=True))
    op.add_column('jobs', sa.Column('video_source_url', sa.String(1000), nullable=True))
    op.add_column('jobs', sa.Column('video_source_metadata', sa.JSON, nullable=True))

    # Make original_s3_key nullable (backwards compatibility)
    op.alter_column('jobs', 'original_s3_key', nullable=True)
```

### 2. Update Job Model
**File**: `app/models/database.py`

```python
class Job(Base):
    # ... existing fields ...

    # Legacy (now optional)
    original_s3_key = Column(String(500), nullable=True)

    # New source tracking
    video_source_type = Column(String(20))  # "youtube", "user_upload"
    video_source_url = Column(String(1000), nullable=True)  # YouTube URL or pre-signed URL
    video_source_metadata = Column(JSON, nullable=True)
```

### 3. Update YouTube Upload
**File**: `app/api/routes/upload.py`

```python
@router.post("/upload/from-youtube")
async def upload_from_youtube(youtube_request: YouTubeUploadRequest, ...):
    """Process YouTube video - NO S3 upload for original."""

    # Extract metadata (don't download yet)
    video_info = youtube_service.get_video_info(youtube_request.url)

    # Create job with YouTube source (NO S3 upload)
    job = Job(
        job_id=f"job_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        filename=f"{video_info['title']}.mp4",
        video_source_type="youtube",
        video_source_url=youtube_request.url,
        video_source_metadata={
            "video_id": video_info.get("id"),
            "title": video_info.get("title"),
            "duration": video_info.get("duration"),
        },
        original_s3_key=None,  # No S3 storage
        status="queued",
    )

    db.add(job)
    db.commit()

    # Worker downloads directly from YouTube
    task = process_video_optimized.delay(job.job_id)
    return {"job_id": job.job_id, "task_id": task.id}
```

### 4. Update User Upload
**File**: `app/api/routes/upload.py`

```python
@router.post("/upload")
async def initiate_upload(upload_request: UploadRequest, ...):
    """Generate ephemeral pre-signed URL (1-hour expiry)."""

    job_id = f"job_{uuid.uuid4().hex[:12]}"
    s3_key = s3_service.generate_object_key(job_id, upload_request.filename)

    # Ephemeral URL (valid 1 hour only)
    presigned_url = s3_service.generate_presigned_upload_url(s3_key, expiry=3600)

    job = Job(
        job_id=job_id,
        user_id=current_user.id,
        filename=upload_request.filename,
        video_source_type="user_upload",
        video_source_url=presigned_url,  # Ephemeral
        original_s3_key=s3_key,  # Temporary (for download only)
        status="pending",
    )

    db.add(job)
    db.commit()

    return {"job_id": job_id, "upload_url": presigned_url, "expires_in": 3600}
```

### 5. Update Orchestrator for Source-Direct
**File**: `pipeline/tasks.py`

```python
def download_video_from_source(job_id: str) -> str:
    """Download from YouTube or ephemeral URL (not S3)."""

    db = get_task_db()
    job = db.query(Job).filter(Job.job_id == job_id).first()

    temp_path = f"/tmp/{job_id}/original.mp4"
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)

    if job.video_source_type == "youtube":
        # Download directly from YouTube
        youtube_service.download_video(job.video_source_url, temp_path)

    elif job.video_source_type == "user_upload":
        # Download from ephemeral pre-signed URL
        response = requests.get(job.video_source_url, stream=True, timeout=300)
        response.raise_for_status()

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

    return temp_path


@celery_app.task(bind=True, base=BaseProcessingTask)
def process_video_optimized(self, job_id: str) -> dict[str, Any]:
    """Optimized pipeline with source-direct download."""

    # Download from source (YouTube or ephemeral URL)
    video_path = download_video_from_source(job_id)

    try:
        # Run pipeline (same as Phase 1)
        silence_result = detect_silence(None, job_id, local_video_path=video_path)
        # ... rest of pipeline
    finally:
        if os.path.exists(video_path):
            os.unlink(video_path)
```

### 6. Add S3 Lifecycle Rule
**AWS Console or boto3**:
```yaml
lifecycle_rules:
  - id: delete-ephemeral-uploads
    prefix: uploads/
    expiration_days: 1  # Delete after 24 hours
```

---

## Migration Strategy

### Feature Flags
```python
# settings.py
use_optimized_pipeline: bool = Field(default=False, env="USE_OPTIMIZED_PIPELINE")
use_source_direct_processing: bool = Field(default=False, env="USE_SOURCE_DIRECT_PROCESSING")
```

### Gradual Rollout
```bash
# Week 1: Test Phase 1 (10% traffic)
export USE_OPTIMIZED_PIPELINE=false  # Manually test select jobs

# Week 2: Enable Phase 1 (100%)
export USE_OPTIMIZED_PIPELINE=true

# Week 3: Test Phase 2 (10% traffic)
export USE_SOURCE_DIRECT_PROCESSING=false  # Manual testing

# Week 4: Enable Phase 2 (100%)
export USE_SOURCE_DIRECT_PROCESSING=true
```

### Rollback Plan
```bash
# If issues arise
export USE_OPTIMIZED_PIPELINE=false
export USE_SOURCE_DIRECT_PROCESSING=false
docker-compose restart worker
```

---

## Testing Checklist

**Phase 1:**
- [ ] Single download, reused across all agents
- [ ] Temp file cleanup after completion
- [ ] Parallel content analysis (Gemini)
- [ ] Worker affinity (one job per worker)
- [ ] Horizontal scaling (`--scale worker=5`)

**Phase 2:**
- [ ] YouTube download (source-direct)
- [ ] User upload (ephemeral URL)
- [ ] YouTube video unavailable (404, private)
- [ ] Pre-signed URL expiration handling
- [ ] S3 lifecycle cleanup (24 hours)

**Performance:**
- [ ] Compare pipeline duration (old vs new)
- [ ] Monitor S3 transfer metrics
- [ ] Validate clip quality (no degradation)

---

## Useful Commands

```bash
# Scale workers
docker-compose up --scale worker=5 -d

# Monitor Celery
celery -A pipeline.celery_app inspect active
celery -A pipeline.celery_app inspect stats

# Test YouTube upload
curl -X POST http://localhost:8000/upload/from-youtube \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://youtube.com/watch?v=..."}'
```

---

**End of Document**
