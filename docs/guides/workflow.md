# Backend Development Guidelines

## AI Lecture Highlight Extractor - Backend Standards

This document defines the essential coding standards, best practices, and architectural patterns for the backend services.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Key Components](#key-components)
4. [Best Practices](#best-practices)
5. [Development Workflow](#development-workflow)

## Development Setup

### Prerequisites
- Python 3.9+
- UV package manager (faster alternative to pip)
- Docker and Docker Compose
- AWS CLI configured with appropriate credentials

### Quick Start

```bash
# Install UV package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Set up the project
uv venv
source .venv/bin/activate
uv sync  # Install dependencies

# Run development server
uvicorn app.main:app --reload
```

### Key Commands

```bash
# Install dependencies
uv sync

# Run tests
uv run pytest

# Lint code
uv run ruff check .
uv run black .
uv run mypy .

# Run with Docker
docker-compose up -d
```

## Project Structure

```
backend/
├── app/                    # Main application package
│   ├── api/                # API endpoints
│   ├── core/               # Core functionality
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── .env                    # Environment variables
├── pyproject.toml          # Project configuration
└── docker-compose.yml      # Docker configuration
```

## Key Components

### FastAPI Application
- Uses async/await for better performance
- Pydantic for data validation
- Dependency injection for better testability

### Task Processing
- Celery for background tasks
- Redis as message broker
- Task retry and error handling

### Storage
- AWS S3 for file storage
- Presigned URLs for secure uploads/downloads
- Database for metadata storage

## Best Practices

### Code Style
- Follow PEP 8 with 100 character line length
- Use type hints throughout the codebase
- Document public APIs with docstrings
- Keep functions small and focused

### Error Handling
- Use custom exceptions for business logic errors
- Log errors with sufficient context
- Implement proper error responses in API

### Security
- Validate all inputs
- Use environment variables for secrets
- Implement proper CORS policies
- Rate limiting for public endpoints

## Development Workflow

1. Create a feature branch
2. Write tests first (TDD approach)
3. Implement the feature
4. Run linters and type checking
5. Run tests
6. Create pull request

### Testing

```bash
# Run all tests
uv run pytest

# Run specific test file
uv run pytest tests/test_models.py -v

# Run with coverage
uv run pytest --cov=app --cov-report=term-missing
```

### Deployment

```bash
# Build and push Docker image
docker-compose build
docker-compose push

# Deploy to production
# (Configured via CI/CD pipeline)
```
### Docker

- Docker and Compose files are provided (`Dockerfile`, `docker-compose.yml`).
- Common commands:

```bash
docker-compose up --build -d
docker-compose logs -f api
docker-compose down
```

### Development Workflow

#### daily workflow

```bash
# 1. activate virtual environment
source .venv/bin/activate

# 2. sync dependencies
uv sync

# 3. run linter and formatter
uv run ruff check --fix .
uv run black .

# 4. run tests
uv run pytest

# 5. start development server
uv run uvicorn app.main:app --reload

# or use docker-compose
docker-compose up
```

#### Makefile

- A `Makefile` exists with common tasks (install, lint, format, test, run, docker-up/down). Use:

```bash
make install
make check
make run
```

---

## Code Style & Conventions

### General Python Standards

```python
# follow pep 8 with 100-character line limit
# use type hints for all function signatures
# use descriptive variable names (no abbreviations unless standard)
# lowercase comments with proper punctuation

from typing import Optional, List, Dict
from pathlib import Path


def process_lecture_segments(
    video_path: Path,
    min_duration: float = 20.0,
    max_segments: int = 8
) -> List[Dict[str, any]]:
    """
    extract and filter lecture segments based on duration and importance.

    args:
        video_path: absolute path to the lecture video file
        min_duration: minimum segment length in seconds (default: 20.0)
        max_segments: maximum number of segments to return (default: 8)

    returns:
        list of segment dictionaries containing start_time, end_time, and score

    raises:
        FileNotFoundError: if video_path does not exist
        ValueError: if min_duration is negative or max_segments < 1
    """
    # validate input parameters before processing
    if not video_path.exists():
        raise FileNotFoundError(f"video not found: {video_path}")

    if min_duration < 0:
        raise ValueError("min_duration must be non-negative")

    # extract raw segments from video
    segments = _extract_raw_segments(video_path)

    # filter by minimum duration requirement
    filtered_segments = [
        seg for seg in segments
        if seg["duration"] >= min_duration
    ]

    # sort by importance score and limit to max_segments
    return sorted(
        filtered_segments,
        key=lambda x: x["score"],
        reverse=True
    )[:max_segments]
```

### Naming Conventions

```python
# classes: PascalCase
class VideoProcessor:
    pass

class S3StorageService:
    pass

# functions/methods: snake_case
def calculate_silence_ratio(audio_path: Path) -> float:
    pass

def generate_presigned_url(bucket: str, key: str) -> str:
    pass

# constants: UPPER_SNAKE_CASE
MAX_VIDEO_SIZE_MB = 500
DEFAULT_SEGMENT_DURATION = 120
AWS_S3_BUCKET_NAME = "lecture-videos-prod"

# private methods: prefix with underscore
def _extract_raw_segments(video_path: Path) -> List[Dict]:
    """internal helper for segment extraction"""
    pass

# variables: snake_case
video_duration = 3600
segment_count = 8
is_processing_complete = True
```

### Import Organization

```python
# standard library imports first
import os
import json
from pathlib import Path
from typing import List, Dict, Optional, Protocol
from datetime import datetime, timedelta

# third-party imports second
import boto3
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, validator
from celery import Task, chain, group
import redis
from moviepy.editor import VideoFileClip
import numpy as np

# local application imports last
from app.core.config import settings
from app.models.lecture import LectureSegment, ProcessingJob
from app.services.s3_service import S3Service
from app.services.db_service import DatabaseService
from agents.base import BaseAgent
```

### Comments & Documentation

```python
# lowercase comments with periods for complete sentences
# use docstrings for all public functions, classes, and methods
# inline comments should explain "why", not "what"

def score_segment_importance(
    transcript: str,
    segment_text: str,
    context_window: int = 50
) -> float:
    """
    calculate importance score for a lecture segment using contextual analysis.

    the scoring algorithm considers:
    - keyword density for educational terms
    - sentence complexity and structure
    - position within the overall lecture
    - surrounding context relevance

    args:
        transcript: full lecture transcript text
        segment_text: text content of the specific segment
        context_window: number of words to include before/after segment

    returns:
        importance score between 0.0 and 1.0
    """
    # extract context before and after the segment
    # this helps identify transitions and topic boundaries
    context = _extract_context(transcript, segment_text, context_window)

    # calculate base score from keyword density
    base_score = _calculate_keyword_density(segment_text)

    # boost score if segment is a topic introduction or conclusion
    # these are typically more important for understanding
    position_multiplier = _get_position_multiplier(context)

    return min(base_score * position_multiplier, 1.0)


# bad example - avoid capitalized comments
# Calculate the score  # too obvious, explains "what"
score = sum(values)

# good example - explains reasoning
# use sum instead of loop for better performance with large datasets
score = sum(values)
```

---

## Architecture Patterns

### When to Use Classes vs Functions

```python
# ✅ use classes for: stateful services, dependency management, resource lifecycle

class S3Service:
    """manages aws s3 operations with connection pooling and error handling."""

    def __init__(self, bucket_name: str, region: str = "us-east-1"):
        """
        initialize s3 service with bucket configuration.

        args:
            bucket_name: target s3 bucket for operations
            region: aws region (default: us-east-1)
        """
        self.bucket_name = bucket_name
        self.region = region
        self.client = boto3.client('s3', region_name=region)
        self._connection_pool = None

    def upload_file(self, local_path: Path, s3_key: str) -> str:
        """upload file to s3 and return object url."""
        try:
            self.client.upload_file(str(local_path), self.bucket_name, s3_key)
            return f"s3://{self.bucket_name}/{s3_key}"
        except ClientError as e:
            # wrap boto3 exceptions in domain-specific errors
            raise StorageUploadError(f"failed to upload {s3_key}") from e

    def generate_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
        operation: str = "get_object"
    ) -> str:
        """
        generate pre-signed url for secure temporary access.

        args:
            s3_key: object key in s3 bucket
            expires_in: url expiration in seconds (default: 1 hour)
            operation: s3 operation type (get_object or put_object)

        returns:
            presigned url string
        """
        return self.client.generate_presigned_url(
            operation,
            Params={'Bucket': self.bucket_name, 'Key': s3_key},
            ExpiresIn=expires_in
        )


# ✅ use functions for: stateless transformations, utilities, pure logic

def remove_silent_segments(
    segments: List[Dict],
    silence_threshold: float = 0.1
) -> List[Dict]:
    """
    filter out segments with audio below silence threshold.

    pure function with no side effects - easy to test and reason about.
    """
    return [
        seg for seg in segments
        if seg.get("audio_level", 0) > silence_threshold
    ]


def calculate_segment_duration(start_time: float, end_time: float) -> float:
    """calculate duration in seconds between two timestamps."""
    return max(0, end_time - start_time)


def format_timestamp_srt(seconds: float) -> str:
    """
    convert seconds to srt subtitle format (HH:MM:SS,mmm).

    example:
        >>> format_timestamp_srt(90.5)
        '00:01:30,500'
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
```

### Dependency Injection with Protocols

```python
# use protocols for loose coupling instead of inheritance

from typing import Protocol, runtime_checkable


@runtime_checkable
class StorageService(Protocol):
    """protocol defining storage service interface."""

    def upload(self, local_path: Path, key: str) -> str:
        """upload file and return storage url."""
        ...

    def download(self, key: str, local_path: Path) -> Path:
        """download file to local path."""
        ...

    def generate_presigned_url(self, key: str, expires_in: int) -> str:
        """generate temporary access url."""
        ...


@runtime_checkable
class TranscriptionService(Protocol):
    """protocol for speech-to-text services."""

    def transcribe(self, audio_path: Path) -> Dict[str, any]:
        """transcribe audio and return timestamped text."""
        ...


# services depend on protocols, not concrete implementations
class LectureProcessor:
    """processes lecture videos using injected dependencies."""

    def __init__(
        self,
        storage: StorageService,
        transcription: TranscriptionService,
        job_id: str
    ):
        """
        initialize processor with service dependencies.

        args:
            storage: service implementing StorageService protocol
            transcription: service implementing TranscriptionService protocol
            job_id: unique identifier for this processing job
        """
        self.storage = storage
        self.transcription = transcription
        self.job_id = job_id

    def process(self, video_url: str) -> List[Dict]:
        """process lecture video through full pipeline."""
        # download from storage
        video_path = self.storage.download(video_url, Path(f"/tmp/{self.job_id}.mp4"))

        # extract audio for transcription
        audio_path = self._extract_audio(video_path)

        # transcribe using injected service
        transcript = self.transcription.transcribe(audio_path)

        # process segments
        return self._analyze_segments(video_path, transcript)
```

### Data Classes for Models

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class LectureSegment:
    """represents a single segment of a lecture video."""

    start_time: float
    end_time: float
    transcript: str
    importance_score: float
    is_silent: bool = False
    topic_tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def duration(self) -> float:
        """calculate segment duration in seconds."""
        return self.end_time - self.start_time

    def to_dict(self) -> Dict[str, any]:
        """convert to dictionary for serialization."""
        return {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "transcript": self.transcript,
            "importance_score": self.importance_score,
            "is_silent": self.is_silent,
            "topic_tags": self.topic_tags,
            "created_at": self.created_at.isoformat()
        }


@dataclass
class ProcessingJob:
    """tracks the status of a lecture processing job."""

    job_id: str
    video_url: str
    status: str  # pending, processing, completed, failed
    progress: float = 0.0
    error_message: Optional[str] = None
    segments: List[LectureSegment] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    def mark_completed(self, segments: List[LectureSegment]) -> None:
        """mark job as completed with final segments."""
        self.status = "completed"
        self.progress = 100.0
        self.segments = segments
        self.completed_at = datetime.utcnow()

    def mark_failed(self, error: str) -> None:
        """mark job as failed with error message."""
        self.status = "failed"
        self.error_message = error
        self.completed_at = datetime.utcnow()
```

---

## FastAPI Best Practices

### Project Structure

```python
# app/
# ├── main.py                 # application entry point
# ├── core/
# │   ├── config.py           # settings and configuration
# │   ├── security.py         # authentication and authorization
# │   └── dependencies.py     # shared dependencies
# ├── api/
# │   ├── routes/
# │   │   ├── upload.py       # upload endpoints
# │   │   ├── jobs.py         # job management endpoints
# │   │   └── results.py      # results retrieval endpoints
# │   └── middleware/
# │       ├── error_handler.py
# │       └── rate_limiter.py
# ├── models/
# │   ├── lecture.py          # pydantic models
# │   ├── job.py
# │   └── response.py
# ├── services/
# │   ├── s3_service.py       # business logic
# │   ├── db_service.py
# │   └── video_service.py
# └── utils/
#     ├── validators.py
#     └── formatters.py
```

### Configuration Management

```python
# app/core/config.py

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """application settings loaded from environment variables."""

    # application
    app_name: str = "AI Lecture Highlight Extractor"
    debug: bool = False
    environment: str = "development"

    # api configuration
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000"]

    # aws configuration
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    aws_s3_bucket: str
    aws_cloudfront_domain: Optional[str] = None

    # database
    database_url: str
    database_pool_size: int = 10

    # redis
    redis_url: str = "redis://localhost:6379/0"

    # celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # ai services
    gemini_api_key: str
    openai_api_key: str

    # processing configuration
    max_video_size_mb: int = 500
    max_segment_duration: int = 120
    min_segment_duration: int = 20

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """cached settings instance to avoid repeated environment reads."""
    return Settings()
```

### Route Handlers

Guidelines for routes (keep code in `app/api/routes/`):

- Use `APIRouter` per domain with `prefix` and `tags`.
- Validate inputs with Pydantic models.
- Keep handlers thin; delegate logic to services in `app/services/`.
- Return typed `response_model`.

Minimal example:

```python
from fastapi import APIRouter, Depends
from app.models.upload import PresignedUrlResponse, UploadRequest
from app.services.s3_service import S3Service

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def presigned_url(req: UploadRequest, s3: S3Service = Depends()):
    return s3.presign_for_upload(req)
```

### Error Handling

Keep error handling centralized in `app/api/middleware/error_handler.py` and register handlers in `app/main.py`.

Minimal example:

```python
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from app.api.middleware.error_handler import validation_exception_handler, generic_exception_handler

app = FastAPI()
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)
```

---

## Celery & Task Queue Patterns

### Task Organization

```python
# pipeline/tasks.py

from celery import Task, chain, group
from celery.utils.log import get_task_logger
from typing import Dict, List

from app.core.celery_app import celery_app
from agents.silence_detector import SilenceDetectorAgent
from agents.transcript_agent import TranscriptAgent
from agents.layout_detector import LayoutDetectorAgent

logger = get_task_logger(__name__)


class CallbackTask(Task):
    """base task class with automatic error handling and status updates."""

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        called when task fails to update job status in database.

        ensures that failures are properly recorded and can be
        displayed to users through the frontend.
        """
        job_id = kwargs.get('job_id') or (args[0] if args else None)
        if job_id:
            # update job status in database
            from app.services.db_service import update_job_status
            update_job_status(job_id, 'failed', error=str(exc))
            logger.error(f"task failed for job {job_id}: {exc}")

    def on_success(self, retval, task_id, args, kwargs):
        """called when task completes successfully."""
        logger.info(f"task {task_id} completed successfully")


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def download_video_from_s3(self, job_id: str, s3_key: str) -> Dict[str, str]:
    """
    download lecture video from s3 to local storage for processing.

    args:
        job_id: unique identifier for this processing job
        s3_key: s3 object key for the video file

    returns:
        dict with local_path and job_id

    raises:
        Retry: if download fails temporarily (network issues)
    """
    from app.services.s3_service import S3Service
    from botocore.exceptions import ClientError

    try:
        s3_service = S3Service()
        local_path = f"/tmp/videos/{job_id}.mp4"

        logger.info(f"downloading video for job {job_id} from s3://{s3_key}")
        s3_service.download_file(s3_key, local_path)

        return {
            "job_id": job_id,
            "local_path": local_path,
            "s3_key": s3_key
        }

    except ClientError as e:
        # retry on transient network errors
        if e.response['Error']['Code'] in ['ServiceUnavailable', 'SlowDown']:
            logger.warning(f"retrying download for job {job_id}: {e}")
            raise self.retry(exc=e, countdown=60)  # retry after 1 minute
        raise


@celery_app.task(base=CallbackTask)
def detect_silence(job_data: Dict[str, str]) -> Dict[str, any]:
    """
    analyze audio to detect silent segments and pauses.

    runs in parallel with transcription and layout detection.

    args:
        job_data: dict containing job_id and local_path

    returns:
        dict with silent_segments list and job metadata
    """
    job_id = job_data["job_id"]
    video_path = job_data["local_path"]

    logger.info(f"detecting silence for job {job_id}")

    agent = SilenceDetectorAgent(job_id)
    silent_segments = agent.process(video_path)

    return {
        **job_data,
        "silent_segments": silent_segments
    }


@celery_app.task(base=CallbackTask)
def transcribe_lecture(job_data: Dict[str, str]) -> Dict[str, any]:
    """
    transcribe lecture audio using whisper api.

    runs in parallel with silence detection and layout detection.

    args:
        job_data: dict containing job_id and local_path

    returns:
        dict with transcript and subtitle data
    """
    job_id = job_data["job_id"]
    video_path = job_data["local_path"]

    logger.info(f"transcribing lecture for job {job_id}")

    agent = TranscriptAgent(job_id)
    transcript_data = agent.process(video_path)

    return {
        **job_data,
        "transcript": transcript_data["text"],
        "subtitles": transcript_data["subtitles"],
        "word_timestamps": transcript_data["word_timestamps"]
    }


@celery_app.task(base=CallbackTask)
def detect_layout(job_data: Dict[str, str]) -> Dict[str, any]:
    """
    detect screen sharing and camera regions in video.

    runs in parallel with silence detection and transcription.

    args:
        job_data: dict containing job_id and local_path

    returns:
        dict with layout information
    """
    job_id = job_data["job_id"]
    video_path = job_data["local_path"]

    logger.info(f"detecting layout for job {job_id}")

    agent = LayoutDetectorAgent(job_id)
    layout_info = agent.process(video_path)

    return {
        **job_data,
        "layout": layout_info
    }


@celery_app.task(base=CallbackTask)
def merge_parallel_results(
    silence_result: Dict,
    transcript_result: Dict,
    layout_result: Dict
) -> Dict[str, any]:
    """
    merge results from parallel processing stage.

    combines outputs from silence detection, transcription,
    and layout detection into single data structure.

    args:
        silence_result: output from detect_silence task
        transcript_result: output from transcribe_lecture task
        layout_result: output from detect_layout task

    returns:
        merged dict with all parallel processing results
    """
    job_id = silence_result["job_id"]
    logger.info(f"merging parallel results for job {job_id}")

    return {
        "job_id": job_id,
        "local_path": silence_result["local_path"],
        "s3_key": silence_result["s3_key"],
        "silent_segments": silence_result["silent_segments"],
        "transcript": transcript_result["transcript"],
        "subtitles": transcript_result["subtitles"],
        "word_timestamps": transcript_result["word_timestamps"],
        "layout": layout_result["layout"]
    }


@celery_app.task(base=CallbackTask)
def analyze_content(merged_data: Dict[str, any]) -> Dict[str, any]:
    """
    analyze transcript to identify key topics and segments.

    uses gemini api to score segment importance and identify
    educational topics throughout the lecture.

    args:
        merged_data: combined results from parallel processing

    returns:
        dict with analyzed segments and topic boundaries
    """
    from agents.content_analyzer import ContentAnalyzerAgent

    job_id = merged_data["job_id"]
    logger.info(f"analyzing content for job {job_id}")

    agent = ContentAnalyzerAgent(job_id)
    segments = agent.process(
        transcript=merged_data["transcript"],
        silent_segments=merged_data["silent_segments"]
    )

    return {
        **merged_data,
        "analyzed_segments": segments
    }


# pipeline orchestration using celery canvas
def process_lecture_pipeline(job_id: str, s3_key: str) -> None:
    """
    orchestrate full lecture processing pipeline using celery chains and groups.

    pipeline structure:
    1. download video from s3
    2. parallel processing: silence detection | transcription | layout detection
    3. merge parallel results
    4. sequential processing: content analysis -> segment extraction -> video compilation

    args:
        job_id: unique identifier for this job
        s3_key: s3 location of uploaded video
    """
    workflow = chain(
        # step 1: download video
        download_video_from_s3.s(job_id, s3_key),

        # step 2: parallel processing stage
        group(
            detect_silence.s(),
            transcribe_lecture.s(),
            detect_layout.s()
        ),

        # step 3: merge parallel results
        merge_parallel_results.s(),

        # step 4: sequential processing stage
        analyze_content.s(),
        extract_segments.s(),
        compile_videos.s(),

        # step 5: cleanup and finalize
        finalize_job.s()
    )

    # execute workflow asynchronously
    workflow.apply_async()
```

### Task Configuration

```python
# app/core/celery_app.py

from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "lecture_processor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["pipeline.tasks"]
)

# celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # task execution settings
    task_acks_late=True,  # acknowledge after completion, not on start
    task_reject_on_worker_lost=True,  # requeue if worker crashes
    worker_prefetch_multiplier=1,  # one task at a time per worker

    # result backend settings
    result_expires=3600,  # results expire after 1 hour
    result_persistent=True,

    # retry settings
    task_default_retry_delay=60,  # wait 1 minute before retry
    task_max_retries=3,

    # routing
    task_routes={
        "pipeline.tasks.transcribe_lecture": {"queue": "high_memory"},
        "pipeline.tasks.compile_videos": {"queue": "high_cpu"},
        "pipeline.tasks.*": {"queue": "default"}
    }
)
```

---

## AWS S3 & Cloud Services

### S3 Service Implementation

```python
# app/services/s3_service.py

import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from pathlib import Path
from typing import Dict, Optional
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class S3ServiceError(Exception):
    """base exception for s3 service errors."""
    pass


class StorageUploadError(S3ServiceError):
    """raised when file upload fails."""
    pass


class StorageDownloadError(S3ServiceError):
    """raised when file download fails."""
    pass


class S3Service:
    """
    manages all aws s3 operations with error handling and retry logic.

    uses boto3 client with connection pooling and automatic retries
    for transient failures.
    """

    def __init__(self, bucket_name: Optional[str] = None):
        """
        initialize s3 service with boto3 client.

        credentials are automatically discovered from:
        1. iam role (if running on aws)
        2. environment variables
        3. aws credentials file

        args:
            bucket_name: s3 bucket name (defaults to settings value)
        """
        settings = get_settings()
        self.bucket_name = bucket_name or settings.aws_s3_bucket
        self.region = settings.aws_region

        # configure boto3 with retries and connection pooling
        config = Config(
            region_name=self.region,
            retries={
                'max_attempts': 3,
                'mode': 'adaptive'  # adaptive retry mode for better handling
            },
            max_pool_connections=50
        )

        # client initialization - credentials auto-discovered
        self.client = boto3.client('s3', config=config)

        logger.info(f"s3 service initialized for bucket: {self.bucket_name}")

    def upload_file(
        self,
        local_path: Path,
        s3_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """
        upload file to s3 bucket.

        args:
            local_path: path to local file
            s3_key: destination key in s3
            content_type: mime type (optional, auto-detected if not provided)

        returns:
            s3 uri (s3://bucket/key)

        raises:
            StorageUploadError: if upload fails
        """
        if not local_path.exists():
            raise StorageUploadError(f"file not found: {local_path}")

        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type

        try:
            logger.info(f"uploading {local_path} to s3://{self.bucket_name}/{s3_key}")

            self.client.upload_file(
                str(local_path),
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )

            return f"s3://{self.bucket_name}/{s3_key}"

        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"s3 upload failed with code {error_code}: {e}")
            raise StorageUploadError(f"failed to upload to s3: {error_code}") from e

    def download_file(self, s3_key: str, local_path: Path) -> Path:
        """
        download file from s3 to local filesystem.

        args:
            s3_key: source key in s3
            local_path: destination path on local filesystem

        returns:
            path to downloaded file

        raises:
            StorageDownloadError: if download fails
        """
        # ensure parent directory exists
        local_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            logger.info(f"downloading s3://{self.bucket_name}/{s3_key} to {local_path}")

            self.client.download_file(
                self.bucket_name,
                s3_key,
                str(local_path)
            )

            return local_path

        except ClientError as e:
            error_code = e.response['Error']['Code']

            if error_code == 'NoSuchKey':
                raise StorageDownloadError(f"file not found in s3: {s3_key}") from e

            logger.error(f"s3 download failed with code {error_code}: {e}")
            raise StorageDownloadError(f"failed to download from s3: {error_code}") from e

    def generate_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
        operation: str = "get_object"
    ) -> str:
        """
        generate pre-signed url for temporary access to s3 object.

        pre-signed urls allow direct browser access to s3 without
        exposing aws credentials or making objects public.

        args:
            s3_key: object key in s3
            expires_in: url expiration in seconds (default: 1 hour)
            operation: s3 operation (get_object or put_object)

        returns:
            pre-signed url string

        raises:
            S3ServiceError: if url generation fails
        """
        try:
            url = self.client.generate_presigned_url(
                operation,
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expires_in
            )

            logger.debug(f"generated presigned url for {s3_key}, expires in {expires_in}s")
            return url

        except ClientError as e:
            logger.error(f"failed to generate presigned url: {e}")
            raise S3ServiceError("failed to generate presigned url") from e

    def generate_presigned_post(
        self,
        s3_key: str,
        content_type: str,
        expires_in: int = 3600,
        max_file_size: int = 500 * 1024 * 1024  # 500mb default
    ) -> Dict[str, any]:
        """
        generate pre-signed post data for direct browser upload.

        returns a url and form fields that can be used to post
        directly to s3 from a web browser.

        args:
            s3_key: destination key in s3
            content_type: mime type for upload
            expires_in: url expiration in seconds
            max_file_size: maximum allowed file size in bytes

        returns:
            dict with 'url' and 'fields' for post request
        """
        try:
            conditions = [
                {'bucket': self.bucket_name},
                {'key': s3_key},
                {'Content-Type': content_type},
                ['content-length-range', 0, max_file_size]
            ]

            presigned_post = self.client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={'Content-Type': content_type},
                Conditions=conditions,
                ExpiresIn=expires_in
            )

            return presigned_post

        except ClientError as e:
            logger.error(f"failed to generate presigned post: {e}")
            raise S3ServiceError("failed to generate presigned post") from e

    def delete_file(self, s3_key: str) -> None:
        """
        delete file from s3 bucket.

        used for cleanup after processing or when lifecycle policies
        need manual intervention.

        args:
            s3_key: object key to delete
        """
        try:
            logger.info(f"deleting s3://{self.bucket_name}/{s3_key}")
            self.client.delete_object(Bucket=self.bucket_name, Key=s3_key)

        except ClientError as e:
            logger.error(f"failed to delete s3 object: {e}")
            # don't raise - deletion failures shouldn't break workflows

    def list_objects(self, prefix: str, max_keys: int = 1000) -> List[Dict]:
        """
        list objects in bucket with given prefix.

        args:
            prefix: s3 key prefix to filter results
            max_keys: maximum number of keys to return

        returns:
            list of object metadata dicts
        """
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )

            return response.get('Contents', [])

        except ClientError as e:
            logger.error(f"failed to list s3 objects: {e}")
            return []
```

### IAM Policy (Documentation)

```python
"""
recommended iam policy for application s3 access:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowObjectOperations",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::lecture-videos-bucket/*"
    },
    {
      "Sid": "AllowBucketListing",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::lecture-videos-bucket"
    }
  ]
}

