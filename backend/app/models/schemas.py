"""Pydantic models for request/response validation."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class JobStatus(str, Enum):
    """Job processing status."""

    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingStage(str, Enum):
    """Video processing pipeline stages."""

    UPLOADING = "uploading"
    SILENCE_DETECTION = "silence_detection"
    TRANSCRIPTION = "transcription"
    LAYOUT_ANALYSIS = "layout_analysis"
    CONTENT_ANALYSIS = "content_analysis"
    SEGMENTATION = "segmentation"
    COMPILATION = "compilation"
    COMPLETE = "complete"


# Request Models


class UploadRequest(BaseModel):
    """Request to initiate video upload."""

    filename: str = Field(..., description="Original filename", min_length=1, max_length=255)
    file_size: int = Field(..., description="File size in bytes", gt=0)
    content_type: str = Field(..., description="MIME type of the file")


class UploadConfirmRequest(BaseModel):
    """Request to confirm S3 upload completion."""

    job_id: str = Field(..., description="Job identifier to confirm")


class UploadResponse(BaseModel):
    """Response with S3 pre-signed URL for upload."""

    job_id: str = Field(..., description="Unique job identifier")
    upload_url: HttpUrl = Field(..., description="Pre-signed S3 URL for upload")
    upload_fields: dict[str, str] = Field(
        default_factory=dict, description="Additional fields for the upload"
    )
    expires_in: int = Field(..., description="URL expiry time in seconds")
    s3_key: str = Field(..., description="S3 object key for the uploaded file")


# Job Models


class JobProgress(BaseModel):
    """Job progress information."""

    stage: ProcessingStage = Field(..., description="Current processing stage")
    percent: float = Field(..., description="Progress percentage (0-100)", ge=0, le=100)
    message: str = Field(..., description="Progress message")
    eta_seconds: int | None = Field(None, description="Estimated time remaining in seconds")


class JobCreate(BaseModel):
    """Job creation data."""

    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    s3_key: str = Field(..., description="S3 object key")


class JobResponse(BaseModel):
    """Job information response."""

    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current job status")
    filename: str = Field(..., description="Original filename")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    progress: JobProgress | None = Field(None, description="Current progress information")
    error_message: str | None = Field(None, description="Error message if failed")


class JobListResponse(BaseModel):
    """List of jobs response."""

    jobs: list[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")


# Result Models


class ClipMetadata(BaseModel):
    """Metadata for a generated clip."""

    clip_id: str = Field(..., description="Unique clip identifier")
    title: str = Field(..., description="Clip title")
    start_time: float = Field(..., description="Start time in seconds", ge=0)
    end_time: float = Field(..., description="End time in seconds", ge=0)
    duration: float = Field(..., description="Clip duration in seconds", ge=0)
    s3_key: str = Field(..., description="S3 object key for the clip")
    url: HttpUrl | None = Field(None, description="URL to access the clip")
    thumbnail_url: HttpUrl | None = Field(None, description="URL to clip thumbnail")


class TranscriptSegment(BaseModel):
    """Transcript segment."""

    start_time: float = Field(..., description="Start time in seconds")
    end_time: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcript text")
    confidence: float | None = Field(None, description="Confidence score", ge=0, le=1)


class ResultsResponse(BaseModel):
    """Processing results response."""

    job_id: str = Field(..., description="Job identifier")
    clips: list[ClipMetadata] = Field(..., description="Generated video clips")
    transcript: list[TranscriptSegment] | None = Field(None, description="Full transcript")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


# WebSocket Models


class WSMessage(BaseModel):
    """WebSocket message structure."""

    type: str = Field(..., description="Message type")
    job_id: str = Field(..., description="Job identifier")
    data: dict[str, Any] = Field(default_factory=dict, description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")


class WSProgressUpdate(BaseModel):
    """WebSocket progress update message."""

    job_id: str = Field(..., description="Job identifier")
    status: JobStatus = Field(..., description="Current job status")
    progress: JobProgress = Field(..., description="Progress information")


# Error Models


class ErrorDetail(BaseModel):
    """Error detail information."""

    field: str | None = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: dict[str, Any] = Field(
        ...,
        description="Error information",
        example={
            "code": "VALIDATION_ERROR",
            "message": "Invalid input data",
            "details": [{"field": "filename", "message": "Field is required"}],
        },
    )
