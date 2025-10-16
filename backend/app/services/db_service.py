"""Database service layer with repository pattern for all models.

This module provides a clean abstraction over database operations,
implementing the repository pattern for each model with comprehensive
CRUD operations, query builders, and transaction management.
"""

from datetime import datetime
from typing import Any

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.database import (
    Clip,
    ContentSegment,
    Job,
    LayoutAnalysis,
    ProcessingLog,
    SilenceRegion,
    Transcript,
)

# ============================================================================
# Job Repository
# ============================================================================


class JobRepository:
    """Repository for Job model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        job_id: str,
        filename: str,
        file_size: int,
        content_type: str,
        original_s3_key: str,
        status: str = "queued",
        **kwargs: Any,
    ) -> Job:
        """Create a new job.

        Args:
            job_id: Unique job identifier
            filename: Original filename
            file_size: File size in bytes
            content_type: MIME type
            original_s3_key: S3 object key
            status: Initial job status (default: queued)
            **kwargs: Additional job fields

        Returns:
            Created Job instance
        """
        job = Job(
            job_id=job_id,
            filename=filename,
            file_size=file_size,
            content_type=content_type,
            original_s3_key=original_s3_key,
            status=status,
            **kwargs,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: str) -> Job | None:
        """Get job by job_id.

        Args:
            job_id: Job identifier

        Returns:
            Job instance or None if not found
        """
        return self.db.query(Job).filter(Job.job_id == job_id).first()

    def get_by_celery_task_id(self, celery_task_id: str) -> Job | None:
        """Get job by Celery task ID.

        Args:
            celery_task_id: Celery task identifier

        Returns:
            Job instance or None if not found
        """
        return self.db.query(Job).filter(Job.celery_task_id == celery_task_id).first()

    def list_jobs(
        self,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Job]:
        """List jobs with optional filtering and pagination.

        Args:
            status: Filter by status (optional)
            limit: Maximum number of results
            offset: Number of results to skip
            order_by: Field to order by
            order_desc: Order descending if True

        Returns:
            List of Job instances
        """
        query = self.db.query(Job)

        if status:
            query = query.filter(Job.status == status)

        # apply ordering
        order_field = getattr(Job, order_by, Job.created_at)
        query = query.order_by(desc(order_field)) if order_desc else query.order_by(order_field)

        return query.offset(offset).limit(limit).all()

    def list_jobs_by_user(
        self,
        user_id: str,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> list[Job]:
        """List jobs for a specific user with optional filtering and pagination.

        Args:
            user_id: User identifier to filter by
            status: Filter by status (optional)
            limit: Maximum number of results
            offset: Number of results to skip
            order_by: Field to order by
            order_desc: Order descending if True

        Returns:
            List of Job instances
        """
        query = self.db.query(Job).filter(Job.user_id == user_id)

        if status:
            query = query.filter(Job.status == status)

        # apply ordering
        order_field = getattr(Job, order_by, Job.created_at)
        query = query.order_by(desc(order_field)) if order_desc else query.order_by(order_field)

        return query.offset(offset).limit(limit).all()

    def count_jobs(self, status: str | None = None) -> int:
        """Count total jobs with optional status filter.

        Args:
            status: Filter by status (optional)

        Returns:
            Total count of jobs
        """
        query = self.db.query(func.count(Job.id))
        if status:
            query = query.filter(Job.status == status)
        return query.scalar() or 0

    def count_jobs_by_user(self, user_id: str, status: str | None = None) -> int:
        """Count total jobs for a specific user with optional status filter.

        Args:
            user_id: User identifier to filter by
            status: Filter by status (optional)

        Returns:
            Total count of jobs for the user
        """
        query = self.db.query(func.count(Job.id)).filter(Job.user_id == user_id)
        if status:
            query = query.filter(Job.status == status)
        return query.scalar() or 0

    def update_status(
        self,
        job_id: str,
        status: str,
        error_message: str | None = None,
        completed_at: datetime | None = None,
    ) -> Job | None:
        """Update job status.

        Args:
            job_id: Job identifier
            status: New status
            error_message: Error message if failed
            completed_at: Completion timestamp

        Returns:
            Updated Job instance or None if not found
        """
        job = self.get_by_id(job_id)
        if not job:
            return None

        job.status = status
        job.updated_at = datetime.utcnow()

        if error_message is not None:
            job.error_message = error_message

        if completed_at is not None:
            job.completed_at = completed_at
        elif status == "completed":
            job.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(job)
        return job

    def update_progress(
        self,
        job_id: str,
        current_stage: str,
        progress_percent: float,
        progress_message: str | None = None,
        eta_seconds: int | None = None,
    ) -> Job | None:
        """Update job progress.

        Args:
            job_id: Job identifier
            current_stage: Current processing stage
            progress_percent: Progress percentage (0-100)
            progress_message: Human-readable progress message
            eta_seconds: Estimated time remaining

        Returns:
            Updated Job instance or None if not found
        """
        job = self.get_by_id(job_id)
        if not job:
            return None

        job.current_stage = current_stage
        job.progress_percent = progress_percent
        job.updated_at = datetime.utcnow()

        if progress_message is not None:
            job.progress_message = progress_message

        if eta_seconds is not None:
            job.eta_seconds = eta_seconds

        self.db.commit()
        self.db.refresh(job)
        return job

    def update_celery_task_id(self, job_id: str, celery_task_id: str) -> Job | None:
        """Update Celery task ID.

        Args:
            job_id: Job identifier
            celery_task_id: Celery task identifier

        Returns:
            Updated Job instance or None if not found
        """
        job = self.get_by_id(job_id)
        if not job:
            return None

        job.celery_task_id = celery_task_id
        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        return job

    def update_video_metadata(
        self,
        job_id: str,
        video_duration: float | None = None,
        video_metadata: dict[str, Any] | None = None,
    ) -> Job | None:
        """Update video metadata.

        Args:
            job_id: Job identifier
            video_duration: Video duration in seconds
            video_metadata: Additional video metadata

        Returns:
            Updated Job instance or None if not found
        """
        job = self.get_by_id(job_id)
        if not job:
            return None

        if video_duration is not None:
            job.video_duration = video_duration

        if video_metadata is not None:
            job.video_metadata = video_metadata

        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        return job

    def delete(self, job_id: str) -> bool:
        """Delete a job and all related records (cascades).

        Args:
            job_id: Job identifier

        Returns:
            True if deleted, False if not found
        """
        job = self.get_by_id(job_id)
        if not job:
            return False

        self.db.delete(job)
        self.db.commit()
        return True


# ============================================================================
# Transcript Repository
# ============================================================================


class TranscriptRepository:
    """Repository for Transcript model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        segment_id: str,
        job_id: str,
        start_time: float,
        end_time: float,
        text: str,
        confidence: float | None = None,
        speaker_id: str | None = None,
    ) -> Transcript:
        """Create a new transcript segment.

        Args:
            segment_id: Unique segment identifier
            job_id: Associated job identifier
            start_time: Start time in seconds
            end_time: End time in seconds
            text: Transcript text
            confidence: Confidence score (0-1)
            speaker_id: Speaker identifier

        Returns:
            Created Transcript instance
        """
        transcript = Transcript(
            segment_id=segment_id,
            job_id=job_id,
            start_time=start_time,
            end_time=end_time,
            text=text,
            confidence=confidence,
            speaker_id=speaker_id,
        )
        self.db.add(transcript)
        self.db.commit()
        self.db.refresh(transcript)
        return transcript

    def bulk_create(self, segments: list[dict[str, Any]]) -> list[Transcript]:
        """Create multiple transcript segments at once.

        Args:
            segments: List of segment dictionaries

        Returns:
            List of created Transcript instances
        """
        transcripts = [Transcript(**segment) for segment in segments]
        self.db.bulk_save_objects(transcripts, return_defaults=True)
        self.db.commit()
        return transcripts

    def get_by_job_id(self, job_id: str, order_by_time: bool = True) -> list[Transcript]:
        """Get all transcript segments for a job.

        Args:
            job_id: Job identifier
            order_by_time: Order by start_time if True

        Returns:
            List of Transcript instances
        """
        query = self.db.query(Transcript).filter(Transcript.job_id == job_id)

        if order_by_time:
            query = query.order_by(Transcript.start_time)

        return query.all()

    def get_by_time_range(
        self, job_id: str, start_time: float, end_time: float
    ) -> list[Transcript]:
        """Get transcript segments within a time range.

        Args:
            job_id: Job identifier
            start_time: Range start time
            end_time: Range end time

        Returns:
            List of Transcript instances
        """
        return (
            self.db.query(Transcript)
            .filter(
                Transcript.job_id == job_id,
                Transcript.start_time >= start_time,
                Transcript.end_time <= end_time,
            )
            .order_by(Transcript.start_time)
            .all()
        )

    def search_text(self, job_id: str, search_term: str) -> list[Transcript]:
        """Search transcript text.

        Args:
            job_id: Job identifier
            search_term: Text to search for

        Returns:
            List of matching Transcript instances
        """
        return (
            self.db.query(Transcript)
            .filter(Transcript.job_id == job_id, Transcript.text.ilike(f"%{search_term}%"))
            .order_by(Transcript.start_time)
            .all()
        )

    def delete_by_job_id(self, job_id: str) -> int:
        """Delete all transcripts for a job.

        Args:
            job_id: Job identifier

        Returns:
            Number of deleted records
        """
        count = self.db.query(Transcript).filter(Transcript.job_id == job_id).count()
        self.db.query(Transcript).filter(Transcript.job_id == job_id).delete()
        self.db.commit()
        return count