apply this policy to:
- iam role attached to ecs task definition (production)
- iam user for development/local testing

never commit aws credentials to version control.
use environment variables or aws credentials file.
"""
```

---

## Agent Architecture

### Base Agent Pattern

```python
# agents/base.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class AgentError(Exception):
    """base exception for agent processing errors."""
    pass


class BaseAgent(ABC):
    """
    abstract base class for all lecture processing agents.

    provides common functionality:
    - status tracking
    - error handling
    - logging
    - progress updates
    """

    def __init__(self, job_id: str):
        """
        initialize agent with job identifier.

        args:
            job_id: unique identifier for the processing job
        """
        self.job_id = job_id
        self.status = "initialized"
        self.progress = 0.0
        self.error: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None

        logger.info(f"{self.__class__.__name__} initialized for job {job_id}")

    @abstractmethod
    def process(self, *args, **kwargs) -> Any:
        """
        execute agent's core processing logic.

        must be implemented by all concrete agent classes.

        raises:
            AgentError: if processing fails
        """
        pass

    def _update_status(self, status: str, progress: Optional[float] = None) -> None:
        """
        update agent status and optionally progress.

        sends update to redis for real-time frontend display.

        args:
            status: new status string
            progress: progress percentage (0-100)
        """
        self.status = status
        if progress is not None:
            self.progress = progress

        # publish status update to redis for websocket broadcast
        from app.services.redis_service import publish_job_update
        publish_job_update(
            job_id=self.job_id,
            agent=self.__class__.__name__,
            status=status,
            progress=self.progress
        )

        logger.info(f"{self.__class__.__name__} status: {status} ({self.progress:.1f}%)")

    def _handle_error(self, error: Exception) -> None:
        """
        handle processing error with logging and status update.

        args:
            error: exception that occurred during processing
        """
        self.status = "failed"
        self.error = str(error)
        self.completed_at = datetime.utcnow()

        logger.error(
            f"{self.__class__.__name__} failed for job {self.job_id}",
            exc_info=error
        )

        self._update_status("failed")

    def execute(self, *args, **kwargs) -> Any:
        """
        wrapper method that handles status updates and error handling.

        use this instead of calling process() directly to get
        automatic status tracking and error handling.

        returns:
            result from process() method

        raises:
            AgentError: if processing fails
        """
        try:
            self.started_at = datetime.utcnow()
            self._update_status("processing", progress=0.0)

            result = self.process(*args, **kwargs)

            self.completed_at = datetime.utcnow()
            self._update_status("completed", progress=100.0)

            logger.info(
                f"{self.__class__.__name__} completed for job {self.job_id} "
                f"in {(self.completed_at - self.started_at).total_seconds():.2f}s"
            )

            return result

        except Exception as e:
            self._handle_error(e)
            raise AgentError(f"{self.__class__.__name__} failed: {e}") from e
```

### Concrete Agent Example

```python
# agents/silence_detector.py

from typing import List, Dict
from pathlib import Path
import numpy as np
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import librosa

from agents.base import BaseAgent, AgentError


class SilenceDetectorAgent(BaseAgent):
    """
    detects silent segments in lecture audio using amplitude analysis.

    uses pydub for silence detection and librosa for audio feature extraction.
    identifies gaps, pauses, and low-activity audio regions.
    """

    def __init__(self, job_id: str, silence_thresh_db: int = -40, min_silence_len_ms: int = 1000):
        """
        initialize silence detector with configurable thresholds.

        args:
            job_id: unique job identifier
            silence_thresh_db: audio level threshold in db (default: -40db)
            min_silence_len_ms: minimum silence duration in ms (default: 1000ms)
        """
        super().__init__(job_id)
        self.silence_thresh = silence_thresh_db
        self.min_silence_len = min_silence_len_ms

    def process(self, video_path: str) -> List[Dict[str, any]]:
        """
        analyze video audio to detect silent segments.

        args:
            video_path: path to lecture video file

        returns:
            list of segment dicts with start_time, end_time, is_silent, audio_level

        raises:
            AgentError: if audio extraction or analysis fails
        """
        video_path = Path(video_path)

        if not video_path.exists():
            raise AgentError(f"video file not found: {video_path}")

        # extract audio from video
        self._update_status("extracting audio", progress=10.0)
        audio_path = self._extract_audio(video_path)

        # detect silent segments using pydub
        self._update_status("detecting silence", progress=30.0)
        segments = self._detect_silence_pydub(audio_path)

        # enhance with librosa features for accuracy
        self._update_status("analyzing audio features", progress=60.0)
        segments = self._enhance_with_librosa(audio_path, segments)

        # cleanup temporary audio file
        audio_path.unlink()

        self._update_status("completed", progress=100.0)

        return segments

    def _extract_audio(self, video_path: Path) -> Path:
        """
        extract audio track from video file.

        uses moviepy to extract audio as wav file for analysis.

        args:
            video_path: path to input video

        returns:
            path to extracted audio file
        """
        from moviepy.editor import VideoFileClip

        try:
            audio_path = video_path.parent / f"{video_path.stem}_audio.wav"

            with VideoFileClip(str(video_path)) as video:
                video.audio.write_audiofile(
                    str(audio_path),
                    codec='pcm_s16le',
                    verbose=False,
                    logger=None
                )

            return audio_path

        except Exception as e:
            raise AgentError(f"failed to extract audio: {e}") from e

    def _detect_silence_pydub(self, audio_path: Path) -> List[Dict[str, any]]:
        """
        detect silent and non-silent segments using pydub.

        args:
            audio_path: path to audio file

        returns:
            list of segment dicts
        """
        try:
            audio = AudioSegment.from_file(str(audio_path))

            # detect non-silent ranges
            nonsilent_ranges = detect_nonsilent(
                audio,
                min_silence_len=self.min_silence_len,
                silence_thresh=self.silence_thresh
            )

            # convert to segment format
            segments = []
            duration_s = len(audio) / 1000.0

            # if no speech detected, entire video is silent
            if not nonsilent_ranges:
                return [{
                    'start_time': 0.0,
                    'end_time': duration_s,
                    'is_silent': True,
                    'audio_level': -60.0
                }]

            # convert nonsilent ranges to segments
            for start_ms, end_ms in nonsilent_ranges:
                segments.append({
                    'start_time': start_ms / 1000.0,
                    'end_time': end_ms / 1000.0,
                    'is_silent': False,
                    'audio_level': audio[start_ms:end_ms].dBFS
                })

            # fill in silent segments between nonsilent ones
            segments = self._fill_silent_gaps(segments, duration_s)

            return sorted(segments, key=lambda x: x['start_time'])

        except Exception as e:
            raise AgentError(f"silence detection failed: {e}") from e

    def _fill_silent_gaps(self, segments: List[Dict], total_duration: float) -> List[Dict]:
        """
        identify and add silent segments between non-silent ones.

        args:
            segments: list of non-silent segments
            total_duration: total audio duration in seconds

        returns:
            complete list including silent segments
        """
        all_segments = []

        # add initial silence if needed
        if segments[0]['start_time'] > 0:
            all_segments.append({
                'start_time': 0.0,
                'end_time': segments[0]['start_time'],
                'is_silent': True,
                'audio_level': self.silence_thresh
            })

        # add all non-silent segments and gaps between them
        for i, seg in enumerate(segments):
            all_segments.append(seg)

            # check for gap before next segment
            if i < len(segments) - 1:
                gap_start = seg['end_time']
                gap_end = segments[i + 1]['start_time']

                if gap_end - gap_start > 0.1:  # min 0.1s gap
                    all_segments.append({
                        'start_time': gap_start,
                        'end_time': gap_end,
                        'is_silent': True,
                        'audio_level': self.silence_thresh
                    })

        # add final silence if needed
        if segments[-1]['end_time'] < total_duration:
            all_segments.append({
                'start_time': segments[-1]['end_time'],
                'end_time': total_duration,
                'is_silent': True,
                'audio_level': self.silence_thresh
            })

        return all_segments

    def _enhance_with_librosa(
        self,
        audio_path: Path,
        segments: List[Dict]
    ) -> List[Dict]:
        """
        enhance segment analysis with librosa audio features.

        adds spectral features to improve silence detection accuracy.

        args:
            audio_path: path to audio file
            segments: existing segments to enhance

        returns:
            enhanced segments with additional features
        """
        try:
            # load audio with librosa
            y, sr = librosa.load(str(audio_path))

            # calculate spectral centroid for frequency content
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]

            # calculate root mean square energy
            rms = librosa.feature.rms(y=y)[0]

            # enhance segments with features
            for seg in segments:
                start_frame = int(seg['start_time'] * sr / 512)  # hop_length=512
                end_frame = int(seg['end_time'] * sr / 512)

                if start_frame < len(rms) and end_frame <= len(rms):
                    seg['rms_energy'] = float(np.mean(rms[start_frame:end_frame]))
                    seg['spectral_centroid'] = float(
                        np.mean(spectral_centroids[start_frame:end_frame])
                    )

                    # refine silence detection using multiple features
                    # low rms energy + low spectral centroid = more likely silent
                    if seg['rms_energy'] < 0.01 and seg['spectral_centroid'] < 200:
                        seg['is_silent'] = True

            return segments

        except Exception as e:
            # if librosa enhancement fails, return original segments
            # don't fail entire task for optional enhancement
            logger.warning(f"librosa enhancement failed: {e}")
            return segments
```

---

## Database Patterns

### Database Service

```python
# app/services/db_service.py

from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

Base = declarative_base()


class ProcessingJobModel(Base):
    """database model for processing jobs."""

    __tablename__ = "processing_jobs"

    job_id = Column(String, primary_key=True)
    video_s3_key = Column(String, nullable=False)
    status = Column(String, nullable=False)  # pending, processing, completed, failed
    progress = Column(Float, default=0.0)
    error_message = Column(String, nullable=True)
    segments = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class DatabaseService:
    """
    manages database connections and operations using sqlalchemy.

    provides connection pooling and context managers for safe
    transaction handling.
    """

    def __init__(self):
        """initialize database engine and session factory."""
        settings = get_settings()

        self.engine = create_engine(
            settings.database_url,
            pool_size=settings.database_pool_size,
            max_overflow=20,
            pool_pre_ping=True,  # verify connections before using
            echo=settings.debug  # log sql in debug mode
        )

        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

        # create tables if they don't exist
        Base.metadata.create_all(bind=self.engine)

        logger.info("database service initialized")

    @contextmanager
    def get_session(self) -> Session:
        """
        context manager for database sessions.

        automatically handles commit/rollback and session cleanup.

        usage:
            with db_service.get_session() as session:
                job = session.query(ProcessingJobModel).filter_by(job_id=id).first()
        """
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_job(
        self,
        job_id: str,
        video_s3_key: str,
        status: str = "pending"
    ) -> ProcessingJobModel:
        """
        create new processing job record.

        args:
            job_id: unique job identifier
            video_s3_key: s3 location of uploaded video
            status: initial job status

        returns:
            created job model instance
        """
        with self.get_session() as session:
            job = ProcessingJobModel(
                job_id=job_id,
                video_s3_key=video_s3_key,
                status=status
            )
            session.add(job)
            logger.info(f"created job record: {job_id}")
            return job

    def get_job(self, job_id: str) -> Optional[ProcessingJobModel]:
        """
        retrieve job by id.

        args:
            job_id: unique job identifier

        returns:
            job model or none if not found
        """
        with self.get_session() as session:
            return session.query(ProcessingJobModel).filter_by(job_id=job_id).first()

    def update_job_status(
        self,
        job_id: str,
        status: str,
        progress: Optional[float] = None,
        error_message: Optional[str] = None
    ) -> None:
        """
        update job status and progress.

        args:
            job_id: unique job identifier
            status: new status value
            progress: optional progress percentage
            error_message: optional error message for failures
        """
        with self.get_session() as session:
            job = session.query(ProcessingJobModel).filter_by(job_id=job_id).first()

            if not job:
                logger.warning(f"job not found for status update: {job_id}")
                return

            job.status = status
            if progress is not None:
                job.progress = progress
            if error_message:
                job.error_message = error_message

            if status in ["completed", "failed"]:
                job.completed_at = datetime.utcnow()

            logger.info(f"updated job {job_id}: status={status}, progress={progress}")

    def update_job_segments(self, job_id: str, segments: List[Dict]) -> None:
        """
        store processed segments for job.

        args:
            job_id: unique job identifier
            segments: list of processed segment dictionaries
        """
        with self.get_session() as session:
            job = session.query(ProcessingJobModel).filter_by(job_id=job_id).first()

            if not job:
                logger.warning(f"job not found for segment update: {job_id}")
                return

            job.segments = segments
            logger.info(f"updated {len(segments)} segments for job {job_id}")

    def list_jobs(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[ProcessingJobModel]:
        """
        list jobs with optional status filter.

        args:
            status: optional status filter
            limit: maximum number of jobs to return

        returns:
            list of job models
        """
        with self.get_session() as session:
            query = session.query(ProcessingJobModel)

            if status:
                query = query.filter_by(status=status)

            return query.order_by(
                ProcessingJobModel.created_at.desc()
            ).limit(limit).all()
```

---

## Error Handling

### Custom Exception Hierarchy

```python
# app/core/exceptions.py

class ApplicationError(Exception):
    """base exception for all application errors."""

    def __init__(self, message: str, details: dict = None):
        """
        initialize application error with message and optional details.

        args:
            message: human-readable error message
            details: optional dict with additional error context
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(ApplicationError):
    """raised when input validation fails."""
    pass


