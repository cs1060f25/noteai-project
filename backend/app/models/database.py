"""Database models."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Job(Base):
    """Job database model for tracking lecture processing jobs."""

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), unique=True, index=True, nullable=False)

    # user reference
    user_id = Column(
        String(100), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True
    )

    # File information
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String(100), nullable=False)
    original_s3_key = Column(String(500), nullable=False)
    compiled_video_s3_key = Column(String(500), nullable=True)  # Highlight video (compiled clips)

    # Video metadata
    video_duration = Column(Float, nullable=True)
    video_metadata = Column(JSON, default=dict)

    # Processing status
    status = Column(String(20), nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    celery_task_id = Column(String(100), nullable=True, index=True)

    # Progress tracking
    current_stage = Column(String(50), nullable=True)
    progress_percent = Column(Float, default=0.0)
    progress_message = Column(String(500), nullable=True)
    eta_seconds = Column(Integer, nullable=True)

    # Additional metadata
    extra_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="jobs")
    transcripts = relationship("Transcript", back_populates="job", cascade="all, delete-orphan")
    silence_regions = relationship(
        "SilenceRegion", back_populates="job", cascade="all, delete-orphan"
    )
    layout_analysis = relationship(
        "LayoutAnalysis", back_populates="job", uselist=False, cascade="all, delete-orphan"
    )
    content_segments = relationship(
        "ContentSegment", back_populates="job", cascade="all, delete-orphan"
    )
    clips = relationship("Clip", back_populates="job", cascade="all, delete-orphan")
    processing_logs = relationship(
        "ProcessingLog", back_populates="job", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the job
        """
        return {
            "job_id": self.job_id,
            "filename": self.filename,
            "file_size": self.file_size,
            "content_type": self.content_type,
            "original_s3_key": self.original_s3_key,
            "video_duration": self.video_duration,
            "status": self.status,
            "error_message": self.error_message,
            "current_stage": self.current_stage,
            "progress_percent": self.progress_percent,
            "progress_message": self.progress_message,
            "eta_seconds": self.eta_seconds,
            "extra_metadata": self.extra_metadata,
            "video_metadata": self.video_metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "completed_at": self.completed_at,
        }


class Transcript(Base):
    """Transcript segment database model for Whisper API results."""

    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Timing
    start_time = Column(Float, nullable=False, index=True)
    end_time = Column(Float, nullable=False)

    # Content
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    speaker_id = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="transcripts")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the transcript segment
        """
        return {
            "segment_id": self.segment_id,
            "job_id": self.job_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text,
            "confidence": self.confidence,
            "speaker_id": self.speaker_id,
            "created_at": self.created_at,
        }


class SilenceRegion(Base):
    """Silence region database model for audio/video analysis."""

    __tablename__ = "silence_regions"

    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Timing
    start_time = Column(Float, nullable=False, index=True)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    # Analysis details
    silence_type = Column(String(20), nullable=False)  # 'audio_silence', 'blank_screen', 'both'
    amplitude_threshold = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="silence_regions")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the silence region
        """
        return {
            "region_id": self.region_id,
            "job_id": self.job_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "silence_type": self.silence_type,
            "amplitude_threshold": self.amplitude_threshold,
            "created_at": self.created_at,
        }


class LayoutAnalysis(Base):
    """Layout analysis database model for screen/camera detection."""

    __tablename__ = "layout_analysis"

    id = Column(Integer, primary_key=True, index=True)
    layout_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, unique=True, index=True)

    # Layout regions (stored as JSON: {x, y, width, height})
    screen_region = Column(JSON, nullable=False)
    camera_region = Column(JSON, nullable=False)

    # Layout properties
    split_ratio = Column(Float, nullable=False)  # e.g., 0.7 for 70/30 split
    layout_type = Column(String(30), nullable=False)  # 'side_by_side', 'picture_in_picture', etc.
    confidence_score = Column(Float, nullable=True)
    sample_frame_time = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="layout_analysis")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the layout analysis
        """
        return {
            "layout_id": self.layout_id,
            "job_id": self.job_id,
            "screen_region": self.screen_region,
            "camera_region": self.camera_region,
            "split_ratio": self.split_ratio,
            "layout_type": self.layout_type,
            "confidence_score": self.confidence_score,
            "sample_frame_time": self.sample_frame_time,
            "created_at": self.created_at,
        }


class ContentSegment(Base):
    """Content segment database model for Gemini content analysis."""

    __tablename__ = "content_segments"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Timing
    start_time = Column(Float, nullable=False, index=True)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    # Content analysis
    topic = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    importance_score = Column(Float, nullable=False, index=True)
    keywords = Column(JSON, default=list)
    concepts = Column(JSON, default=list)
    segment_order = Column(Integer, nullable=False, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="content_segments")
    clip = relationship("Clip", back_populates="content_segment", uselist=False)

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the content segment
        """
        return {
            "segment_id": self.segment_id,
            "job_id": self.job_id,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "topic": self.topic,
            "description": self.description,
            "importance_score": self.importance_score,
            "keywords": self.keywords,
            "concepts": self.concepts,
            "segment_order": self.segment_order,
            "created_at": self.created_at,
        }


class Clip(Base):
    """Generated clip database model."""

    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, index=True)
    clip_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)
    content_segment_id = Column(
        String(100), ForeignKey("content_segments.segment_id"), nullable=True, index=True
    )

    # Content
    title = Column(String(500), nullable=False)
    topic = Column(String(500), nullable=True)
    importance_score = Column(Float, nullable=True, index=True)

    # Timing
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    # Storage
    s3_key = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)  # size of the clip video file
    thumbnail_s3_key = Column(String(500), nullable=True)
    subtitle_s3_key = Column(String(500), nullable=True)

    # Display
    clip_order = Column(Integer, nullable=True, index=True)

    # Metadata
    extra_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="clips")
    content_segment = relationship("ContentSegment", back_populates="clip")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the clip
        """
        return {
            "clip_id": self.clip_id,
            "job_id": self.job_id,
            "content_segment_id": self.content_segment_id,
            "title": self.title,
            "topic": self.topic,
            "importance_score": self.importance_score,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "s3_key": self.s3_key,
            "file_size_bytes": self.file_size_bytes,
            "thumbnail_s3_key": self.thumbnail_s3_key,
            "subtitle_s3_key": self.subtitle_s3_key,
            "clip_order": self.clip_order,
            "extra_metadata": self.extra_metadata,
            "created_at": self.created_at,
        }


class ProcessingLog(Base):
    """Processing log database model for audit trail and debugging."""

    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Processing details
    stage = Column(String(50), nullable=False, index=True)
    agent_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False)  # 'started', 'completed', 'failed'
    duration_seconds = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    # Additional context
    extra_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    job = relationship("Job", back_populates="processing_logs")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the processing log
        """
        return {
            "log_id": self.log_id,
            "job_id": self.job_id,
            "stage": self.stage,
            "agent_name": self.agent_name,
            "status": self.status,
            "duration_seconds": self.duration_seconds,
            "error_message": self.error_message,
            "extra_metadata": self.extra_metadata,
            "created_at": self.created_at,
        }