# ============================================================================
# Silence Region Repository
# ============================================================================


class SilenceRegionRepository:
    """Repository for SilenceRegion model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        region_id: str,
        job_id: str,
        start_time: float,
        end_time: float,
        duration: float,
        silence_type: str,
        amplitude_threshold: float | None = None,
    ) -> SilenceRegion:
        """Create a new silence region.

        Args:
            region_id: Unique region identifier
            job_id: Associated job identifier
            start_time: Start time in seconds
            end_time: End time in seconds
            duration: Duration in seconds
            silence_type: Type of silence (audio_silence, blank_screen, both)
            amplitude_threshold: Amplitude threshold used

        Returns:
            Created SilenceRegion instance
        """
        region = SilenceRegion(
            region_id=region_id,
            job_id=job_id,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            silence_type=silence_type,
            amplitude_threshold=amplitude_threshold,
        )
        self.db.add(region)
        self.db.commit()
        self.db.refresh(region)
        return region

    def bulk_create(self, regions: list[dict[str, Any]]) -> list[SilenceRegion]:
        """Create multiple silence regions at once.

        Args:
            regions: List of region dictionaries

        Returns:
            List of created SilenceRegion instances
        """
        silence_regions = [SilenceRegion(**region) for region in regions]
        self.db.bulk_save_objects(silence_regions, return_defaults=True)
        self.db.commit()
        return silence_regions

    def get_by_job_id(self, job_id: str, order_by_time: bool = True) -> list[SilenceRegion]:
        """Get all silence regions for a job.

        Args:
            job_id: Job identifier
            order_by_time: Order by start_time if True

        Returns:
            List of SilenceRegion instances
        """
        query = self.db.query(SilenceRegion).filter(SilenceRegion.job_id == job_id)

        if order_by_time:
            query = query.order_by(SilenceRegion.start_time)

        return query.all()

    def get_by_type(self, job_id: str, silence_type: str) -> list[SilenceRegion]:
        """Get silence regions by type.

        Args:
            job_id: Job identifier
            silence_type: Type of silence to filter by

        Returns:
            List of SilenceRegion instances
        """
        return (
            self.db.query(SilenceRegion)
            .filter(SilenceRegion.job_id == job_id, SilenceRegion.silence_type == silence_type)
            .order_by(SilenceRegion.start_time)
            .all()
        )

    def get_by_min_duration(self, job_id: str, min_duration: float) -> list[SilenceRegion]:
        """Get silence regions with minimum duration.

        Args:
            job_id: Job identifier
            min_duration: Minimum duration threshold

        Returns:
            List of SilenceRegion instances
        """
        return (
            self.db.query(SilenceRegion)
            .filter(SilenceRegion.job_id == job_id, SilenceRegion.duration >= min_duration)
            .order_by(SilenceRegion.start_time)
            .all()
        )

    def delete_by_job_id(self, job_id: str) -> int:
        """Delete all silence regions for a job.

        Args:
            job_id: Job identifier

        Returns:
            Number of deleted records
        """
        count = self.db.query(SilenceRegion).filter(SilenceRegion.job_id == job_id).count()
        self.db.query(SilenceRegion).filter(SilenceRegion.job_id == job_id).delete()
        self.db.commit()
        return count


# ============================================================================
# Layout Analysis Repository
# ============================================================================


class LayoutAnalysisRepository:
    """Repository for LayoutAnalysis model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        layout_id: str,
        job_id: str,
        screen_region: dict[str, Any],
        camera_region: dict[str, Any],
        split_ratio: float,
        layout_type: str,
        confidence_score: float | None = None,
        sample_frame_time: float | None = None,
    ) -> LayoutAnalysis:
        """Create a new layout analysis.

        Args:
            layout_id: Unique layout identifier
            job_id: Associated job identifier
            screen_region: Screen region coordinates
            camera_region: Camera region coordinates
            split_ratio: Split ratio (e.g., 0.7 for 70/30)
            layout_type: Layout type (side_by_side, picture_in_picture, etc.)
            confidence_score: Confidence score
            sample_frame_time: Frame time used for analysis

        Returns:
            Created LayoutAnalysis instance
        """
        layout = LayoutAnalysis(
            layout_id=layout_id,
            job_id=job_id,
            screen_region=screen_region,
            camera_region=camera_region,
            split_ratio=split_ratio,
            layout_type=layout_type,
            confidence_score=confidence_score,
            sample_frame_time=sample_frame_time,
        )
        self.db.add(layout)
        self.db.commit()
        self.db.refresh(layout)
        return layout

    def get_by_job_id(self, job_id: str) -> LayoutAnalysis | None:
        """Get layout analysis for a job.

        Args:
            job_id: Job identifier

        Returns:
            LayoutAnalysis instance or None if not found
        """
        return self.db.query(LayoutAnalysis).filter(LayoutAnalysis.job_id == job_id).first()

    def update(self, job_id: str, **kwargs: Any) -> LayoutAnalysis | None:
        """Update layout analysis.

        Args:
            job_id: Job identifier
            **kwargs: Fields to update

        Returns:
            Updated LayoutAnalysis instance or None if not found
        """
        layout = self.get_by_job_id(job_id)
        if not layout:
            return None

        for key, value in kwargs.items():
            if hasattr(layout, key):
                setattr(layout, key, value)

        self.db.commit()
        self.db.refresh(layout)
        return layout

    def delete_by_job_id(self, job_id: str) -> bool:
        """Delete layout analysis for a job.

        Args:
            job_id: Job identifier

        Returns:
            True if deleted, False if not found
        """
        layout = self.get_by_job_id(job_id)
        if not layout:
            return False

        self.db.delete(layout)
        self.db.commit()
        return True