class ResourceNotFoundError(ApplicationError):
    """raised when requested resource doesn't exist."""
    pass


class StorageError(ApplicationError):
    """base exception for storage operations."""
    pass


class StorageUploadError(StorageError):
    """raised when file upload fails."""
    pass


class StorageDownloadError(StorageError):
    """raised when file download fails."""
    pass


class ProcessingError(ApplicationError):
    """raised when video processing fails."""
    pass


class AgentError(ApplicationError):
    """raised when agent execution fails."""
    pass


class ExternalServiceError(ApplicationError):
    """raised when external api calls fail (whisper, gemini, etc)."""
    pass


# usage in code:
def process_video(video_path: str) -> dict:
    """process video with comprehensive error handling."""

    if not os.path.exists(video_path):
        raise ResourceNotFoundError(
            f"video file not found",
            details={"video_path": video_path}
        )

    try:
        # processing logic here
        pass
    except KeyError as e:
        raise ProcessingError(
            "missing required video metadata",
            details={"missing_key": str(e)}
        ) from e
```

### Error Response Format

```python
# app/models/response.py

from pydantic import BaseModel
from typing import Optional, Dict, List


class ErrorDetail(BaseModel):
    """detailed error information."""

    field: Optional[str] = None
    message: str
    type: Optional[str] = None


