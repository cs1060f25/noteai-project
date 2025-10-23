"""job management api routes for tracking processing status."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.schemas import JobListResponse, JobProgress, JobResponse, JobStatus
from app.models.user import User
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get job status",
    description="""
    Retrieve the current status and progress of a processing job.

    This endpoint returns:
    - Job status (queued, running, completed, failed)
    - Current processing stage and progress percentage
    - Error message if the job failed
    - Timestamps for creation and last update

    Clients should poll this endpoint every 3-5 seconds to track progress.
    """,
)
@limiter.limit(settings.rate_limit_job_status)
def get_job_status(
    request: Request,
    response: Response,
    job_id: str,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> JobResponse:
    """get job status and progress information."""
    db_service = DatabaseService(db)

    job = db_service.jobs.get_by_id(job_id)

    if not job:
        logger.warning("Job not found", extra={"job_id": job_id})
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "JOB_NOT_FOUND",
                    "message": f"Job with ID '{job_id}' not found",
                }
            },
        )

    # verify job belongs to current user
    if job.user_id != current_user.user_id:
        logger.warning(
            "Unauthorized job access attempt",
            extra={"job_id": job_id, "user_id": current_user.user_id, "job_owner": job.user_id},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to access this job",
                }
            },
        )

    # build progress information if job is in progress
    progress = None
    if job.current_stage and job.progress_percent is not None:
        progress = JobProgress(
            stage=job.current_stage,
            percent=job.progress_percent,
            message=job.progress_message or "",
            eta_seconds=job.estimated_completion_seconds,
        )

    logger.debug(
        "Job status retrieved",
        extra={
            "job_id": job_id,
            "status": job.status,
            "stage": job.current_stage,
        },
    )

    return JobResponse(
        job_id=job.job_id,
        status=JobStatus(job.status),
        filename=job.filename,
        created_at=job.created_at,
        updated_at=job.updated_at,
        progress=progress,
        error_message=job.error_message,
    )


@router.get(
    "",
    response_model=JobListResponse,
    summary="List jobs",
    description="""
    Retrieve a paginated list of processing jobs.

    Query parameters:
    - limit: Number of jobs to return (default: 50, max: 100)
    - offset: Number of jobs to skip (default: 0)

    Jobs are returned in reverse chronological order (newest first).
    """,
)
@limiter.limit(settings.rate_limit_jobs_list)
def list_jobs(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user_clerk),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    db: Session = Depends(get_db),
) -> JobListResponse:
    """list jobs with pagination."""
    db_service = DatabaseService(db)

    # get paginated jobs filtered by user
    jobs = db_service.jobs.list_jobs_by_user(
        user_id=current_user.user_id, limit=limit, offset=offset
    )

    # get total count for user
    total = db_service.jobs.count_jobs_by_user(user_id=current_user.user_id)

    # convert to response models
    job_responses = []
    for job in jobs:
        progress = None
        if job.current_stage and job.progress_percent is not None:
            progress = JobProgress(
                stage=job.current_stage,
                percent=job.progress_percent,
                message=job.progress_message or "",
                eta_seconds=job.estimated_completion_seconds,
            )

        job_responses.append(
            JobResponse(
                job_id=job.job_id,
                status=JobStatus(job.status),
                filename=job.filename,
                created_at=job.created_at,
                updated_at=job.updated_at,
                progress=progress,
                error_message=job.error_message,
            )
        )

    logger.debug(
        "Jobs listed",
        extra={
            "limit": limit,
            "offset": offset,
            "total": total,
            "returned": len(job_responses),
        },
    )

    return JobListResponse(
        jobs=job_responses,
        total=total,
    )
