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

    INITIALIZING = "initializing"
    UPLOADING = "uploading"
    SILENCE_DETECTION = "silence_detection"
    TRANSCRIPTION = "transcription"
    LAYOUT_ANALYSIS = "layout_analysis"
    IMAGE_EXTRACTION = "image_extraction"
    CONTENT_ANALYSIS = "content_analysis"
    SEGMENTATION = "segmentation"
    COMPILATION = "compilation"
    COMPLETE = "complete"


class ProcessingMode(str, Enum):
    """Video processing mode."""

    AUDIO = "audio"
    VISION = "vision"


class ResolutionOption(str, Enum):
    """Output resolution options."""

    HD_720P = "720p"
    FULL_HD_1080P = "1080p"
    QHD_1440P = "1440p"
    UHD_4K = "2160p"


class ProcessingConfig(BaseModel):
    """Processing configuration for video analysis."""

    prompt: str | None = Field(
        None,
        description="Optional AI instructions for content analysis",
        max_length=2000,
    )
    resolution: ResolutionOption = Field(
        default=ResolutionOption.FULL_HD_1080P,
        description="Output video resolution",
    )
    processing_mode: ProcessingMode = Field(
        default=ProcessingMode.VISION,
        description="Processing mode: audio-only or vision+audio",
    )
    rate_limit_mode: bool = Field(
        default=True,
        description="Enable rate limiting for API calls (recommended for free-tier keys)",
    )


# Request Models


class UploadRequest(BaseModel):
    """Request to initiate video upload."""

    filename: str = Field(..., description="Original filename", min_length=1, max_length=255)
    file_size: int = Field(..., description="File size in bytes", gt=0)
    content_type: str = Field(..., description="MIME type of the file")
    processing_config: ProcessingConfig | None = Field(
        None,
        description="Optional processing configuration (prompt, resolution, mode)",
    )


class UploadConfirmRequest(BaseModel):
    """Request to confirm S3 upload completion."""

    job_id: str = Field(..., description="Job identifier to confirm")


class YouTubeUploadRequest(BaseModel):
    """Request to upload video from YouTube URL."""

    url: str = Field(..., description="YouTube video URL", min_length=1)
    processing_config: ProcessingConfig | None = Field(
        None,
        description="Optional processing configuration (prompt, resolution, mode)",
    )


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
    agent_name: str | None = Field(None, description="Name of the agent currently processing")


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
    processing_mode: ProcessingMode | None = Field(
        None, description="Processing mode (audio/vision)"
    )
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    progress: JobProgress | None = Field(None, description="Current progress information")
    error_message: str | None = Field(None, description="Error message if failed")
    thumbnail_url: HttpUrl | None = Field(None, description="URL to video thumbnail")


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
    subtitle_url: str | None = Field(None, description="URL to WebVTT subtitle file")


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


# Agent Output Models


class SilenceRegionResponse(BaseModel):
    """Detected silence region."""

    region_id: str = Field(..., description="Unique region identifier")
    start_time: float = Field(..., description="Start time in seconds", ge=0)
    end_time: float = Field(..., description="End time in seconds", ge=0)
    duration: float = Field(..., description="Duration in seconds", ge=0)
    silence_type: str = Field(
        ..., description="Type of silence: 'audio_silence', 'blank_screen', or 'both'"
    )
    amplitude_threshold: float | None = Field(
        None, description="Audio amplitude threshold in dBFS (if audio silence)"
    )
    created_at: datetime = Field(..., description="Detection timestamp")


class LayoutAnalysisResponse(BaseModel):
    """Video layout analysis result."""

    layout_id: str = Field(..., description="Unique layout identifier")
    job_id: str = Field(..., description="Associated job ID")
    screen_region: dict[str, int] = Field(
        ..., description="Screen region coordinates {x, y, width, height}"
    )
    camera_region: dict[str, int] = Field(
        ..., description="Camera region coordinates {x, y, width, height}"
    )
    split_ratio: float = Field(..., description="Screen to camera split ratio (0-1)", ge=0, le=1)
    layout_type: str = Field(
        ...,
        description="Detected layout type: 'side_by_side', 'picture_in_picture', 'screen_only', 'camera_only', 'unknown'",
    )
    confidence_score: float = Field(
        ..., description="Detection confidence (0-1, 0 = fallback default)", ge=0, le=1
    )
    sample_frame_time: float | None = Field(
        None, description="Frame time used for analysis (seconds)"
    )
    created_at: datetime = Field(..., description="Analysis timestamp")