class ErrorResponse(BaseModel):
    """standardized error response format."""

    error: str  # error type/code
    message: str  # human-readable message
    details: Optional[Dict] = None  # additional context
    errors: Optional[List[ErrorDetail]] = None  # validation errors
    request_id: Optional[str] = None  # for tracking


# example usage in endpoint:
@router.get("/jobs/{job_id}")
async def get_job(job_id: str) -> JobResponse:
    """retrieve job details."""

    job = await db_service.get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error="job_not_found",
                message=f"no job found with id: {job_id}",
                details={"job_id": job_id}
            ).dict()
        )

    return JobResponse.from_orm(job)
```

---

## Testing Standards

### Test Structure

```python
# tests/test_silence_detector.py

import pytest
from pathlib import Path
from agents.silence_detector import SilenceDetectorAgent, AgentError


class TestSilenceDetectorAgent:
    """test suite for silence detector agent."""

    @pytest.fixture
    def agent(self):
        """create agent instance for testing."""
        return SilenceDetectorAgent(job_id="test-job-123")

    @pytest.fixture
    def sample_video_path(self, tmp_path):
        """provide path to sample test video."""
        # in real tests, copy actual test video file
        video_path = tmp_path / "test_video.mp4"
        # create or copy test video
        return video_path

    def test_init_agent(self, agent):
        """test agent initialization."""
        assert agent.job_id == "test-job-123"
        assert agent.status == "initialized"
        assert agent.progress == 0.0

    def test_process_valid_video(self, agent, sample_video_path):
        """test processing valid video file."""
        segments = agent.execute(str(sample_video_path))

        assert isinstance(segments, list)
        assert len(segments) > 0

        # verify segment structure
        for seg in segments:
            assert 'start_time' in seg
            assert 'end_time' in seg
            assert 'is_silent' in seg
            assert seg['end_time'] > seg['start_time']

    def test_process_missing_video(self, agent):
        """test processing non-existent video."""
        with pytest.raises(AgentError, match="video file not found"):
            agent.execute("/nonexistent/video.mp4")

    def test_status_updates(self, agent, sample_video_path):
        """test that status updates correctly during processing."""
        agent.execute(str(sample_video_path))

        assert agent.status == "completed"
        assert agent.progress == 100.0
        assert agent.started_at is not None
        assert agent.completed_at is not None