# ============================================================================
# Content Segment Repository
# ============================================================================


class ContentSegmentRepository:
    """Repository for ContentSegment model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        segment_id: str,
        job_id: str,
        start_time: float,
        end_time: float,
        duration: float,
        topic: str,
        importance_score: float,
        segment_order: int,
        description: str | None = None,
        keywords: list[str] | None = None,
        concepts: list[str] | None = None,
    ) -> ContentSegment:
        """Create a new content segment.

        Args:
            segment_id: Unique segment identifier
            job_id: Associated job identifier
            start_time: Start time in seconds
            end_time: End time in seconds
            duration: Duration in seconds
            topic: Segment topic
            importance_score: Importance score (0-1)
            segment_order: Order in sequence
            description: Segment description
            keywords: List of keywords
            concepts: List of concepts

        Returns:
            Created ContentSegment instance
        """
        segment = ContentSegment(
            segment_id=segment_id,
            job_id=job_id,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            topic=topic,
            importance_score=importance_score,
            segment_order=segment_order,
            description=description,
            keywords=keywords or [],
            concepts=concepts or [],
        )
        self.db.add(segment)
        self.db.commit()
        self.db.refresh(segment)
        return segment

    def bulk_create(self, segments: list[dict[str, Any]]) -> list[ContentSegment]:
        """Create multiple content segments at once.

        Args:
            segments: List of segment dictionaries

        Returns:
            List of created ContentSegment instances
        """
        content_segments = [ContentSegment(**segment) for segment in segments]
        self.db.bulk_save_objects(content_segments, return_defaults=True)
        self.db.commit()
        return content_segments

    def get_by_job_id(self, job_id: str, order_by_time: bool = True) -> list[ContentSegment]:
        """Get all content segments for a job.

        Args:
            job_id: Job identifier
            order_by_time: Order by segment_order if True

        Returns:
            List of ContentSegment instances
        """
        query = self.db.query(ContentSegment).filter(ContentSegment.job_id == job_id)

        if order_by_time:
            query = query.order_by(ContentSegment.segment_order)

        return query.all()

    def get_top_segments(self, job_id: str, limit: int = 10) -> list[ContentSegment]:
        """Get top content segments by importance score.

        Args:
            job_id: Job identifier
            limit: Maximum number of segments to return

        Returns:
            List of ContentSegment instances ordered by importance
        """
        return (
            self.db.query(ContentSegment)
            .filter(ContentSegment.job_id == job_id)
            .order_by(desc(ContentSegment.importance_score))
            .limit(limit)
            .all()
        )

    def search_by_keyword(self, job_id: str, keyword: str) -> list[ContentSegment]:
        """Search content segments by keyword.

        Args:
            job_id: Job identifier
            keyword: Keyword to search for

        Returns:
            List of matching ContentSegment instances
        """
        # Note: JSON search varies by database backend
        # This is a PostgreSQL-specific query
        return (
            self.db.query(ContentSegment)
            .filter(
                ContentSegment.job_id == job_id,
                ContentSegment.keywords.contains([keyword]),
            )
            .order_by(ContentSegment.segment_order)
            .all()
        )

    def delete_by_job_id(self, job_id: str) -> int:
        """Delete all content segments for a job.

        Args:
            job_id: Job identifier

        Returns:
            Number of deleted records
        """
        count = self.db.query(ContentSegment).filter(ContentSegment.job_id == job_id).count()
        self.db.query(ContentSegment).filter(ContentSegment.job_id == job_id).delete()
        self.db.commit()
        return count


# ============================================================================
# Clip Repository
# ============================================================================


class ClipRepository:
    """Repository for Clip model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        clip_id: str,
        job_id: str,
        title: str,
        start_time: float,
        end_time: float,
        duration: float,
        s3_key: str,
        content_segment_id: str | None = None,
        topic: str | None = None,
        importance_score: float | None = None,
        thumbnail_s3_key: str | None = None,
        subtitle_s3_key: str | None = None,
        clip_order: int | None = None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> Clip:
        """Create a new clip.

        Args:
            clip_id: Unique clip identifier
            job_id: Associated job identifier
            title: Clip title
            start_time: Start time in seconds
            end_time: End time in seconds
            duration: Duration in seconds
            s3_key: S3 object key for clip
            content_segment_id: Associated content segment ID
            topic: Clip topic
            importance_score: Importance score
            thumbnail_s3_key: S3 key for thumbnail
            subtitle_s3_key: S3 key for subtitles
            clip_order: Display order
            extra_metadata: Additional metadata

        Returns:
            Created Clip instance
        """
        clip = Clip(
            clip_id=clip_id,
            job_id=job_id,
            title=title,
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            s3_key=s3_key,
            content_segment_id=content_segment_id,
            topic=topic,
            importance_score=importance_score,
            thumbnail_s3_key=thumbnail_s3_key,
            subtitle_s3_key=subtitle_s3_key,
            clip_order=clip_order,
            extra_metadata=extra_metadata or {},
        )
        self.db.add(clip)
        self.db.commit()
        self.db.refresh(clip)
        return clip

    def bulk_create(self, clips: list[dict[str, Any]]) -> list[Clip]:
        """Create multiple clips at once.

        Args:
            clips: List of clip dictionaries

        Returns:
            List of created Clip instances
        """
        clip_objects = [Clip(**clip) for clip in clips]
        self.db.bulk_save_objects(clip_objects, return_defaults=True)
        self.db.commit()
        return clip_objects

    def get_by_id(self, clip_id: str) -> Clip | None:
        """Get clip by clip_id.

        Args:
            clip_id: Clip identifier

        Returns:
            Clip instance or None if not found
        """
        return self.db.query(Clip).filter(Clip.clip_id == clip_id).first()

    def get_by_job_id(self, job_id: str, order_by_importance: bool = False) -> list[Clip]:
        """Get all clips for a job.

        Args:
            job_id: Job identifier
            order_by_importance: Order by importance_score if True

        Returns:
            List of Clip instances
        """
        query = self.db.query(Clip).filter(Clip.job_id == job_id)

        if order_by_importance:
            query = query.order_by(desc(Clip.importance_score))
        else:
            query = query.order_by(Clip.clip_order, Clip.start_time)

        return query.all()

    def get_top_clips(self, job_id: str, limit: int = 10) -> list[Clip]:
        """Get top clips by importance score.

        Args:
            job_id: Job identifier
            limit: Maximum number of clips to return

        Returns:
            List of Clip instances ordered by importance
        """
        return (
            self.db.query(Clip)
            .filter(Clip.job_id == job_id)
            .order_by(desc(Clip.importance_score))
            .limit(limit)
            .all()
        )

    def update_s3_keys(
        self,
        clip_id: str,
        s3_key: str | None = None,
        thumbnail_s3_key: str | None = None,
        subtitle_s3_key: str | None = None,
    ) -> Clip | None:
        """Update clip S3 keys.

        Args:
            clip_id: Clip identifier
            s3_key: Video S3 key
            thumbnail_s3_key: Thumbnail S3 key
            subtitle_s3_key: Subtitle S3 key

        Returns:
            Updated Clip instance or None if not found
        """
        clip = self.get_by_id(clip_id)
        if not clip:
            return None

        if s3_key is not None:
            clip.s3_key = s3_key
        if thumbnail_s3_key is not None:
            clip.thumbnail_s3_key = thumbnail_s3_key
        if subtitle_s3_key is not None:
            clip.subtitle_s3_key = subtitle_s3_key

        self.db.commit()
        self.db.refresh(clip)
        return clip

    def delete_by_job_id(self, job_id: str) -> int:
        """Delete all clips for a job.

        Args:
            job_id: Job identifier

        Returns:
            Number of deleted records
        """
        count = self.db.query(Clip).filter(Clip.job_id == job_id).count()
        self.db.query(Clip).filter(Clip.job_id == job_id).delete()
        self.db.commit()
        return count


