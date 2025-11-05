"""agent output api routes for accessing processed data from individual agents."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import (
    ContentSegmentResponse,
    ContentSegmentsResponse,
    SilenceRegionResponse,
    SilenceRegionsResponse,
    TranscriptSegment,
    TranscriptsResponse,
)
from app.models.user import User
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

router = APIRouter(prefix="/jobs", tags=["agent-outputs"])


def verify_job_access_and_completion(
    job_id: str, user_id: str, db: Session
) -> None:
    """verify job exists, belongs to user, and is completed.

    Args:
        job_id: job identifier
        user_id: current user identifier
        db: database session

    Raises:
        HTTPException: 404 if job not found, 403 if unauthorized, 400 if not completed
    """
    db_service = DatabaseService(db)

    # check job exists
    job = db_service.jobs.get_by_id(job_id)

    if not job:
        logger.warning("Job not found for agent outputs", extra={"job_id": job_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "JOB_NOT_FOUND",
                    "message": f"Job with ID '{job_id}' not found",
                }
            },
        )

    # verify ownership
    if job.user_id != user_id:
        logger.warning(
            "Unauthorized agent outputs access attempt",
            extra={"job_id": job_id, "user_id": user_id, "job_owner": job.user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to access this job's outputs",
                }
            },
        )

    # check completion status
    if job.status != "completed":
        logger.warning(
            "Agent outputs requested for incomplete job",
            extra={"job_id": job_id, "status": job.status},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "JOB_NOT_COMPLETED",
                    "message": f"Job is not completed. Current status: {job.status}. Agent outputs are only available for completed jobs.",
                }
            },
        )


@router.get(
    "/{job_id}/transcripts",
    response_model=TranscriptsResponse,
    summary="Get transcript segments",
    description="""
    Retrieve all transcript segments for a completed job.

    Returns speech-to-text transcription segments with:
    - Timing information (start/end times in seconds)
    - Transcribed text
    - Confidence scores (when available)

    **Requirements:**
    - Job must be completed
    - User must own the job

    Segments are ordered by start time.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_transcripts(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> TranscriptsResponse:
    """get transcript segments for a completed job."""
    # verify access and completion
    verify_job_access_and_completion(job_id, current_user.user_id, db)

    db_service = DatabaseService(db)

    # get transcripts ordered by time
    transcripts_db = db_service.transcripts.get_by_job_id(job_id, order_by_time=True)

    # convert to response model
    segments = [
        TranscriptSegment(
            start_time=t.start_time,
            end_time=t.end_time,
            text=t.text,
            confidence=t.confidence,
        )
        for t in transcripts_db
    ]

    logger.info(
        "Transcripts retrieved",
        extra={
            "job_id": job_id,
            "segments_count": len(segments),
        },
    )

    return TranscriptsResponse(
        job_id=job_id,
        segments=segments,
        total=len(segments),
    )


@router.get(
    "/{job_id}/silence-regions",
    response_model=SilenceRegionsResponse,
    summary="Get silence regions",
    description="""
    Retrieve all detected silence regions for a completed job.

    Returns silence intervals with:
    - Timing information (start/end times, duration)
    - Silence type (audio silence, blank screen, or both)
    - Detection threshold (for audio silence)

    **Requirements:**
    - Job must be completed
    - User must own the job

    Regions are ordered by start time.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_silence_regions(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> SilenceRegionsResponse:
    """get silence regions for a completed job."""
    # verify access and completion
    verify_job_access_and_completion(job_id, current_user.user_id, db)

    db_service = DatabaseService(db)

    # get silence regions ordered by time
    regions_db = db_service.silence_regions.get_by_job_id(job_id, order_by_time=True)

    # convert to response model
    regions = [
        SilenceRegionResponse(
            region_id=r.region_id,
            start_time=r.start_time,
            end_time=r.end_time,
            duration=r.duration,
            silence_type=r.silence_type,
            amplitude_threshold=r.amplitude_threshold,
            created_at=r.created_at,
        )
        for r in regions_db
    ]

    logger.info(
        "Silence regions retrieved",
        extra={
            "job_id": job_id,
            "regions_count": len(regions),
        },
    )

    return SilenceRegionsResponse(
        job_id=job_id,
        regions=regions,
        total=len(regions),
    )


@router.get(
    "/{job_id}/content-segments",
    response_model=ContentSegmentsResponse,
    summary="Get content segments",
    description="""
    Retrieve all AI-analyzed content segments for a completed job.

    Returns educational content segments with:
    - Timing information (start/end times, duration)
    - Topic and detailed description
    - Importance score (0-1, higher is more important)
    - Extracted keywords and concepts
    - Sequential ordering

    **Requirements:**
    - Job must be completed
    - User must own the job

    Segments are ordered by start time (chronological order).
    For importance-based ordering, use the importance_score field on the client side.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_content_segments(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> ContentSegmentsResponse:
    """get content segments for a completed job."""
    # verify access and completion
    verify_job_access_and_completion(job_id, current_user.user_id, db)

    db_service = DatabaseService(db)

    # get content segments ordered by time
    segments_db = db_service.content_segments.get_by_job_id(job_id, order_by_time=True)

    # convert to response model
    segments = [
        ContentSegmentResponse(
            segment_id=s.segment_id,
            start_time=s.start_time,
            end_time=s.end_time,
            duration=s.duration,
            topic=s.topic,
            description=s.description,
            importance_score=s.importance_score,
            keywords=s.keywords or [],
            concepts=s.concepts or [],
            segment_order=s.segment_order,
            created_at=s.created_at,
        )
        for s in segments_db
    ]

    logger.info(
        "Content segments retrieved",
        extra={
            "job_id": job_id,
            "segments_count": len(segments),
        },
    )

    return ContentSegmentsResponse(
        job_id=job_id,
        segments=segments,
        total=len(segments),
    )