# tests/test_s3_service.py

import pytest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError
from app.services.s3_service import S3Service, StorageUploadError


class TestS3Service:
    """test suite for s3 service."""

    @pytest.fixture
    def s3_service(self):
        """create s3 service with mocked boto3 client."""
        with patch('boto3.client'):
            return S3Service(bucket_name="test-bucket")

    def test_upload_file_success(self, s3_service, tmp_path):
        """test successful file upload."""
        # create test file
        test_file = tmp_path / "test.txt"
        test_file.write_text("test content")

        # mock boto3 client
        s3_service.client.upload_file = Mock()

        result = s3_service.upload_file(test_file, "uploads/test.txt")

        assert result == "s3://test-bucket/uploads/test.txt"
        s3_service.client.upload_file.assert_called_once()

    def test_upload_file_not_found(self, s3_service):
        """test upload with missing file."""
        with pytest.raises(StorageUploadError, match="file not found"):
            s3_service.upload_file(Path("/nonexistent.txt"), "key")

    def test_generate_presigned_url(self, s3_service):
        """test presigned url generation."""
        s3_service.client.generate_presigned_url = Mock(
            return_value="https://presigned-url.com"
        )

        url = s3_service.generate_presigned_url("test-key.mp4")

        assert url == "https://presigned-url.com"
        s3_service.client.generate_presigned_url.assert_called_once()


