"""results api routes for retrieving processed video clips and metadata."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import get_logger
from app.core.settings import settings
from app.models.schemas import ClipMetadata, ResultsResponse, TranscriptSegment
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
def get_results(
    job_id: str,
    db: Session = Depends(get_db),
) -> ResultsResponse:
    """get processing results for a completed job."""
    db_service = DatabaseService(db)

    # get job
    job = db_service.jobs.get_by_job_id(job_id)

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
                    expires_in=settings.S3_PRESIGNED_URL_EXPIRY,
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
                    expires_in=settings.S3_PRESIGNED_URL_EXPIRY,
                )
            except Exception as e:
                logger.warning(
                    "Failed to generate thumbnail URL",
                    exc_info=e,
                    extra={"job_id": job_id, "clip_id": clip.clip_id},
                )

        clips.append(
            ClipMetadata(
                clip_id=clip.clip_id,
                title=clip.title or f"Clip {clip.sequence_number}",
                start_time=clip.start_time,
                end_time=clip.end_time,
                duration=clip.duration,
                s3_key=clip.s3_key,
                url=clip_url,
                thumbnail_url=thumbnail_url,
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
            "has_screen_share": layout.has_screen_share,
            "has_camera": layout.has_camera,
            "screen_ratio": layout.screen_ratio,
            "camera_ratio": layout.camera_ratio,
        }

    # add job completion time
    metadata["completed_at"] = job.completed_at.isoformat() if job.completed_at else None
    metadata["processing_duration_seconds"] = (
        (job.completed_at - job.created_at).total_seconds()
        if job.completed_at
        else None
    )

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
