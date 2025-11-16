# Database Schema Documentation

**Project:** AI Lecture Highlight Extractor
**Database:** PostgreSQL
**ORM:** SQLAlchemy 2.0+
**Last Updated:** October 13, 2025

---

## Schema Overview

The database consists of **7 tables** that support the entire lecture processing pipeline:

1. **jobs** - Main job tracking
2. **transcripts** - Whisper transcription results
3. **silence_regions** - Detected silence/blank sections
4. **layout_analysis** - Screen/camera layout detection
5. **content_segments** - Gemini content analysis
6. **clips** - Generated highlight videos
7. **processing_logs** - Audit trail and debugging

---

## Entity Relationship Diagram

```
                        ┌─────────────────────────────────┐
                        │            JOBS                 │
                        │  • job_id (PK, UUID)            │
                        │  • filename, file_size          │
                        │  • original_s3_key              │
                        │  • status, progress             │
                        │  • video_duration               │
                        └───────────────┬─────────────────┘
                                        │
                ┌───────────────────────┼───────────────────────┬──────────────┐
                │                       │                       │              │
                ▼                       ▼                       ▼              ▼
        ┌───────────────┐       ┌──────────────┐      ┌──────────────┐ ┌──────────────┐
        │  TRANSCRIPTS  │       │   SILENCE    │      │    LAYOUT    │ │   CONTENT    │
        │               │       │   REGIONS    │      │   ANALYSIS   │ │  SEGMENTS    │
        │ 1:N with job  │       │              │      │              │ │              │
        │               │       │ 1:N with job │      │ 1:1 with job │ │ 1:N with job │
        └───────────────┘       └──────────────┘      └──────────────┘ └──────┬───────┘
                                                                                │
                                                                                │ 1:1
                                                                                ▼
                                                                        ┌──────────────┐
                                                                        │    CLIPS     │
                                                                        │              │
                                                                        │ 1:N with job │
                                                                        └──────────────┘

        ┌──────────────────┐
        │ PROCESSING_LOGS  │
        │                  │
        │  1:N with job    │
        └──────────────────┘
```

---

## Table Definitions

### 1. jobs

**Purpose:** Track lecture processing jobs from upload to completion

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `job_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for API access |
| `filename` | VARCHAR(255) | NOT NULL | Original filename |
| `file_size` | INTEGER | NOT NULL | File size in bytes |
| `content_type` | VARCHAR(100) | NOT NULL | MIME type (video/mp4, etc.) |
| `original_s3_key` | VARCHAR(500) | NOT NULL | S3 object key for source video |
| `video_duration` | FLOAT | NULL | Total duration in seconds |
| `video_metadata` | JSON | DEFAULT {} | Resolution, fps, codec, etc. |
| `status` | VARCHAR(20) | NOT NULL, INDEXED | queued, running, completed, failed |
| `error_message` | TEXT | NULL | Error details if failed |
| `celery_task_id` | VARCHAR(100) | NULL, INDEXED | Celery task identifier |
| `current_stage` | VARCHAR(50) | NULL | Current processing stage |
| `progress_percent` | FLOAT | DEFAULT 0.0 | Progress 0-100 |
| `progress_message` | VARCHAR(500) | NULL | User-friendly progress message |
| `eta_seconds` | INTEGER | NULL | Estimated time remaining |
| `metadata` | JSON | DEFAULT {} | Additional job metadata |
| `created_at` | DATETIME | NOT NULL, INDEXED | Job creation timestamp |
| `updated_at` | DATETIME | NOT NULL | Last update timestamp |
| `completed_at` | DATETIME | NULL | Completion timestamp |

**Relationships:**
- ONE-TO-MANY with `transcripts`
- ONE-TO-MANY with `silence_regions`
- ONE-TO-ONE with `layout_analysis`
- ONE-TO-MANY with `content_segments`
- ONE-TO-MANY with `clips`
- ONE-TO-MANY with `processing_logs`

**Indexes:**
- `job_id` (unique)
- `status` (for filtering)
- `celery_task_id` (task lookup)
- `created_at` (sorting)

---

### 2. transcripts

**Purpose:** Store Whisper API transcription results with timestamps

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `segment_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for segment |
| `job_id` | VARCHAR(100) | FOREIGN KEY, NOT NULL, INDEXED | Reference to jobs table |
| `start_time` | FLOAT | NOT NULL, INDEXED | Start time in seconds |
| `end_time` | FLOAT | NOT NULL | End time in seconds |
| `text` | TEXT | NOT NULL | Transcribed text |
| `confidence` | FLOAT | NULL | Confidence score (0-1) |
| `speaker_id` | VARCHAR(50) | NULL | Speaker identifier (future use) |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Relationships:**
- MANY-TO-ONE with `jobs` via `job_id`

