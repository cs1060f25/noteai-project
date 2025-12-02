"""agent output api routes for accessing processed data from individual agents."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.authorization import require_admin
from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import (
    ClipResponse,
    ClipsResponse,
    ContentSegmentResponse,
    ContentSegmentsResponse,
    GenerateSummaryRequest,
    LayoutAnalysisResponse,
    SilenceRegionResponse,
    SilenceRegionsResponse,
    SummaryResponse,
    TranscriptSegment,
    TranscriptsResponse,
)
from app.models.user import User, UserRole
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

router = APIRouter(prefix="/jobs", tags=["agent-outputs"])
summaries_router = APIRouter(tags=["summaries"])


def verify_job_exists_and_completed(job_id: str, db: Session) -> None:
    """verify job exists and is completed (admin-only endpoints).

    Args:
        job_id: job identifier
        db: database session

    Raises:
        HTTPException: 404 if job not found, 400 if not completed
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
    summary="Get transcript segments (Admin only)",
    description="""
    Retrieve all transcript segments for a completed job.

    Returns speech-to-text transcription segments with:
    - Timing information (start/end times in seconds)
    - Transcribed text
    - Confidence scores (when available)

    **Requirements:**
    - Admin role required
    - Job must be completed

    Segments are ordered by start time.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_transcripts(
    request: Request,
    response: Response,
    job_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TranscriptsResponse:
    """get transcript segments for a completed job (admin only)."""
    # verify job exists and is completed
    verify_job_exists_and_completed(job_id, db)

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
    summary="Get silence regions (Admin only)",
    description="""
    Retrieve all detected silence regions for a completed job.

    Returns silence intervals with:
    - Timing information (start/end times, duration)
    - Silence type (audio silence, blank screen, or both)
    - Detection threshold (for audio silence)

    **Requirements:**
    - Admin role required
    - Job must be completed

    Regions are ordered by start time.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_silence_regions(
    request: Request,
    response: Response,
    job_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SilenceRegionsResponse:
    """get silence regions for a completed job (admin only)."""
    # verify job exists and is completed
    verify_job_exists_and_completed(job_id, db)

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
    summary="Get content segments (Admin only)",
    description="""
    Retrieve all AI-analyzed content segments for a completed job.

    Returns educational content segments with:
    - Timing information (start/end times, duration)
    - Topic and detailed description
    - Importance score (0-1, higher is more important)
    - Extracted keywords and concepts
    - Sequential ordering

    **Requirements:**
    - Admin role required
    - Job must be completed

    Segments are ordered by start time (chronological order).
    For importance-based ordering, use the importance_score field on the client side.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_content_segments(
    request: Request,
    response: Response,
    job_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContentSegmentsResponse:
    """get content segments for a completed job (admin only)."""
    # verify job exists and is completed
    verify_job_exists_and_completed(job_id, db)

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


@router.get(
    "/{job_id}/clips",
    response_model=ClipsResponse,
    summary="Get extracted clips (Admin only)",
    description="""
    Retrieve all extracted clips for a completed job.

    Returns the final selected highlight clips with:
    - Timing information (start/end times, duration)
    - Title and topic
    - Importance score from content analysis
    - Clip ordering (ranked by importance)
    - Optimization metadata (boundary adjustments, silence alignment)

    **Requirements:**
    - Admin role required
    - Job must be completed

    Clips are ordered by clip_order (importance ranking).
    These are the final segments selected by the segment extraction agent.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_clips(
    request: Request,
    response: Response,
    job_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ClipsResponse:
    """get extracted clips for a completed job (admin only)."""
    # verify job exists and is completed
    verify_job_exists_and_completed(job_id, db)

    db_service = DatabaseService(db)

    # get clips ordered by clip_order
    clips_db = db_service.clips.get_by_job_id(job_id)

    # sort by clip_order (importance ranking)
    clips_db_sorted = sorted(clips_db, key=lambda c: c.clip_order or 999)

    # convert to response model
    clips = [
        ClipResponse(
            clip_id=c.clip_id,
            content_segment_id=c.content_segment_id,
            title=c.title,
            topic=c.topic,
            importance_score=c.importance_score,
            start_time=c.start_time,
            end_time=c.end_time,
            duration=c.duration,
            clip_order=c.clip_order,
            extra_metadata=c.extra_metadata or {},
            created_at=c.created_at,
        )
        for c in clips_db_sorted
    ]

    logger.info(
        "Clips retrieved",
        extra={
            "job_id": job_id,
            "clips_count": len(clips),
        },
    )

    return ClipsResponse(
        job_id=job_id,
        clips=clips,
        total=len(clips),
    )


@router.get(
    "/{job_id}/layout-analysis",
    response_model=LayoutAnalysisResponse,
    summary="Get layout analysis (Admin only)",
    description="""
    Retrieve video layout analysis for a completed job.

    Returns layout detection results with:
    - Detected layout type (side_by_side, picture_in_picture, screen_only, camera_only)
    - Screen and camera region coordinates
    - Split ratio between screen and camera content
    - Detection confidence score (0 = fallback default, >0.6 = high confidence)
    - Sample frame time used for analysis

    **Requirements:**
    - Admin role required
    - Job must be completed
    - Only available for vision pipeline jobs (not audio-only)

    **Note**: If no layout analysis exists (audio pipeline), returns 404.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_layout_analysis(
    request: Request,
    response: Response,
    job_id: str,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LayoutAnalysisResponse:
    """get layout analysis for a completed job (admin only)."""
    # verify job exists and is completed
    verify_job_exists_and_completed(job_id, db)

    db_service = DatabaseService(db)

    # get layout analysis
    layout_db = db_service.layout_analysis.get_by_job_id(job_id)

    if not layout_db:
        logger.warning(
            "Layout analysis not found for job",
            extra={"job_id": job_id},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "LAYOUT_ANALYSIS_NOT_FOUND",
                    "message": f"Layout analysis not found for job '{job_id}'. This may be an audio-only pipeline job.",
                }
            },
        )

    logger.info(
        "Layout analysis retrieved",
        extra={
            "job_id": job_id,
            "layout_type": layout_db.layout_type,
            "confidence": layout_db.confidence_score,
        },
    )

    return LayoutAnalysisResponse(
        layout_id=layout_db.layout_id,
        job_id=layout_db.job_id,
        screen_region=layout_db.screen_region,
        camera_region=layout_db.camera_region,
        split_ratio=layout_db.split_ratio,
        layout_type=layout_db.layout_type,
        confidence_score=layout_db.confidence_score,
        sample_frame_time=layout_db.sample_frame_time,
        created_at=layout_db.created_at,
    )


@router.get(
    "/{job_id}/summary",
    response_model=SummaryResponse,
    summary="Get lecture summary",
    description="""
    Retrieve AI-generated summary for a completed job.

    Returns structured summary with:
    - Comprehensive summary text (500-800 words)
    - Key takeaways (3-5 bullet points)
    - Topics covered (chronological list)
    - Learning objectives (3-5 items)
    - Generation metadata

    **Requirements:**
    - User must own the job or be an admin
    - Job must be completed

    **Note**: If no summary exists, returns 404.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_summary(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> SummaryResponse:
    """get summary for a completed job."""
    db_service = DatabaseService(db)

    # get job
    job = db_service.jobs.get_by_id(job_id)

    if not job:
        logger.warning("Job not found for summary", extra={"job_id": job_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "JOB_NOT_FOUND",
                    "message": f"Job with ID '{job_id}' not found",
                }
            },
        )

    # verify job belongs to current user (or user is admin)
    if job.user_id != current_user.user_id and current_user.role != UserRole.ADMIN:
        logger.warning(
            "Unauthorized summary access attempt",
            extra={"job_id": job_id, "user_id": current_user.user_id, "job_owner": job.user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to access this job's summary",
                }
            },
        )

    # check if job is completed
    if job.status != "completed":
        logger.warning(
            "Summary requested for incomplete job",
            extra={"job_id": job_id, "status": job.status},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "JOB_NOT_COMPLETED",
                    "message": f"Job is not completed. Current status: {job.status}",
                }
            },
        )

    # get summary
    summary_db = db_service.summaries.get_by_job_id(job_id)

    if not summary_db:
        # use debug level since this is expected when summary hasn't been generated
        logger.debug(
            "Summary not found for job",
            extra={"job_id": job_id},
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "SUMMARY_NOT_FOUND",
                    "message": f"Summary not found for job '{job_id}'. Generate a summary first.",
                }
            },
        )

    logger.info(
        "Summary retrieved",
        extra={
            "job_id": job_id,
            "summary_id": summary_db.summary_id,
            "word_count": summary_db.word_count,
        },
    )

    return SummaryResponse(
        summary_id=summary_db.summary_id,
        job_id=summary_db.job_id,
        summary_text=summary_db.summary_text,
        key_takeaways=summary_db.key_takeaways,
        topics_covered=summary_db.topics_covered,
        learning_objectives=summary_db.learning_objectives,
        word_count=summary_db.word_count,
        model_used=summary_db.model_used,
        created_at=summary_db.created_at,
    )