# tests/conftest.py

import pytest
from app.core.config import Settings


@pytest.fixture(scope="session")
def test_settings():
    """provide test configuration."""
    return Settings(
        environment="testing",
        database_url="sqlite:///test.db",
        aws_s3_bucket="test-bucket",
        redis_url="redis://localhost:6379/1"
    )


@pytest.fixture(autouse=True)
def reset_database(test_settings):
    """reset database before each test."""
    # setup: create fresh database
    yield
    # teardown: cleanup database
```

---

## Security Guidelines

### Input Validation

```python
# app/utils/validators.py

from pathlib import Path
from typing import Optional
import magic  # python-magic library
import re


def validate_video_file(file_path: Path, max_size_mb: int = 500) -> None:
    """
    validate video file for security and format compliance.

    checks:
    - file exists and is readable
    - file size within limits
    - mime type is valid video format
    - filename is safe (no path traversal)

    args:
        file_path: path to video file
        max_size_mb: maximum allowed file size

    raises:
        ValidationError: if validation fails
    """
    from app.core.exceptions import ValidationError

    # check file exists
    if not file_path.exists():
        raise ValidationError("file not found", details={"path": str(file_path)})

    # check file size
    size_mb = file_path.stat().st_size / (1024 * 1024)
    if size_mb > max_size_mb:
        raise ValidationError(
            f"file size {size_mb:.1f}mb exceeds maximum {max_size_mb}mb",
            details={"size_mb": size_mb, "max_mb": max_size_mb}
        )

    # check mime type using python-magic (more secure than extension check)
    mime = magic.from_file(str(file_path), mime=True)
    valid_mimes = {
        'video/mp4', 'video/mpeg', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/webm'
    }

    if mime not in valid_mimes:
        raise ValidationError(
            f"invalid video format: {mime}",
            details={"mime_type": mime}
        )

    # validate filename is safe (no path traversal)
    if not is_safe_filename(file_path.name):
        raise ValidationError(
            "unsafe filename detected",
            details={"filename": file_path.name}
        )


