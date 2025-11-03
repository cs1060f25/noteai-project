# Video Compilation Agent

## Overview

The Video Compilation Agent is responsible for creating final highlight video clips from content segments. It handles video cutting, encoding, thumbnail generation, subtitle creation, and metadata embedding.

## Features

✅ **Video Cutting & Compilation**: Extract segments from original video with precise timing
✅ **Smooth Transitions**: Crossfade transitions between segments (0.5s default)
✅ **Video Quality Optimization**: Smart encoding with H.264, resolution optimization
✅ **Thumbnail Generation**: Auto-generated thumbnails from middle frame
✅ **Subtitle Support**: WebVTT subtitle generation from transcripts
✅ **Metadata Embedding**: MP4 metadata tags (title, description, creation time)
✅ **Multiple Output Formats**: Primary 1080p, fallback 720p
✅ **Performance Optimized**: Temp file handling, parallel S3 uploads

## Architecture

```
VideoCompiler
├── FFmpegHelper (video operations)
├── SubtitleGenerator (subtitle creation)
└── S3 Integration (upload/download)
```

## Dependencies

### System Requirements
- **FFmpeg 4.4+** with libx264 and AAC codecs
- Python 3.9+
- AWS S3 access

### Python Packages
- `boto3` - S3 operations
- `sqlalchemy` - Database ORM
- `celery` - Task queue

## Usage

### Direct Function Call

```python
from agents.compiler import compile_video_clips
from app.services.db import get_db

db = next(get_db())
result = compile_video_clips(job_id="job-123", db=db)

print(f"Generated {result['clips_generated']} clips")
```

### Celery Task

```python
from pipeline.tasks.compilation_task import compile_video_task

# Queue compilation task
task = compile_video_task.delay(job_id="job-123")

# Check status
result = task.get()
```

## Configuration

### Environment Variables

```bash
# AWS S3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

# Redis (for progress)
REDIS_URL=redis://localhost:6379/0
```

### Video Settings

Default settings in `FFmpegHelper`:
- **Transition Duration**: 0.5 seconds
- **Primary Resolution**: 1920x1080 (1080p)
- **Fallback Resolution**: 1280x720 (720p)
- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC, 192kbps
- **Video Bitrate**: 4M (4 Mbps)
- **Thumbnail Size**: 1280x720 JPEG

## Output Structure

### S3 Keys
```
clips/{job_id}/{clip_id}.mp4
thumbnails/{job_id}/{clip_id}.jpg
subtitles/{job_id}/{clip_id}.vtt
```

### Database Records
Each clip is saved to the `clips` table with:
- `clip_id`: Unique identifier
- `job_id`: Parent job reference
- `content_segment_id`: Source segment
- `title`, `topic`: Content metadata
- `start_time`, `end_time`, `duration`: Timing
- `s3_key`, `thumbnail_s3_key`, `subtitle_s3_key`: Storage paths
- `importance_score`: Segment importance
- `clip_order`: Display order

## Progress Tracking

The agent emits progress updates via Redis pub/sub:

```json
{
  "type": "progress",
  "job_id": "job-123",
  "status": "running",
  "data": {
    "stage": "compilation",
    "percent": 50.0,
    "message": "Processing video segments"
  }
}
```

Progress stages:
1. 10% - Downloading original video
2. 30% - Processing video segments
3. 70% - Generating thumbnails and subtitles
4. 90% - Uploading compiled clips
5. 100% - Compilation completed

## Error Handling

### Automatic Retries
- Max retries: 2
- Retry delay: 60 seconds
- Retry backoff: Enabled

### Common Errors

**FFmpegError**: FFmpeg operation failed
```python
raise FFmpegError("Failed to extract segment: invalid timestamp")
```

**CompilationError**: Compilation process failed
```python
raise CompilationError("Job not found: job-123")
```

### Error Recovery
- Segment processing failures don't fail entire job
- Failed segments are logged and skipped
- Partial results are still saved

## Testing

Run tests:
```bash
pytest backend/tests/test_compiler.py -v
```

Test coverage:
- FFmpeg helper verification
- Video information extraction
- Clip compilation flow
- Subtitle generation
- Error handling

## Performance

### Optimization Strategies
1. **Codec Copy**: When possible, use `-c copy` to avoid re-encoding
2. **Temp Files**: All processing in temp directories, auto-cleanup
3. **Parallel Processing**: Multiple segments processed independently
4. **Resolution Optimization**: Only transcode if needed

### Typical Processing Times
- 20-second segment: ~5-10 seconds
- 1-minute segment: ~15-30 seconds
- Thumbnail generation: ~1-2 seconds
- Subtitle generation: <1 second

(Times vary based on resolution and hardware)

## Monitoring

### Logs
All operations logged with structured JSON:
```python
logger.info(
    "Clip processed successfully",
    extra={"job_id": job_id, "clip_id": clip_id}
)
```

### Metrics to Track
- Compilation duration per segment
- FFmpeg operation times
- S3 upload/download times
- Success/failure rates
- Error types and frequencies

## Docker Setup

### Dockerfile
```dockerfile
FROM python:3.9-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg libavcodec-extra

# ... rest of Dockerfile
```

### docker-compose.yml
```yaml
services:
  worker:
    build: .
    command: celery -A pipeline.celery_app worker --loglevel=info
    environment:
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
```

## Troubleshooting

### FFmpeg Not Found
```bash
# Check FFmpeg installation
ffmpeg -version

# Install on Ubuntu/Debian
apt-get install ffmpeg

# Install on MacOS
brew install ffmpeg
```

### S3 Upload Failures
- Verify AWS credentials
- Check bucket permissions
- Ensure bucket exists in correct region

### Memory Issues
- Use temp file cleanup
- Process segments sequentially for large jobs
- Increase worker memory limits

## Future Enhancements

Potential improvements:
- [ ] Custom transition effects (wipe, dissolve, etc.)
- [ ] Burned-in subtitles option
- [ ] Multiple resolution outputs (360p, 480p)
- [ ] WebM format support
- [ ] GPU-accelerated encoding
- [ ] Chapter markers in MP4
- [ ] Custom watermarks
- [ ] Audio normalization

## API Integration

The compilation agent integrates with the FastAPI backend via Celery:

```python
# In your route handler
from pipeline.tasks.compilation_task import compile_video_task

@router.post("/jobs/{job_id}/compile")
async def trigger_compilation(job_id: str):
    task = compile_video_task.delay(job_id)
    return {"task_id": task.id, "status": "queued"}
```

## Support

For issues or questions:
1. Check logs in `backend/logs/`
2. Review error messages in database `processing_logs` table
3. Verify FFmpeg is working: `ffmpeg -version`
4. Test S3 access with AWS CLI