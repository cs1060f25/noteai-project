# Testing the Silence Detector Feature

This guide explains how to test the silence detector implementation in different scenarios.

## Table of Contents
1. [Quick Unit Tests](#quick-unit-tests)
2. [Manual Testing with Local Video](#manual-testing-with-local-video)
3. [Full Integration Testing with Docker](#full-integration-testing-with-docker)
4. [Testing with Real S3](#testing-with-real-s3)

---

## Quick Unit Tests

Run the automated unit tests to verify core functionality:

```bash
# navigate to backend directory
cd backend

# run tests using pytest
uv run pytest tests/test_silence_detector.py -v

# run with coverage
uv run pytest tests/test_silence_detector.py -v --cov=agents.silence_detector
```

**What this tests:**
- Audio analysis with generated test audio (sound + silence + sound)
- S3 download logic (mocked)
- Database storage logic (mocked)
- Edge cases (empty silence regions, errors)

---

## Manual Testing with Local Video

Test with a real video file without needing S3 setup:

### Step 1: Prepare a test video
Get a sample video file (MP4, MOV, etc.) or download one:
```bash
# example: download a short test video
curl -o test_video.mp4 "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"
```

### Step 2: Set up environment
```bash
cd backend

# copy .env.example to .env
cp .env.example .env

# edit .env and set database to SQLite for quick testing
# DATABASE_URL=sqlite:///./lecture_extractor.db
```

### Step 3: Run the manual test script
```bash
# run with your video file
uv run python scripts/test_silence_detector_manual.py /path/to/your/video.mp4

# example
uv run python scripts/test_silence_detector_manual.py ~/Downloads/lecture.mp4
```

**Expected output:**
```
============================================================
Testing Silence Detector
============================================================
Video file: /Users/you/Downloads/lecture.mp4
Job ID: manual-test-001
============================================================

Step 1: Analyzing audio for silence...
✅ Analysis complete! Found 5 silence regions

Step 2: Silence regions detected:
============================================================

Region 1:
  Start time: 12.45s
  End time: 13.20s
  Duration: 0.75s
  Type: audio_silence
  Threshold: -40 dBFS

...

============================================================
Total silence duration: 15.30s
Total regions: 5
============================================================

Do you want to store these results in the database? (y/n):
```

---

## Full Integration Testing with Docker

Test the complete pipeline with all services running:

### Step 1: Setup environment
```bash
cd backend

# create .env file from example
cp .env.example .env

# edit .env and configure S3 credentials
nano .env
```

Configure these variables in `.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
```

### Step 2: Start services
```bash
# start all services (db, redis, api, worker)
docker-compose up -d

# check logs
docker-compose logs -f worker
```

### Step 3: Upload a video via API

**Option A: Using curl**
```bash
# 1. get presigned upload URL
curl -X POST http://localhost:8000/api/v1/upload/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test_lecture.mp4",
    "content_type": "video/mp4",
    "file_size": 5242880
  }'

# 2. upload video to S3 using presigned URL (replace with actual URL from step 1)
curl -X PUT "PRESIGNED_URL_FROM_STEP_1" \
  -H "Content-Type: video/mp4" \
  --upload-file /path/to/your/video.mp4

# 3. create processing job
curl -X POST http://localhost:8000/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "test-job-001",
    "s3_key": "uploads/test-job-001/video.mp4"
  }'
```

**Option B: Using Python**
```python
import requests

# initiate upload
response = requests.post(
    "http://localhost:8000/api/v1/upload/initiate",
    json={
        "filename": "lecture.mp4",
        "content_type": "video/mp4",
        "file_size": 5242880
    }
)
upload_data = response.json()

# upload file to S3
with open("/path/to/video.mp4", "rb") as f:
    requests.put(upload_data["upload_url"], data=f)

# start processing
requests.post(
    "http://localhost:8000/api/v1/jobs",
    json={"job_id": upload_data["job_id"]}
)
```

### Step 4: Monitor processing
```bash
# watch worker logs
docker-compose logs -f worker

# check job status
curl http://localhost:8000/api/v1/jobs/test-job-001
```

### Step 5: Verify results in database
```bash
# connect to postgres
docker exec -it lecture-extractor-db psql -U lecture_user -d lecture_extractor

# query silence regions
SELECT * FROM silence_regions WHERE job_id = 'test-job-001';

# exit
\q
```

**Expected database records:**
```sql
 region_id | job_id       | start_time | end_time | duration | silence_type  | amplitude_threshold
-----------+--------------+------------+----------+----------+---------------+--------------------
 uuid-1    | test-job-001 | 10.5       | 11.2     | 0.7      | audio_silence | -40
 uuid-2    | test-job-001 | 25.3       | 26.8     | 1.5      | audio_silence | -40
```

---

## Testing with Real S3

Test the complete S3 integration flow:

### Prerequisites
1. AWS account with S3 access
2. S3 bucket created
3. AWS credentials configured

### Step 1: Upload video to S3 manually
```bash
# using AWS CLI
aws s3 cp /path/to/video.mp4 s3://your-bucket/uploads/test-job-002/original.mp4
```

### Step 2: Test silence detector directly
```python
# test_s3_integration.py
import sys
sys.path.insert(0, '/path/to/backend')

from agents.silence_detector import detect_silence

# test with actual S3 key
result = detect_silence(
    video_path="uploads/test-job-002/original.mp4",
    job_id="test-job-002"
)

print(f"Status: {result['status']}")
print(f"Silence regions found: {result['silence_count']}")
print(f"Total silence duration: {result['total_silence_duration']}s")
print(f"Processing time: {result['processing_time_seconds']}s")
```

### Step 3: Run the test
```bash
# make sure .env has S3 credentials
uv run python test_s3_integration.py
```

---

## Troubleshooting

### Common Issues

**1. "ModuleNotFoundError: No module named 'pydub'"**
```bash
# install dependencies
uv sync
```

**2. "ffmpeg not found"**
PyDub requires ffmpeg for audio processing:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Docker: already included in Dockerfile
```

**3. "Database connection error"**
```bash
# check if database is running
docker-compose ps

# restart services
docker-compose restart db
```

**4. "S3 access denied"**
- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Ensure IAM user has `s3:GetObject` permission

**5. "No silence detected in video"**
This might be expected! Try adjusting parameters in `silence_detector.py`:
```python
SILENCE_THRESH_DBFS = -50  # more sensitive (detects quieter sections)
MIN_SILENCE_LEN_MS = 300   # detect shorter silence periods
```

---

## Verification Checklist

After testing, verify:

- [ ] Video downloads from S3 successfully
- [ ] Audio is extracted and analyzed
- [ ] Silence regions are detected correctly
- [ ] Results are stored in database
- [ ] Temporary files are cleaned up
- [ ] Logs show detailed progress
- [ ] Errors are handled gracefully
- [ ] Processing time is reasonable

---

## Performance Benchmarks

Expected performance on typical hardware:

| Video Length | File Size | Processing Time | Memory Usage |
|--------------|-----------|-----------------|--------------|
| 5 minutes    | ~50 MB    | 10-20 seconds   | ~200 MB      |
| 30 minutes   | ~300 MB   | 1-2 minutes     | ~500 MB      |
| 1 hour       | ~600 MB   | 2-4 minutes     | ~800 MB      |

*Note: Times vary based on video codec, bitrate, and system specs*

---

## Next Steps

After successful testing:
1. Test other agents (transcript, layout)
2. Test full pipeline integration
3. Add monitoring/metrics
4. Deploy to staging environment
5. Load testing with multiple concurrent jobs
