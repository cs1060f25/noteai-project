"""upload api routes for initiating video uploads."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import UploadConfirmRequest, UploadRequest, UploadResponse
from app.models.user import User
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service
from app.services.validation_service import ValidationError, file_validator
from pipeline.tasks import process_video

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

        # trigger celery processing pipeline
        task = process_video.delay(confirm_request.job_id)

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