@router.post(
    "/{job_id}/summary",
    response_model=SummaryResponse,
    summary="Generate lecture summary",
    description="""
    Generate an AI-powered summary for a completed job.

    Creates a structured summary using the lecture transcript and content segments.
    If a summary already exists, it will be replaced.

    **Requirements:**
    - User must own the job or be an admin
    - Job must be completed
    - Transcripts must exist

    **Returns**: Generated summary with all fields populated.
    """,
)
@limiter.limit(settings.rate_limit_results)
def generate_summary_endpoint(
    request: Request,
    response: Response,
    job_id: str,
    body: GenerateSummaryRequest,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> SummaryResponse:
    """generate summary for a completed job."""
    db_service = DatabaseService(db)

    # get job
    job = db_service.jobs.get_by_id(job_id)

    if not job:
        logger.warning("Job not found for summary generation", extra={"job_id": job_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "JOB_NOT_FOUND",
                    "message": f"Job with ID '{job_id}' not found",
                }
            },
        )

    # verify job belongs to current user (or user is admin)
    if job.user_id != current_user.user_id and current_user.role != UserRole.ADMIN:
        logger.warning(
            "Unauthorized summary generation attempt",
            extra={"job_id": job_id, "user_id": current_user.user_id, "job_owner": job.user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to generate a summary for this job",
                }
            },
        )

    # check if job is completed
    if job.status != "completed":
        logger.warning(
            "Summary generation requested for incomplete job",
            extra={"job_id": job_id, "status": job.status},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "JOB_NOT_COMPLETED",
                    "message": f"Job is not completed. Current status: {job.status}",
                }
            },
        )

    logger.info("Summary generation requested", extra={"job_id": job_id})

    # import here to avoid circular dependency
    from agents.summary_agent import generate_summary

    try:
        # generate summary using the agent
        result = generate_summary(job_id, api_key=body.api_key, size=body.size, style=body.style)

        logger.info(
            "Summary generated successfully",
            extra={
                "job_id": job_id,
                "summary_id": result["summary_id"],
                "processing_time": result["processing_time_seconds"],
                "size": body.size,
                "style": body.style,
            },
        )

        # retrieve the generated summary from database
        summary_db = db_service.summaries.get_by_job_id(job_id)

        if not summary_db:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": {
                        "code": "SUMMARY_GENERATION_FAILED",
                        "message": "Summary generation completed but could not retrieve result.",
                    }
                },
            )

        return SummaryResponse(
            summary_id=summary_db.summary_id,
            job_id=summary_db.job_id,
            summary_text=summary_db.summary_text,
            key_takeaways=summary_db.key_takeaways,
            topics_covered=summary_db.topics_covered,
            learning_objectives=summary_db.learning_objectives,
            word_count=summary_db.word_count,
            model_used=summary_db.model_used,
            created_at=summary_db.created_at,
        )

    except ValueError as e:
        logger.error(
            "Summary generation failed - validation error",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(e),
                }
            },
        ) from e
    except Exception as e:
        logger.error(
            "Summary generation failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "SUMMARY_GENERATION_FAILED",
                    "message": f"Failed to generate summary: {e!s}",
                }
            },
        ) from e