**Indexes:**
- `segment_id` (unique)
- `job_id` (foreign key)
- `start_time` (range queries)

**Sample Data:**
```json
{
  "segment_id": "trans_abc123",
  "job_id": "job_xyz789",
  "start_time": 10.5,
  "end_time": 15.2,
  "text": "Today we'll discuss data structures...",
  "confidence": 0.98,
  "speaker_id": null
}
```

---

### 3. silence_regions

**Purpose:** Track detected silence/blank sections for intelligent editing

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `region_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for region |
| `job_id` | VARCHAR(100) | FOREIGN KEY, NOT NULL, INDEXED | Reference to jobs table |
| `start_time` | FLOAT | NOT NULL, INDEXED | Start time in seconds |
| `end_time` | FLOAT | NOT NULL | End time in seconds |
| `duration` | FLOAT | NOT NULL | Duration in seconds |
| `silence_type` | VARCHAR(20) | NOT NULL | audio_silence, blank_screen, both |
| `amplitude_threshold` | FLOAT | NULL | Detection threshold used |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Relationships:**
- MANY-TO-ONE with `jobs` via `job_id`

**Indexes:**
- `region_id` (unique)
- `job_id` (foreign key)
- `start_time` (range queries)

**silence_type Values:**
- `audio_silence` - No audio activity detected
- `blank_screen` - Blank/black video frames
- `both` - Both audio and video silence

---

### 4. layout_analysis

**Purpose:** Store screen/camera layout detection results (one per job)

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `layout_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for layout |
| `job_id` | VARCHAR(100) | FOREIGN KEY, UNIQUE, NOT NULL | Reference to jobs table |
| `screen_region` | JSON | NOT NULL | {x, y, width, height} normalized 0-1 |
| `camera_region` | JSON | NOT NULL | {x, y, width, height} normalized 0-1 |
| `split_ratio` | FLOAT | NOT NULL | Screen:camera ratio (e.g., 0.7 for 70/30) |
| `layout_type` | VARCHAR(30) | NOT NULL | side_by_side, picture_in_picture, etc. |
| `confidence_score` | FLOAT | NULL | Detection confidence (0-1) |
| `sample_frame_time` | FLOAT | NULL | Timestamp of analyzed frame |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Relationships:**
- ONE-TO-ONE with `jobs` via `job_id`

**Indexes:**
- `layout_id` (unique)
- `job_id` (foreign key, unique)

**layout_type Values:**
- `side_by_side` - Screen and camera side-by-side
- `picture_in_picture` - Camera overlaid on screen
- `full_screen` - Only screen content
- `split_vertical` - Vertical split
- `custom` - Other layouts

**Sample JSON Regions:**
```json
{
  "screen_region": {"x": 0, "y": 0, "width": 0.7, "height": 1.0},
  "camera_region": {"x": 0.7, "y": 0, "width": 0.3, "height": 1.0}
}
```

---

### 5. content_segments