def is_safe_filename(filename: str) -> bool:
    """
    check if filename is safe (no path traversal attempts).

    rejects filenames containing:
    - path separators (/ or \\)
    - parent directory references (..)
    - null bytes

    args:
        filename: filename to validate

    returns:
        true if filename is safe
    """
    # reject path separators
    if '/' in filename or '\\' in filename:
        return False

    # reject parent directory references
    if '..' in filename:
        return False

    # reject null bytes
    if '\x00' in filename:
        return False

    # reject filenames starting with dot (hidden files)
    if filename.startswith('.'):
        return False

    return True


def sanitize_s3_key(key: str, user_id: str, job_id: str) -> str:
    """
    sanitize and structure s3 key to prevent unauthorized access.

    forces specific directory structure that includes user_id
    to prevent cross-user access.

    args:
        key: requested s3 key
        user_id: authenticated user id
        job_id: current job id

    returns:
        sanitized s3 key with proper structure
    """
    # extract just the filename
    filename = Path(key).name

    # remove any non-alphanumeric characters except dots, dashes, underscores
    filename = re.sub(r'[^\w\-\.]', '_', filename)

    # construct safe key with user and job isolation
    return f"users/{user_id}/jobs/{job_id}/{filename}"
```

### Environment Variable Security

```python
# never log sensitive configuration
import logging

