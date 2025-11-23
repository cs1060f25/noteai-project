"""results api routes for retrieving processed video clips and metadata."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import ClipMetadata, ResultsResponse, TranscriptSegment
from app.models.user import User, UserRole
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

router = APIRouter(prefix="/results", tags=["results"])


@router.get(
    "/{job_id}",
    response_model=ResultsResponse,
    summary="Get processing results",
    description="""
    Retrieve the processing results for a completed job.

    This endpoint returns:
    - List of generated video clips with metadata and URLs
    - Full transcript with timestamps (if available)
    - Additional processing metadata

    This endpoint should only be called after the job status is 'completed'.
    Calling it on incomplete jobs will return a 400 error.
    """,
)
@limiter.limit(settings.rate_limit_results)
def get_results(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> ResultsResponse:
    """get processing results for a completed job."""
    db_service = DatabaseService(db)

    # get job
    job = db_service.jobs.get_by_id(job_id)

    if not job:
        logger.warning("Job not found for results", extra={"job_id": job_id})
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
            "Unauthorized results access attempt",
            extra={"job_id": job_id, "user_id": current_user.user_id, "job_owner": job.user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to access this job's results",
                }
            },
        )

    # check if job is completed
    if job.status != "completed":
        logger.warning(
            "Results requested for incomplete job",
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

    # get clips
    clips_db = db_service.clips.get_by_job_id(job_id)

    clips = []
    for clip in clips_db:
        # generate pre-signed URL for clip
        clip_url = None
        if clip.s3_key:
            try:
                clip_url = s3_service.generate_presigned_url(
                    object_key=clip.s3_key,
                    expiration=settings.s3_presigned_url_expiry,
                )
            except Exception as e:
                logger.warning(
                    "Failed to generate clip URL",
                    exc_info=e,
                    extra={"job_id": job_id, "clip_id": clip.clip_id},
                )

        # generate thumbnail URL if available
        thumbnail_url = None
        if clip.thumbnail_s3_key:
            try:
                thumbnail_url = s3_service.generate_presigned_url(
                    object_key=clip.thumbnail_s3_key,
                    expiration=settings.s3_presigned_url_expiry,
                )
            except Exception as e:
                logger.warning(
                    "Failed to generate thumbnail URL",
                    exc_info=e,
                    extra={"job_id": job_id, "clip_id": clip.clip_id},
                )

        # generate subtitle URL if available
        subtitle_url = None
        if clip.subtitle_s3_key:
            try:
                subtitle_url = s3_service.generate_presigned_url(
                    object_key=clip.subtitle_s3_key,
                    expiration=settings.s3_presigned_url_expiry,
                    content_type="text/vtt",  # Critical: browsers need correct MIME type for subtitles
                )
            except Exception as e:
                logger.warning(
                    "Failed to generate subtitle URL",
                    exc_info=e,
                    extra={"job_id": job_id, "clip_id": clip.clip_id},
                )

        clips.append(
            ClipMetadata(
                clip_id=clip.clip_id,
                title=clip.title or f"Clip {clip.clip_order or len(clips) + 1}",
                start_time=clip.start_time,
                end_time=clip.end_time,
                duration=clip.duration,
                s3_key=clip.s3_key,
                url=clip_url,
                thumbnail_url=thumbnail_url,
                subtitle_url=subtitle_url,
            )
        )

    # get transcript segments
    transcript_segments = None
    transcripts_db = db_service.transcripts.get_by_job_id(job_id)

    if transcripts_db:
        transcript_segments = [
            TranscriptSegment(
                start_time=t.start_time,
                end_time=t.end_time,
                text=t.text,
                confidence=t.confidence,
            )
            for t in transcripts_db
        ]

    # get layout analysis for metadata
    layout = db_service.layout_analysis.get_by_job_id(job_id)

    metadata = {}
    if layout:
        metadata["layout"] = {
            "layout_type": layout.layout_type,
            "split_ratio": layout.split_ratio,
            "screen_region": layout.screen_region,
            "camera_region": layout.camera_region,
        }

    # add job completion time
    metadata["completed_at"] = job.completed_at.isoformat() if job.completed_at else None
    metadata["processing_duration_seconds"] = (
        (job.completed_at - job.created_at).total_seconds() if job.completed_at else None
    )

    # add original video information
    metadata["original_video"] = {
        "s3_key": job.original_s3_key,
        "filename": job.filename,
        "duration": job.video_duration,
    }

    # generate pre-signed URL for original video
    original_video_url = None
    if job.original_s3_key:
        try:
            original_video_url = s3_service.generate_presigned_url(
                object_key=job.original_s3_key,
                expiration=settings.s3_presigned_url_expiry,
            )
            metadata["original_video"]["url"] = original_video_url
        except Exception as e:
            logger.warning(
                "Failed to generate original video URL",
                exc_info=e,
                extra={"job_id": job_id},
            )
            metadata["original_video"]["url"] = None

    # add highlight video information (compiled clips)
    metadata["highlight_video"] = None
    if job.compiled_video_s3_key:
        try:
            highlight_video_url = s3_service.generate_presigned_url(
                object_key=job.compiled_video_s3_key,
                expiration=settings.s3_presigned_url_expiry,
            )
            metadata["highlight_video"] = {
                "s3_key": job.compiled_video_s3_key,
                "url": highlight_video_url,
            }
        except Exception as e:
            logger.warning(
                "Failed to generate highlight video URL",
                exc_info=e,
                extra={"job_id": job_id},
            )
            metadata["highlight_video"] = {"s3_key": job.compiled_video_s3_key, "url": None}

    logger.info(
        "Results retrieved",
        extra={
            "job_id": job_id,
            "clips_count": len(clips),
            "has_transcript": transcript_segments is not None,
        },
    )

    return ResultsResponse(
        job_id=job_id,
        clips=clips,
        transcript=transcript_segments,
        metadata=metadata,
    )