**Purpose:** Store Gemini content analysis and topic-based segmentation

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `segment_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for segment |
| `job_id` | VARCHAR(100) | FOREIGN KEY, NOT NULL, INDEXED | Reference to jobs table |
| `start_time` | FLOAT | NOT NULL, INDEXED | Start time in seconds |
| `end_time` | FLOAT | NOT NULL | End time in seconds |
| `duration` | FLOAT | NOT NULL | Duration in seconds |
| `topic` | VARCHAR(500) | NOT NULL | Main topic/title |
| `description` | TEXT | NULL | Detailed description |
| `importance_score` | FLOAT | NOT NULL, INDEXED | Score 0-1 from Gemini |
| `keywords` | JSON | DEFAULT [] | Array of keywords |
| `concepts` | JSON | DEFAULT [] | Array of concepts |
| `segment_order` | INTEGER | NOT NULL, INDEXED | Sequence number (1, 2, 3...) |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Relationships:**
- MANY-TO-ONE with `jobs` via `job_id`
- ONE-TO-ONE with `clips` (one segment → one clip)

**Indexes:**
- `segment_id` (unique)
- `job_id` (foreign key)
- `start_time` (range queries)
- `importance_score` (ranking)
- `segment_order` (sorting)

**Sample Data:**
```json
{
  "segment_id": "seg_abc123",
  "job_id": "job_xyz789",
  "start_time": 120.0,
  "end_time": 180.0,
  "topic": "Binary Search Trees",
  "importance_score": 0.92,
  "keywords": ["binary tree", "search", "algorithm"],
  "concepts": ["data structures", "tree traversal"],
  "segment_order": 1
}
```

---

### 6. clips

**Purpose:** Store generated highlight video clips

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `clip_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for clip |
| `job_id` | VARCHAR(100) | FOREIGN KEY, NOT NULL, INDEXED | Reference to jobs table |
| `content_segment_id` | VARCHAR(100) | FOREIGN KEY, NULL, INDEXED | Reference to content_segments |
| `title` | VARCHAR(500) | NOT NULL | Clip title |
| `topic` | VARCHAR(500) | NULL | Topic (copied from segment) |
| `importance_score` | FLOAT | NULL, INDEXED | Importance score (copied) |
| `start_time` | FLOAT | NOT NULL | Start time in original video |
| `end_time` | FLOAT | NOT NULL | End time in original video |
| `duration` | FLOAT | NOT NULL | Clip duration in seconds |
| `s3_key` | VARCHAR(500) | NOT NULL | S3 key for video clip |
| `thumbnail_s3_key` | VARCHAR(500) | NULL | S3 key for thumbnail |
| `subtitle_s3_key` | VARCHAR(500) | NULL | S3 key for subtitle file (SRT/VTT) |
| `clip_order` | INTEGER | NULL, INDEXED | Display order |
| `metadata` | JSON | DEFAULT {} | Additional clip metadata |
| `created_at` | DATETIME | NOT NULL | Record creation timestamp |

**Relationships:**
- MANY-TO-ONE with `jobs` via `job_id`
- ONE-TO-ONE with `content_segments` via `content_segment_id`

**Indexes:**
- `clip_id` (unique)
- `job_id` (foreign key)
- `content_segment_id` (foreign key)
- `importance_score` (ranking)
- `clip_order` (sorting)

---

### 7. processing_logs

**Purpose:** Audit trail and debugging for processing pipeline

**Fields:**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY | Auto-increment ID |
| `log_id` | VARCHAR(100) | UNIQUE, NOT NULL, INDEXED | UUID for log entry |
| `job_id` | VARCHAR(100) | FOREIGN KEY, NOT NULL, INDEXED | Reference to jobs table |
| `stage` | VARCHAR(50) | NOT NULL, INDEXED | Processing stage name |
| `agent_name` | VARCHAR(100) | NULL | Agent that executed stage |
| `status` | VARCHAR(20) | NOT NULL | started, completed, failed |
| `duration_seconds` | FLOAT | NULL | Execution duration |
| `error_message` | TEXT | NULL | Error details if failed |
| `metadata` | JSON | DEFAULT {} | Additional context |
| `created_at` | DATETIME | NOT NULL, INDEXED | Log entry timestamp |

**Relationships:**
- MANY-TO-ONE with `jobs` via `job_id`

**Indexes:**
- `log_id` (unique)
- `job_id` (foreign key)
- `stage` (filtering)
- `created_at` (time-series)

**stage Values:**
- `uploading`
- `silence_detection`
- `transcription`
- `layout_analysis`
- `content_analysis`
- `segmentation`
- `compilation`
- `complete`

---

## Common Queries

### Get Job with All Related Data

```sql
-- Get job
SELECT * FROM jobs WHERE job_id = 'job_xyz789';

-- Get transcripts
SELECT * FROM transcripts WHERE job_id = 'job_xyz789' ORDER BY start_time;

-- Get silence regions
SELECT * FROM silence_regions WHERE job_id = 'job_xyz789' ORDER BY start_time;

-- Get layout analysis
SELECT * FROM layout_analysis WHERE job_id = 'job_xyz789';

-- Get content segments
SELECT * FROM content_segments
WHERE job_id = 'job_xyz789'
ORDER BY segment_order;

-- Get clips
SELECT * FROM clips
WHERE job_id = 'job_xyz789'
ORDER BY clip_order;
```