class ContentSegmentResponse(BaseModel):
    """AI-analyzed content segment."""

    segment_id: str = Field(..., description="Unique segment identifier")
    start_time: float = Field(..., description="Start time in seconds", ge=0)
    end_time: float = Field(..., description="End time in seconds", ge=0)
    duration: float = Field(..., description="Duration in seconds", ge=0)
    topic: str = Field(..., description="Segment topic")
    description: str | None = Field(None, description="Detailed description")
    importance_score: float = Field(..., description="Importance score (0-1)", ge=0, le=1)
    keywords: list[str] = Field(default_factory=list, description="Extracted keywords")
    concepts: list[str] = Field(default_factory=list, description="Key concepts")
    segment_order: int = Field(..., description="Order in sequence", ge=0)
    created_at: datetime = Field(..., description="Analysis timestamp")


class TranscriptsResponse(BaseModel):
    """List of transcript segments response."""

    job_id: str = Field(..., description="Job identifier")
    segments: list[TranscriptSegment] = Field(..., description="Transcript segments")
    total: int = Field(..., description="Total number of segments")


class SilenceRegionsResponse(BaseModel):
    """List of silence regions response."""

    job_id: str = Field(..., description="Job identifier")
    regions: list[SilenceRegionResponse] = Field(..., description="Silence regions")
    total: int = Field(..., description="Total number of regions")


class ContentSegmentsResponse(BaseModel):
    """List of content segments response."""

    job_id: str = Field(..., description="Job identifier")
    segments: list[ContentSegmentResponse] = Field(..., description="Content segments")
    total: int = Field(..., description="Total number of segments")


class ClipResponse(BaseModel):
    """Individual clip response for agent outputs."""

    clip_id: str = Field(..., description="Unique clip identifier")
    content_segment_id: str | None = Field(None, description="Associated content segment ID")
    title: str = Field(..., description="Clip title")
    topic: str | None = Field(None, description="Clip topic")
    importance_score: float | None = Field(None, description="Importance score (0-1)", ge=0, le=1)
    start_time: float = Field(..., description="Start time in seconds", ge=0)
    end_time: float = Field(..., description="End time in seconds", ge=0)
    duration: float = Field(..., description="Clip duration in seconds", ge=0)
    clip_order: int | None = Field(None, description="Display order (1-based)")
    extra_metadata: dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(..., description="Creation timestamp")


class ClipsResponse(BaseModel):
    """List of clips response."""

    job_id: str = Field(..., description="Job identifier")
    clips: list[ClipResponse] = Field(..., description="Generated clips")
    total: int = Field(..., description="Total number of clips")


class QuizQuestion(BaseModel):
    """Quiz question model."""

    id: int = Field(..., description="Question ID")
    type: str = Field(..., description="Question type: 'multiple-choice' or 'true-false'")
    question: str = Field(..., description="The question text")
    options: list[str] = Field(..., description="List of options")
    correct_answer: int = Field(
        ..., description="Index of the correct answer", alias="correctAnswer"
    )
    explanation: str = Field(..., description="Explanation for the answer")
    difficulty: str = Field(..., description="Difficulty level: 'easy', 'medium', 'hard'")


class QuizResponse(BaseModel):
    """Quiz generation response."""

    job_id: str = Field(..., description="Job identifier")
    questions: list[QuizQuestion] = Field(..., description="List of generated questions")


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


# User Models


class UserResponse(BaseModel):
    """User information response."""

    user_id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email address")
    name: str | None = Field(None, description="User full name")
    picture_url: str | None = Field(None, description="Profile picture URL")
    organization: str | None = Field(None, description="User organization")
    email_notifications: bool = Field(..., description="Email notifications enabled")
    processing_notifications: bool = Field(..., description="Processing notifications enabled")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class UserUpdateRequest(BaseModel):
    """Request to update user information."""

    name: str | None = Field(None, description="User full name", max_length=255)
    organization: str | None = Field(None, description="User organization", max_length=255)
    email_notifications: bool | None = Field(None, description="Email notifications enabled")
    processing_notifications: bool | None = Field(
        None, description="Processing notifications enabled"
    )
