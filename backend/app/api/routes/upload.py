"""upload api routes for initiating video uploads."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import (
    UploadConfirmRequest,
    UploadRequest,
    UploadResponse,
    YouTubeUploadRequest,
)
from app.models.user import User
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service
from app.services.storage_service import StorageService
from app.services.validation_service import ValidationError, file_validator
from app.services.youtube_service import (
    DownloadFailedError,
    InvalidURLError,
    youtube_service,
)
from pipeline.tasks import process_video_optimized

logger = get_logger(__name__)

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post(
    "",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate video upload",
    description="""
    Initiate a new video upload by providing file metadata.

    This endpoint:
    1. Validates the file metadata (size, type, name)
    2. Creates a new job record in the database
    3. Generates a pre-signed S3 URL for direct upload
    4. Returns the job_id and upload URL to the client

    The client should then upload the file directly to S3 using the
    provided pre-signed URL with a PUT request.
    """,
)
@limiter.limit(settings.rate_limit_upload)
def initiate_upload(
    request: Request,
    response: Response,
    upload_request: UploadRequest,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> UploadResponse:
    """initiate video upload and get pre-signed s3 url."""
    try:
        file_validator.validate_upload_request(
            filename=upload_request.filename,
            file_size=upload_request.file_size,
            content_type=upload_request.content_type,
        )

        job_id = f"job_{uuid.uuid4().hex[:12]}"

        object_key = s3_service.generate_object_key(
            job_id=job_id,
            filename=upload_request.filename,
        )

        upload_data = s3_service.generate_presigned_upload_url(
            object_key=object_key,
            content_type=upload_request.content_type,
        )

        # Prepare processing configuration
        processing_config_dict = {}
        if upload_request.processing_config:
            processing_config_dict = {
                "prompt": upload_request.processing_config.prompt,
                "resolution": upload_request.processing_config.resolution.value,
                "processing_mode": upload_request.processing_config.processing_mode.value,
                "rate_limit_mode": upload_request.processing_config.rate_limit_mode,
            }

        db_service = DatabaseService(db)
        job = db_service.jobs.create(
            job_id=job_id,
            user_id=current_user.user_id,
            filename=upload_request.filename,
            file_size=upload_request.file_size,
            content_type=upload_request.content_type,
            original_s3_key=object_key,
            status="pending",
            current_stage="uploading",
            progress_percent=0.0,
            progress_message="Waiting for file upload to S3",
            extra_metadata=(
                {"processing_config": processing_config_dict} if processing_config_dict else {}
            ),
        )

        logger.info(
            "Upload initiated",
            extra={
                "job_id": job_id,
                "file_name": upload_request.filename,
                "file_size_bytes": upload_request.file_size,
                "object_key": object_key,
            },
        )

        return UploadResponse(
            job_id=job.job_id,
            upload_url=upload_data["url"],
            upload_fields=upload_data["fields"],
            expires_in=3600,  # default expiry from settings
            s3_key=object_key,
        )

    except ValidationError as e:
        logger.warning(
            "Upload validation failed",
            extra={
                "file_name": upload_request.filename,
                "error": e.message,
                "field": e.field,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": e.message,
                    "field": e.field,
                }
            },
        ) from e

    except Exception as e:
        logger.error(
            "Upload initiation failed",
            exc_info=e,
            extra={"file_name": upload_request.filename},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "UPLOAD_INIT_FAILED",
                    "message": "Failed to initiate upload. Please try again.",
                }
            },
        ) from e


@router.post(
    "/confirm",
    status_code=status.HTTP_200_OK,
    summary="Confirm upload and start processing",
    description="""
    Confirm that the file has been successfully uploaded to S3 and trigger processing.

    This endpoint should be called by the client after successfully uploading the file
    to the pre-signed S3 URL. It will:
    1. Verify the file exists in S3
    2. Update the job status to "queued"
    3. Trigger the Celery processing pipeline
    """,
)
@limiter.limit(settings.rate_limit_upload)
def confirm_upload(
    request: Request,
    response: Response,
    confirm_request: UploadConfirmRequest,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> dict:
    """confirm s3 upload and trigger video processing."""
    try:
        db_service = DatabaseService(db)
        job = db_service.jobs.get_by_id(confirm_request.job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": {
                        "code": "JOB_NOT_FOUND",
                        "message": f"Job {confirm_request.job_id} not found",
                    }
                },
            )

        # verify job belongs to current user
        if job.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this job",
                    }
                },
            )

        # verify file exists in s3
        if not s3_service.check_object_exists(job.original_s3_key):
            logger.warning(
                "Upload confirmation failed - file not found in S3",
                extra={
                    "job_id": confirm_request.job_id,
                    "s3_key": job.original_s3_key,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "FILE_NOT_FOUND",
                        "message": "File not found in S3. Please upload the file first.",
                    }
                },
            )

        # update job status to queued and trigger processing
        db_service.jobs.update_status(job_id=job.job_id, status="queued")
        db.commit()

        # update user storage to include original video size
        storage_service = StorageService(db)
        storage_service.increment_user_storage(current_user.user_id, job.file_size)

        # trigger optimized celery processing pipeline (single download, parallel sub-tasks)
        task = process_video_optimized.delay(confirm_request.job_id)

        logger.info(
            "Upload confirmed and processing started",
            extra={
                "job_id": confirm_request.job_id,
                "s3_key": job.original_s3_key,
                "celery_task_id": task.id,
            },
        )

        return {
            "job_id": confirm_request.job_id,
            "status": "queued",
            "message": "Upload confirmed, processing started",
            "celery_task_id": task.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Upload confirmation failed",
            exc_info=e,
            extra={"job_id": confirm_request.job_id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "CONFIRM_FAILED",
                    "message": "Failed to confirm upload. Please try again.",
                }
            },
        ) from e


@router.post(
    "/from-youtube",
    status_code=status.HTTP_201_CREATED,
    summary="Upload video from YouTube URL",
    description="""
    Upload a video from a YouTube URL.

    This endpoint:
    1. Validates the YouTube URL
    2. Downloads the video using yt-dlp
    3. Uploads it to S3
    4. Creates a job record and triggers processing
    5. Returns the job_id to track progress

    Note: This may take a few minutes depending on video size.
    """,
)
@limiter.limit(settings.rate_limit_upload)
async def upload_from_youtube(
    request: Request,
    response: Response,
    youtube_request: YouTubeUploadRequest,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> dict:
    """Upload video from YouTube URL and start processing."""
    try:
        # Validate YouTube URL
        if not youtube_service.validate_youtube_url(youtube_request.url):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_URL",
                        "message": "Invalid YouTube URL. Please provide a valid YouTube video URL.",
                    }
                },
            )

        # Extract video info first (quick check before downloading)
        try:
            video_info = youtube_service.extract_video_info(youtube_request.url)
        except InvalidURLError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_URL",
                        "message": str(e),
                    }
                },
            ) from e
        except DownloadFailedError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "VIDEO_UNAVAILABLE",
                        "message": f"Failed to access YouTube video: {e!s}",
                    }
                },
            ) from e

        # Check file size limit (2GB)
        filesize = video_info.get("filesize", 0)
        if filesize > 2 * 1024 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"Video file size ({filesize / (1024**3):.2f} GB) exceeds maximum allowed size of 2GB.",
                    }
                },
            )

        # Create job record
        job_id = f"job_{uuid.uuid4().hex[:12]}"

        logger.info(
            "Starting YouTube video download",
            extra={
                "job_id": job_id,
                "url": youtube_request.url,
                "video_title": video_info.get("title"),
            },
        )

        # Prepare processing configuration
        processing_config_dict = {}
        if youtube_request.processing_config:
            processing_config_dict = {
                "prompt": youtube_request.processing_config.prompt,
                "resolution": youtube_request.processing_config.resolution.value,
                "processing_mode": youtube_request.processing_config.processing_mode.value,
                "rate_limit_mode": youtube_request.processing_config.rate_limit_mode,
            }

        # Create initial job record
        db_service = DatabaseService(db)
        job = db_service.jobs.create(
            job_id=job_id,
            user_id=current_user.user_id,
            filename=f"{video_info.get('title', 'youtube_video')}.mp4",
            file_size=filesize or 0,
            content_type="video/mp4",
            original_s3_key="",  # Will be updated after download
            status="pending",
            current_stage="uploading",
            progress_percent=0.0,
            progress_message="Downloading video from YouTube...",
            extra_metadata=(
                {"processing_config": processing_config_dict} if processing_config_dict else {}
            ),
        )

        # Download and upload to S3
        try:
            s3_key, updated_video_info = youtube_service.download_and_upload_to_s3(
                url=youtube_request.url,
                job_id=job_id,
            )

            # Update job with S3 key and actual file size
            db_service.jobs.update_video_metadata(
                job_id=job_id,
                video_duration=updated_video_info.get("duration"),
                video_metadata={
                    "source": "youtube",
                    "original_url": youtube_request.url,
                    "video_id": updated_video_info.get("video_id"),
                    "title": updated_video_info.get("title"),
                    "uploader": updated_video_info.get("uploader"),
                },
            )

            job.original_s3_key = s3_key
            job.file_size = updated_video_info.get("filesize", 0)
            job.filename = updated_video_info.get("filename", job.filename)
            db.commit()

        except (InvalidURLError, DownloadFailedError) as e:
            # Mark job as failed
            db_service.jobs.update_status(
                job_id=job_id,
                status="failed",
                error_message=str(e),
            )
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "DOWNLOAD_FAILED",
                        "message": f"Failed to download YouTube video: {e!s}",
                    }
                },
            ) from e

        # Update job status to queued and trigger processing
        db_service.jobs.update_status(job_id=job_id, status="queued")
        db_service.jobs.update_progress(
            job_id=job_id,
            current_stage="silence_detection",
            progress_percent=10.0,
            progress_message="Video downloaded, starting processing...",
        )
        db.commit()

        # Trigger optimized celery processing pipeline (single download, parallel sub-tasks)
        task = process_video_optimized.delay(job_id)

        logger.info(
            "YouTube video uploaded and processing started",
            extra={
                "job_id": job_id,
                "s3_key": s3_key,
                "celery_task_id": task.id,
            },
        )

        return {
            "job_id": job_id,
            "status": "queued",
            "message": "YouTube video downloaded and processing started",
            "video_info": {
                "title": updated_video_info.get("title"),
                "duration": updated_video_info.get("duration"),
                "uploader": updated_video_info.get("uploader"),
            },
            "celery_task_id": task.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "YouTube upload failed",
            exc_info=e,
            extra={"url": youtube_request.url},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "YOUTUBE_UPLOAD_FAILED",
                    "message": "Failed to process YouTube video. Please try again.",
                }
            },
        ) from e
