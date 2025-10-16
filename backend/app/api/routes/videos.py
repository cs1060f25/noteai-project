"""video api routes for pre-signed urls and video management."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.user import User
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

router = APIRouter()


class PresignedUrlResponse(BaseModel):
    """response model for pre-signed url."""

    url: str = Field(..., description="Pre-signed URL for video access")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    object_key: str = Field(..., description="S3 object key")


@router.get("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_url(
    key: str = Query(..., description="S3 object key (e.g., 'recording.mov')"),
    expires_in: int = Query(
        default=3600,
        ge=60,
        le=604800,
        description="URL expiration in seconds (1 min to 7 days)",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PresignedUrlResponse:
    """generate a pre-signed url for accessing a video in s3."""
    try:
        # extract job_id from s3 key (format: uploads/{job_id}/...)
        # verify user owns the job associated with this s3 key
        if key.startswith("uploads/"):
            parts = key.split("/")
            if len(parts) >= 2:
                job_id = parts[1]
                db_service = DatabaseService(db)
                job = db_service.jobs.get_by_id(job_id)

                if not job:
                    logger.warning(
                        "Job not found for video access",
                        extra={"job_id": job_id, "object_key": key},
                    )
                    raise HTTPException(
                        status_code=404,
                        detail=f"Job not found: {job_id}",
                    )

                # verify job belongs to current user
                if job.user_id != current_user.user_id:
                    logger.warning(
                        "Unauthorized video access attempt",
                        extra={
                            "job_id": job_id,
                            "user_id": current_user.user_id,
                            "job_owner": job.user_id,
                            "object_key": key,
                        },
                    )
                    raise HTTPException(
                        status_code=403,
                        detail="You do not have permission to access this video",
                    )

        if not s3_service.check_object_exists(key):
            logger.warning("Requested object not found", extra={"object_key": key})
            raise HTTPException(
                status_code=404,
                detail=f"Video not found: {key}",
            )

        url = s3_service.generate_presigned_url(key, expires_in)

        return PresignedUrlResponse(
            url=url,
            expires_in=expires_in,
            object_key=key,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to generate pre-signed URL",
            exc_info=e,
            extra={"object_key": key},
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate video URL",
        ) from e