### Get Top Clips by Importance

```sql
SELECT
    clip_id,
    title,
    topic,
    importance_score,
    duration,
    s3_key
FROM clips
WHERE job_id = 'job_xyz789'
ORDER BY importance_score DESC
LIMIT 5;
```

### Get Processing Timeline

```sql
SELECT
    stage,
    agent_name,
    status,
    duration_seconds,
    created_at
FROM processing_logs
WHERE job_id = 'job_xyz789'
ORDER BY created_at;
```

### Get Full Transcript

```sql
SELECT
    start_time,
    end_time,
    text,
    confidence
FROM transcripts
WHERE job_id = 'job_xyz789'
ORDER BY start_time;
```

---

## Database Migrations

The project uses **Alembic** for database migrations.

### Create Migration

```bash
# Auto-generate migration
docker-compose exec api alembic revision --autogenerate -m "create initial schema"

# Manual migration
docker-compose exec api alembic revision -m "add new field"
```

### Apply Migrations

```bash
# Upgrade to latest
docker-compose exec api alembic upgrade head

# Upgrade one step
docker-compose exec api alembic upgrade +1

# Downgrade one step
docker-compose exec api alembic downgrade -1
```

### Migration History

```bash
docker-compose exec api alembic history
docker-compose exec api alembic current
```

---

## Cascade Delete Behavior

All relationships use **CASCADE DELETE** to maintain referential integrity:

- Deleting a **job** automatically deletes all:
  - Transcripts
  - Silence regions
  - Layout analysis
  - Content segments
  - Clips
  - Processing logs

This prevents orphaned records and simplifies cleanup.

---

## Performance Considerations

### Indexes

All critical query paths have indexes:
- Foreign keys (for joins)
- Timestamp fields (for sorting/filtering)
- Status fields (for filtering)
- Score fields (for ranking)
- Order fields (for sorting)

### JSON Columns

JSON columns are used for flexible metadata storage:
- `jobs.video_metadata` - Video properties
- `jobs.metadata` - Additional job data
- `layout_analysis.screen_region` - Region coordinates
- `layout_analysis.camera_region` - Region coordinates
- `content_segments.keywords` - Keyword arrays
- `content_segments.concepts` - Concept arrays
- `clips.metadata` - Additional clip data
- `processing_logs.metadata` - Log context

### Connection Pooling

SQLAlchemy engine configured with:
- `pool_pre_ping=True` - Verify connections before use
- `pool_recycle=3600` - Recycle connections after 1 hour

---

## Sample Data Flow

### 1. Job Creation
```python
job = Job(
    job_id="job_abc123",
    filename="lecture.mp4",
    file_size=524288000,
    content_type="video/mp4",
    original_s3_key="uploads/job_abc123/lecture.mp4",
    status="queued"
)
```

### 2. Transcription Results
```python
transcript = Transcript(
    segment_id="trans_001",
    job_id="job_abc123",
    start_time=10.0,
    end_time=15.5,
    text="Welcome to the lecture...",
    confidence=0.95
)
```

### 3. Content Segment
```python
segment = ContentSegment(
    segment_id="seg_001",
    job_id="job_abc123",
    start_time=120.0,
    end_time=180.0,
    topic="Introduction to Algorithms",
    importance_score=0.89,
    keywords=["algorithm", "complexity"],
    segment_order=1
)
```

### 4. Generated Clip
```python
clip = Clip(
    clip_id="clip_001",
    job_id="job_abc123",
    content_segment_id="seg_001",
    title="Introduction to Algorithms",
    s3_key="results/job_abc123/clip_001.mp4",
    subtitle_s3_key="results/job_abc123/clip_001.srt",
    clip_order=1
)
```

---

## Database Maintenance

### Cleanup Old Jobs

```sql
-- Delete jobs older than 30 days
DELETE FROM jobs
WHERE created_at < NOW() - INTERVAL '30 days'
AND status IN ('completed', 'failed');
```

### Vacuum and Analyze

```sql
-- Reclaim space and update statistics
VACUUM ANALYZE jobs;
VACUUM ANALYZE clips;
VACUUM ANALYZE transcripts;
```

### Check Database Size

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Schema Version

**Version:** 1.0.0
**Created:** October 13, 2025
**Tables:** 7
**Total Columns:** 96
**Foreign Keys:** 6
**Indexes:** 25+
