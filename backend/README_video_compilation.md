# 🧩 NoteAI — Video Compilation Agent

## Overview

The **Video Compilation Agent** is responsible for creating final highlight reels from segmented video data.
It’s the final stage in the NoteAI processing pipeline, following:

1. **Silence Detection Agent**
2. **Transcription Agent**
3. **Segmentation Agent**
4. **Compilation Agent (this)**

The agent compiles all relevant content segments into short, high-quality highlight videos with metadata, thumbnails, subtitles, and crossfade transitions.

---

## ✨ Features

| Feature                   | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| **Video cutting**         | Extracts content segments (`start_time` / `end_time`) using FFmpeg        |
| **Crossfade transitions** | Smooth visual and audio fades between segments                            |
| **Video optimization**    | Transcodes with `libx264` + `yuv420p` for QuickTime/browser compatibility |
| **Multi-format export**   | Outputs `.mp4`, `.webm`, and `.mov`                                       |
| **Metadata embedding**    | Adds segment titles, descriptions, and job info                           |
| **Thumbnail generation**  | Creates 1280×720 thumbnails for each highlight                            |
| **Subtitles (optional)**  | Uses transcripts to generate `.vtt` caption files                         |
| **Error resilience**      | Logs, retries, and continues on individual segment failures               |
| **FFmpeg-based**          | All operations done via optimized FFmpeg commands                         |

---

## 🧠 Architecture

**File:** `backend/agents/compiler.py`

**Key classes & methods:**

| Component               | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `VideoCompiler`         | Main orchestration class                  |
| `_process_segment()`    | Extracts, encodes, and prepares each clip |
| `FFmpegHelper`          | Handles FFmpeg operations                 |
| `SubtitleGenerator`     | Generates `.vtt` subtitle files           |
| `compile_video_clips()` | Entry point used by Celery tasks          |

---

## ⚙️ Dependencies

* **Python 3.11+**
* **FFmpeg (≥ 5.0)**
  Must include codecs: `libx264`, `libvpx-vp9`, `libopus`, `aac`
* **Docker + Docker Compose** (for containerized execution)
* **PostgreSQL + Redis** (for Celery + state)
* **AWS S3 credentials** (or mock S3 for local tests)

---

## 🧩 Database Tables Used

| Table            | Purpose                                 |
| ---------------- | --------------------------------------- |
| `Job`            | Stores upload and processing metadata   |
| `ContentSegment` | Segment timecodes, titles, descriptions |
| `Transcript`     | Optional subtitle data                  |
| `Clip`           | Stores generated clip metadata          |

---

## 🔗 Integration in the Pipeline

### Celery Chain

```python
from celery import chain
from pipeline.tasks import (
    detect_silence_task,
    transcribe_audio_task,
    segment_video_task,
    compile_video_task,
)

def process_video(job_id: str):
    """Full video-processing pipeline."""
    return chain(
        detect_silence_task.s(job_id),
        transcribe_audio_task.s(),
        segment_video_task.s(),
        compile_video_task.s(),
    )().id
```

### API Trigger

Triggered automatically via:

```
POST /api/v1/upload/confirm
```

Once a file upload is confirmed, the Celery pipeline starts and eventually executes this agent.

---

## 🧪 Local Testing

### Prerequisites

* Copy a real test video to the container:

  ```bash
  docker cp ~/Desktop/test_lec.mov <container_id>:/tmp/test_lec.mov
  ```
* Ensure `backend` container is running.

---

### Run the test harness

A script `scripts/run_compiler_test.py` is provided for local testing:

```bash
docker-compose run --rm worker bash
python scripts/run_compiler_test.py
```

✅ It will:

* Create mock `Job`, `User`, and `ContentSegment` rows.
* Run the compiler on `/tmp/test_lec.mov`.
* Persist outputs in `/app/output_debug/`.

---

### Retrieve outputs

On your Mac:

```bash
docker cp <container_id>:/app/output_debug ~/Desktop/output_debug
```

You’ll get:

```
final_job_testlec.mp4   # Highlight reel (merged)
final_job_testlec.webm  # Web version
final_job_testlec.mov   # QuickTime version
thumbnail_*.jpg         # Thumbnails
segment_*.mp4           # Raw segment cuts
final_*.mp4             # Encoded clips
```

---

## 🧩 Known Issues (Resolved)

| Issue                                           | Fix                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Audio from 1st clip overlapping final video** | Updated `concatenate_with_transitions()` with proper `[v][a]` mapping                   |
| **QuickTime playback errors**                   | Forced `yuv420p` pixel format and `+faststart` flag                                     |
| **Temporary file deletion**                     | Testing script patches `tempfile.TemporaryDirectory` for persistent `/app/output_debug` |
| **Foreign key conflicts during re-testing**     | Added clean-up step (`clips → segments → job`)                                          |

---

## 🧩 Future Improvements

* Segment-level parallelization
* Configurable transition types
* GPU-based transcoding (NVENC / VAAPI)
* Dynamic subtitle styling
* S3 async upload queue

---

## ✅ Acceptance Criteria

| Criterion                             | Status                       |
| ------------------------------------- | ---------------------------- |
| Video cutting and compilation         | ✅ Working                    |
| Smooth transitions between segments   | ✅ Verified                   |
| Video quality optimization functional | ✅ Verified                   |
| Thumbnail generation working          | ✅ Verified                   |
| Metadata embedding complete           | ✅ Verified                   |
| Multiple output format support        | ✅ Verified                   |
| Performance optimization              | ✅ Efficient for short videos |

---

# 🎬 Final Verification Steps

```bash
# Run pipeline
python scripts/run_compiler_test.py

# Check outputs
ls -lh /app/output_debug

# Copy to host
docker cp <container_id>:/app/output_debug ~/Desktop/output_debug
```