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

    # Podcast information
    podcast_s3_key = Column(String(500), nullable=True)
    podcast_duration = Column(Float, nullable=True)
    podcast_file_size = Column(Integer, nullable=True)
    podcast_status = Column(String(20), nullable=True)  # pending, processing, completed, failed

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
    slide_content = relationship(
        "SlideContent", back_populates="job", uselist=False, cascade="all, delete-orphan"
    )
    content_segments = relationship(
        "ContentSegment", back_populates="job", cascade="all, delete-orphan"
    )
    clips = relationship("Clip", back_populates="job", cascade="all, delete-orphan")
    processing_logs = relationship(
        "ProcessingLog", back_populates="job", cascade="all, delete-orphan"
    )
    quizzes = relationship("Quiz", back_populates="job", cascade="all, delete-orphan")
    summary = relationship(
        "Summary", back_populates="job", uselist=False, cascade="all, delete-orphan"
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
            "podcast_s3_key": self.podcast_s3_key,
            "podcast_duration": self.podcast_duration,
            "podcast_file_size": self.podcast_file_size,
            "podcast_status": self.podcast_status,
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
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Layout information
    layout_type = Column(String(30), nullable=False)
    screen_region = Column(JSON, nullable=True)
    camera_region = Column(JSON, nullable=True)
    split_ratio = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=False)
    sample_frame_time = Column(Float, nullable=False)

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
            "layout_type": self.layout_type,
            "screen_region": self.screen_region,
            "camera_region": self.camera_region,
            "split_ratio": self.split_ratio,
            "confidence_score": self.confidence_score,
            "sample_frame_time": self.sample_frame_time,
            "created_at": self.created_at,
        }


class SlideContent(Base):
    """Slide content database model for Image Agent OCR and visual analysis results."""

    __tablename__ = "slide_content"

    id = Column(Integer, primary_key=True, index=True)
    content_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Analysis metadata
    frames_analyzed = Column(Integer, nullable=False)
    extraction_method = Column(String(50), nullable=False)

    # Extracted content
    text_blocks = Column(JSON, nullable=False)
    visual_elements = Column(JSON, nullable=True)
    key_concepts = Column(JSON, nullable=True)

    # Processing metadata
    processing_time_seconds = Column(Float, nullable=True)
    model_used = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="slide_content")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of slide content
        """
        return {
            "content_id": self.content_id,
            "job_id": self.job_id,
            "frames_analyzed": self.frames_analyzed,
            "extraction_method": self.extraction_method,
            "text_blocks": self.text_blocks,
            "visual_elements": self.visual_elements,
            "key_concepts": self.key_concepts,
            "processing_time_seconds": self.processing_time_seconds,
            "model_used": self.model_used,
            "created_at": self.created_at,
        }


class ContentSegment(Base):
    """Content segment database model for AI-analyzed educational content."""

    __tablename__ = "content_segments"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Timing
    start_time = Column(Float, nullable=False, index=True)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    # Content metadata
    topic = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    importance_score = Column(Float, nullable=False, index=True)
    keywords = Column(JSON, default=list)
    concepts = Column(JSON, default=list)
    segment_order = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="content_segments")

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
    """Clip database model for extracted video highlights."""

    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, index=True)
    clip_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)
    content_segment_id = Column(String(100), nullable=True)

    # Metadata
    title = Column(String(200), nullable=False)
    topic = Column(String(200), nullable=False)
    importance_score = Column(Float, nullable=False)

    # Timing
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    # Files
    s3_key = Column(String(500), nullable=True)
    thumbnail_s3_key = Column(String(500), nullable=True)
    subtitle_s3_key = Column(String(500), nullable=True)

    # Ordering & metadata
    clip_order = Column(Integer, nullable=False)
    extra_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="clips")

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

    # Log details
    stage = Column(String(50), nullable=False, index=True)
    agent_name = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False)
    message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Timestamps
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

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
            "message": self.message,
            "error_details": self.error_details,
            "duration_seconds": self.duration_seconds,
            "timestamp": self.timestamp,
            "created_at": self.created_at,
        }


class Quiz(Base):
    """Quiz database model for AI-generated quizzes."""

    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)
    user_id = Column(String(100), ForeignKey("users.user_id"), nullable=True, index=True)

    # Quiz metadata
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=False)
    total_questions = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    job = relationship("Job", back_populates="quizzes")
    user = relationship("User", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the quiz
        """
        return {
            "quiz_id": self.quiz_id,
            "job_id": self.job_id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty,
            "total_questions": self.total_questions,
            "created_at": self.created_at,
        }


class QuizQuestion(Base):
    """Quiz question database model for individual quiz questions."""

    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(String(100), unique=True, index=True, nullable=False)
    quiz_id = Column(String(100), ForeignKey("quizzes.quiz_id"), nullable=False, index=True)

    # Question content
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)

    # Ordering
    question_order = Column(Integer, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    quiz = relationship("Quiz", back_populates="questions")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the quiz question
        """
        return {
            "question_id": self.question_id,
            "quiz_id": self.quiz_id,
            "question": self.question_text,
            "type": self.question_type,
            "options": self.options,
            "correctAnswer": self.correct_answer_index,
            "explanation": self.explanation,
            "difficulty": self.quiz.difficulty if self.quiz else "medium",
        }


class Summary(Base):
    """Summary database model for AI-generated lecture summaries."""

    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), ForeignKey("jobs.job_id"), nullable=False, index=True)

    # Summary content
    summary_text = Column(Text, nullable=False)
    key_takeaways = Column(JSON, nullable=False)
    topics_covered = Column(JSON, nullable=False)
    learning_objectives = Column(JSON, nullable=True)

    # Metadata
    word_count = Column(Integer, nullable=True)
    model_used = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="summary")

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the summary
        """
        return {
            "summary_id": self.summary_id,
            "job_id": self.job_id,
            "summary_text": self.summary_text,
            "key_takeaways": self.key_takeaways,
            "topics_covered": self.topics_covered,
            "learning_objectives": self.learning_objectives,
            "word_count": self.word_count,
            "model_used": self.model_used,
            "created_at": self.created_at,
        }