logger = logging.getLogger(__name__)


def log_configuration_safely(settings: Settings) -> None:
    """
    log configuration without exposing secrets.

    masks sensitive values like api keys and passwords.
    """
    safe_config = {
        "environment": settings.environment,
        "aws_region": settings.aws_region,
        "aws_s3_bucket": settings.aws_s3_bucket,
        "database_url": mask_database_url(settings.database_url),
        "gemini_api_key": mask_secret(settings.gemini_api_key),
        "openai_api_key": mask_secret(settings.openai_api_key)
    }

    logger.info(f"application configuration: {safe_config}")


def mask_secret(secret: str) -> str:
    """mask secret value for logging."""
    if not secret:
        return "<not set>"

    if len(secret) <= 8:
        return "***"

    return f"{secret[:4]}...{secret[-4:]}"


def mask_database_url(url: str) -> str:
    """mask password in database url."""
    # postgresql://user:password@host:port/db -> postgresql://user:***@host:port/db
    import re
    return re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', url)
```

---

## Performance Optimization

### Caching Strategies

```python
# app/services/cache_service.py

import redis
import json
from typing import Optional, Any, Callable
from functools import wraps
import hashlib
import logging

logger = logging.getLogger(__name__)


class CacheService:
    """redis-based caching service for expensive operations."""

    def __init__(self, redis_url: str):
        """initialize redis connection."""
        self.redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )

    def get(self, key: str) -> Optional[Any]:
        """retrieve value from cache."""
        try:
            value = self.redis_client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.warning(f"cache get failed for {key}: {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        expire_seconds: int = 3600
    ) -> None:
        """store value in cache with expiration."""
        try:
            self.redis_client.setex(
                key,
                expire_seconds,
                json.dumps(value)
            )
        except Exception as e:
            logger.warning(f"cache set failed for {key}: {e}")

    def delete(self, key: str) -> None:
        """remove value from cache."""
        try:
            self.redis_client.delete(key)
        except Exception as e:
            logger.warning(f"cache delete failed for {key}: {e}")


def cache_result(expire_seconds: int = 3600):
    """
    decorator to cache function results in redis.

    usage:
        @cache_result(expire_seconds=1800)
        def expensive_operation(param1, param2):
            # expensive computation
            return result
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # generate cache key from function name and arguments
            cache_key = _generate_cache_key(func.__name__, args, kwargs)

            # try to get from cache
            cached = cache_service.get(cache_key)
            if cached is not None:
                logger.debug(f"cache hit for {func.__name__}")
                return cached

            # execute function and cache result
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, expire_seconds)

            return result

        return wrapper
    return decorator


def _generate_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """generate deterministic cache key from function signature."""
    # create string representation of arguments
    key_parts = [func_name]
    key_parts.extend(str(arg) for arg in args)
    key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))

    # hash to fixed length
    key_str = ":".join(key_parts)
    key_hash = hashlib.md5(key_str.encode()).hexdigest()

    return f"cache:{func_name}:{key_hash}"
```

### Async Operations

```python
# app/api/routes/jobs.py

from fastapi import APIRouter, Depends
from typing import List
import asyncio

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}/details")
async def get_job_details(
    job_id: str,
    db_service: DatabaseService = Depends(get_db_service),
    s3_service: S3Service = Depends(get_s3_service)
):
    """
    retrieve job details with parallel data fetching.

    fetches job info, segment data, and s3 urls concurrently
    for faster response times.
    """
    # execute multiple async operations in parallel
    job_data, segments, presigned_urls = await asyncio.gather(
        _fetch_job_from_db(db_service, job_id),
        _fetch_segments(db_service, job_id),
        _generate_presigned_urls(s3_service, job_id),
        return_exceptions=True  # don't fail all if one fails
    )

    # handle individual failures gracefully
    if isinstance(job_data, Exception):
        raise HTTPException(status_code=500, detail="failed to fetch job")

    return {
        "job": job_data,
        "segments": segments if not isinstance(segments, Exception) else [],
        "video_urls": presigned_urls if not isinstance(presigned_urls, Exception) else {}
    }


async def _fetch_job_from_db(db_service: DatabaseService, job_id: str) -> dict:
    """fetch job data asynchronously."""
    # wrap synchronous db call in thread executor
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, db_service.get_job, job_id)
```

---

## Summary Checklist

### before committing code:

- [ ] all functions have type hints
- [ ] all public functions have docstrings
- [ ] comments are lowercase with periods
- [ ] no hardcoded credentials or secrets
- [ ] error handling is comprehensive
- [ ] input validation is implemented
- [ ] tests are written and passing
- [ ] logging is appropriate (not excessive)
- [ ] code follows dry principle (don't repeat yourself)
- [ ] dependencies are injected, not hardcoded
- [ ] database sessions are properly closed
- [ ] file handles and resources are cleaned up
- [ ] exceptions include context for debugging
- [ ] sensitive data is not logged

### code review focus areas:

1. **security**: input validation, sql injection prevention, credential handling
2. **error handling**: proper exception types, useful error messages
3. **performance**: unnecessary loops, missing indexes, inefficient queries
4. **maintainability**: clear naming, proper abstraction, documentation
5. **testing**: edge cases covered, mocks used appropriately

---

*this document is a living standard. update it as new patterns emerge and requirements evolve.*