@summaries_router.get(
    "/summaries",
    response_model=list[SummaryResponse],
    summary="Get summaries",
    description="""
    Retrieve summaries for completed jobs.

    Users will see summaries for their own jobs.
    Admins will see all summaries.

    More efficient than making individual requests for each job.

    **Returns**: List of available summaries.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_all_summaries(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> list[SummaryResponse]:
    """get summaries for completed jobs (filtered by user)."""
    from app.models.database import Job, Summary

    # admins can see all summaries, users only see their own
    if current_user.role == UserRole.ADMIN:
        summaries = db.query(Summary).all()
    else:
        # join with jobs table to filter by user_id
        summaries = (
            db.query(Summary)
            .join(Job, Summary.job_id == Job.job_id)
            .filter(Job.user_id == current_user.user_id)
            .all()
        )

    logger.info(
        "Summaries retrieved",
        extra={
            "count": len(summaries),
            "user_id": current_user.user_id,
            "is_admin": current_user.role == UserRole.ADMIN,
        },
    )

    return [
        SummaryResponse(
            summary_id=s.summary_id,
            job_id=s.job_id,
            summary_text=s.summary_text,
            key_takeaways=s.key_takeaways,
            topics_covered=s.topics_covered,
            learning_objectives=s.learning_objectives,
            word_count=s.word_count,
            model_used=s.model_used,
            created_at=s.created_at,
        )
        for s in summaries
    ]
