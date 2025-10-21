"""upload api routes for initiating video uploads."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import UploadRequest, UploadResponse
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
    upload_request: UploadRequest,
    current_user: User = Depends(get_current_user),
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
            status="queued",
            current_stage="uploading",
            progress_percent=0.0,
            progress_message="Waiting for file upload to S3",
        )

        # trigger celery processing pipeline immediately
        # note: in production, you might want to trigger this after confirming s3 upload
        # but for testing, we'll start immediately
        task = process_video.delay(job_id)

        logger.info(
            "Upload initiated and processing started",
            extra={
                "job_id": job_id,
                "file_name": request.filename,
                "file_size_bytes": request.file_size,
                "object_key": object_key,
                "celery_task_id": task.id,
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
                "file_name": request.filename,
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
            extra={"file_name": request.filename},
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