# ============================================================================
# Processing Log Repository
# ============================================================================


class ProcessingLogRepository:
    """Repository for ProcessingLog model operations."""

    def __init__(self, db: Session):
        """Initialize repository with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def create(
        self,
        log_id: str,
        job_id: str,
        stage: str,
        status: str,
        agent_name: str | None = None,
        duration_seconds: float | None = None,
        error_message: str | None = None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> ProcessingLog:
        """Create a new processing log entry.

        Args:
            log_id: Unique log identifier
            job_id: Associated job identifier
            stage: Processing stage
            status: Log status (started, completed, failed)
            agent_name: Name of agent
            duration_seconds: Duration of operation
            error_message: Error message if failed
            extra_metadata: Additional metadata

        Returns:
            Created ProcessingLog instance
        """
        log = ProcessingLog(
            log_id=log_id,
            job_id=job_id,
            stage=stage,
            status=status,
            agent_name=agent_name,
            duration_seconds=duration_seconds,
            error_message=error_message,
            extra_metadata=extra_metadata or {},
        )
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def get_by_job_id(
        self, job_id: str, stage: str | None = None, status: str | None = None
    ) -> list[ProcessingLog]:
        """Get processing logs for a job.

        Args:
            job_id: Job identifier
            stage: Filter by stage (optional)
            status: Filter by status (optional)

        Returns:
            List of ProcessingLog instances
        """
        query = self.db.query(ProcessingLog).filter(ProcessingLog.job_id == job_id)

        if stage:
            query = query.filter(ProcessingLog.stage == stage)

        if status:
            query = query.filter(ProcessingLog.status == status)

        return query.order_by(ProcessingLog.created_at).all()

    def get_latest_by_stage(self, job_id: str, stage: str) -> ProcessingLog | None:
        """Get latest log entry for a specific stage.

        Args:
            job_id: Job identifier
            stage: Processing stage

        Returns:
            ProcessingLog instance or None if not found
        """
        return (
            self.db.query(ProcessingLog)
            .filter(ProcessingLog.job_id == job_id, ProcessingLog.stage == stage)
            .order_by(desc(ProcessingLog.created_at))
            .first()
        )

    def get_errors(self, job_id: str) -> list[ProcessingLog]:
        """Get all error logs for a job.

        Args:
            job_id: Job identifier

        Returns:
            List of ProcessingLog instances with errors
        """
        return (
            self.db.query(ProcessingLog)
            .filter(ProcessingLog.job_id == job_id, ProcessingLog.status == "failed")
            .order_by(ProcessingLog.created_at)
            .all()
        )

    def delete_by_job_id(self, job_id: str) -> int:
        """Delete all processing logs for a job.

        Args:
            job_id: Job identifier

        Returns:
            Number of deleted records
        """
        count = self.db.query(ProcessingLog).filter(ProcessingLog.job_id == job_id).count()
        self.db.query(ProcessingLog).filter(ProcessingLog.job_id == job_id).delete()
        self.db.commit()
        return count


# ============================================================================
# Database Service Facade
# ============================================================================


class DatabaseService:
    """Unified database service providing access to all repositories.

    This service acts as a facade over all repository classes, providing
    a single entry point for database operations with proper session management.
    """

    def __init__(self, db: Session):
        """Initialize database service with session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.jobs = JobRepository(db)
        self.transcripts = TranscriptRepository(db)
        self.silence_regions = SilenceRegionRepository(db)
        self.layout_analysis = LayoutAnalysisRepository(db)
        self.content_segments = ContentSegmentRepository(db)
        self.clips = ClipRepository(db)
        self.processing_logs = ProcessingLogRepository(db)

    def commit(self) -> None:
        """Commit current transaction."""
        self.db.commit()

    def rollback(self) -> None:
        """Rollback current transaction."""
        self.db.rollback()

    def close(self) -> None:
        """Close database session."""
        self.db.close()
