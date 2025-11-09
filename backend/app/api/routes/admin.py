"""admin api routes for system management and monitoring."""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies.authorization import require_admin
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.database import ProcessingLog
from app.models.user import User
from app.schemas.admin import (
    AdminJobListResponse,
    AdminJobResponse,
    AdminJobUser,
    AdminUserListResponse,
    AdminUserResponse,
    JobStatusCounts,
    ProcessingLogListResponse,
    ProcessingLogResponse,
    SystemMetricsResponse,
)
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/jobs",
    response_model=AdminJobListResponse,
    summary="List all jobs (admin only)",
    description="""
    Retrieve a paginated list of all jobs across all users.

    Admin-only endpoint that provides visibility into all jobs in the system.
    """,
)
@limiter.limit(settings.rate_limit_jobs_list)
async def list_all_jobs(
    request: Request,
    response: Response,
    admin_user: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of jobs to return"),
    offset: int = Query(0, ge=0, description="Number of jobs to skip"),
    status_filter: str | None = Query(None, description="Filter by job status"),
    user_id_filter: str | None = Query(None, description="Filter by user ID"),
    db: Session = Depends(get_db),
) -> AdminJobListResponse:
    """list all jobs with pagination and filters."""
    db_service = DatabaseService(db)

    # build query
    if user_id_filter:
        jobs = db_service.jobs.list_jobs_by_user(
            user_id=user_id_filter, status=status_filter, limit=limit, offset=offset
        )
        total = db_service.jobs.count_jobs_by_user(user_id=user_id_filter, status=status_filter)
    else:
        jobs = db_service.jobs.list_jobs(status=status_filter, limit=limit, offset=offset)
        total = db_service.jobs.count_jobs(status=status_filter)

    # convert to response models
    job_responses = []
    for job in jobs:
        # get user info
        user = db_service.users.get_by_id(job.user_id) if job.user_id else None

        job_responses.append(
            AdminJobResponse(
                job_id=job.job_id,
                user=AdminJobUser(
                    user_id=user.user_id if user else "unknown",
                    email=user.email if user else "unknown",
                    name=user.name if user else None,
                ),
                filename=job.filename,
                file_size=job.file_size,
                status=job.status,
                current_stage=job.current_stage,
                progress_percent=job.progress_percent,
                error_message=job.error_message,
                created_at=job.created_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
            )
        )

    logger.info(
        "Admin listed all jobs",
        extra={
            "admin_user_id": admin_user.user_id,
            "total": total,
            "returned": len(job_responses),
        },
    )

    return AdminJobListResponse(
        jobs=job_responses,
        total=total,
    )


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List all users (admin only)",
    description="""
    Retrieve a paginated list of all users in the system.

    Admin-only endpoint for user management.
    """,
)
@limiter.limit(settings.rate_limit_jobs_list)
async def list_all_users(
    request: Request,
    response: Response,
    admin_user: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of users to return"),
    offset: int = Query(0, ge=0, description="Number of users to skip"),
    search: str | None = Query(None, description="Search by email or name"),
    db: Session = Depends(get_db),
) -> AdminUserListResponse:
    """list all users with pagination and search."""
    db_service = DatabaseService(db)

    users = db_service.users.list_all_users(limit=limit, offset=offset, search=search)
    total = db_service.users.count_all_users(search=search)

    # convert to response models with job counts
    user_responses = []
    for user in users:
        job_count = db_service.jobs.count_jobs_by_user(user_id=user.user_id)

        user_responses.append(
            AdminUserResponse(
                user_id=user.user_id,
                email=user.email,
                name=user.name,
                role=user.role.value if user.role else "user",
                is_active=user.is_active,
                job_count=job_count,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
            )
        )

    logger.info(
        "Admin listed all users",
        extra={
            "admin_user_id": admin_user.user_id,
            "total": total,
            "returned": len(user_responses),
        },
    )

    return AdminUserListResponse(
        users=user_responses,
        total=total,
    )


@router.get(
    "/metrics",
    response_model=SystemMetricsResponse,
    summary="Get system metrics (admin only)",
    description="""
    Retrieve system-wide metrics and statistics.

    Admin-only endpoint for monitoring system health and usage.
    """,
)
@limiter.limit(settings.rate_limit_job_status)
async def get_system_metrics(
    request: Request,
    response: Response,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SystemMetricsResponse:
    """get system-wide metrics."""
    db_service = DatabaseService(db)

    # get job metrics
    job_metrics = db_service.jobs.get_system_metrics()

    # get user metrics
    total_users = db_service.users.count_all_users()
    active_users_30d = db_service.users.get_active_user_count(days=30)

    logger.info(
        "Admin viewed system metrics",
        extra={"admin_user_id": admin_user.user_id},
    )

    return SystemMetricsResponse(
        total_users=total_users,
        active_users_30d=active_users_30d,
        total_jobs=job_metrics["total_jobs"],
        jobs_by_status=JobStatusCounts(**job_metrics["jobs_by_status"]),
        total_storage_bytes=job_metrics["total_storage_bytes"],
        jobs_last_24h=job_metrics["jobs_last_24h"],
        jobs_last_7d=job_metrics["jobs_last_7d"],
        jobs_last_30d=job_metrics["jobs_last_30d"],
    )


@router.get(
    "/processing-logs",
    response_model=ProcessingLogListResponse,
    summary="List processing logs (admin only)",
    description="""
    Retrieve processing logs across all jobs.

    Admin-only endpoint for debugging and monitoring pipeline execution.
    """,
)
@limiter.limit(settings.rate_limit_jobs_list)
async def list_processing_logs(
    request: Request,
    response: Response,
    admin_user: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    job_id_filter: str | None = Query(None, description="Filter by job ID"),
    stage_filter: str | None = Query(None, description="Filter by processing stage"),
    db: Session = Depends(get_db),
) -> ProcessingLogListResponse:
    """list processing logs with pagination and filters."""
    db_service = DatabaseService(db)

    # build query
    query = db.query(ProcessingLog)

    if job_id_filter:
        query = query.filter(ProcessingLog.job_id == job_id_filter)

    if stage_filter:
        query = query.filter(ProcessingLog.stage == stage_filter)

    # get total count
    total = query.count()

    # get logs with pagination
    logs = query.order_by(ProcessingLog.created_at.desc()).limit(limit).offset(offset).all()

    # convert to response models
    log_responses = [
        ProcessingLogResponse(
            log_id=log.log_id,
            job_id=log.job_id,
            stage=log.stage,
            agent_name=log.agent_name,
            status=log.status,
            duration_seconds=log.duration_seconds,
            error_message=log.error_message,
            created_at=log.created_at,
        )
        for log in logs
    ]

    logger.info(
        "Admin listed processing logs",
        extra={
            "admin_user_id": admin_user.user_id,
            "total": total,
            "returned": len(log_responses),
        },
    )

    return ProcessingLogListResponse(
        logs=log_responses,
        total=total,
    )


