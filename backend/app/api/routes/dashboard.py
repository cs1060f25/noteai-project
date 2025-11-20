"""dashboard api routes for user statistics and recent activity."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies.clerk_auth import get_current_user_clerk
from app.core.database import get_db
from app.core.logging import get_logger
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.models.database import Clip, Job
from app.models.user import User
from app.schemas.dashboard import DashboardDataResponse, DashboardStatsResponse, RecentVideoResponse
from app.services.db_service import DatabaseService
from app.services.storage_service import StorageService

logger = get_logger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get(
    "",
    response_model=DashboardDataResponse,
    summary="Get dashboard data",
    description="""
    Retrieve dashboard statistics and recent activity for the current user.

    Returns:
    - Overall statistics (total videos, processing, completed, failed, etc.)
    - Recent videos (last 5 uploads with status and progress)
    - Storage usage
    """,
)
@limiter.limit(settings.rate_limit_jobs_list)
def get_dashboard_data(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
) -> DashboardDataResponse:
    """get dashboard data for current user."""
    db_service = DatabaseService(db)

    # get total jobs count by status
    status_counts = (
        db.query(Job.status, func.count(Job.id))
        .filter(Job.user_id == current_user.user_id)
        .group_by(Job.status)
        .all()
    )

    # convert to dict for easy access
    status_dict = dict(status_counts)

    # calculate processing count (queued + running)
    processing_count = status_dict.get("queued", 0) + status_dict.get("running", 0)

    # get total clips count
    total_clips = (
        db.query(func.count(Clip.id))
        .join(Job, Clip.job_id == Job.job_id)
        .filter(Job.user_id == current_user.user_id)
        .scalar()
        or 0
    )

    # get total storage from cached user field (more efficient)
    # falls back to calculation if cache is not available
    total_storage = current_user.storage_used_bytes or 0

    # if storage is 0 but user has jobs, recalculate and cache it
    if total_storage == 0 and sum(status_dict.values()) > 0:
        storage_service = StorageService(db)
        total_storage = storage_service.update_user_storage(current_user.user_id)

    # get video counts for different time periods
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)

    videos_last_24h = (
        db.query(func.count(Job.id))
        .filter(Job.user_id == current_user.user_id)
        .filter(Job.created_at >= last_24h)
        .scalar()
        or 0
    )

    videos_last_7d = (
        db.query(func.count(Job.id))
        .filter(Job.user_id == current_user.user_id)
        .filter(Job.created_at >= last_7d)
        .scalar()
        or 0
    )

    videos_last_30d = (
        db.query(func.count(Job.id))
        .filter(Job.user_id == current_user.user_id)
        .filter(Job.created_at >= last_30d)
        .scalar()
        or 0
    )

    # build stats response
    stats = DashboardStatsResponse(
        total_videos=sum(status_dict.values()),
        processing=processing_count,
        completed=status_dict.get("completed", 0),
        failed=status_dict.get("failed", 0),
        total_clips=total_clips,
        total_storage_bytes=total_storage,
        videos_last_24h=videos_last_24h,
        videos_last_7d=videos_last_7d,
        videos_last_30d=videos_last_30d,
    )

    # get recent videos (last 5)
    recent_jobs = db_service.jobs.list_jobs_by_user(
        user_id=current_user.user_id,
        limit=5,
        offset=0,
    )

    # build recent videos response
    recent_videos = []
    for job in recent_jobs:
        # get clips count for this job
        clips_count = db.query(func.count(Clip.id)).filter(Clip.job_id == job.job_id).scalar() or 0

        recent_videos.append(
            RecentVideoResponse(
                job_id=job.job_id,
                filename=job.filename,
                status=job.status,
                clips_count=clips_count,
                duration=job.video_duration,
                created_at=job.created_at,
                updated_at=job.updated_at,
                current_stage=job.current_stage,
                progress_percent=job.progress_percent,
            )
        )

    logger.debug(
        "Dashboard data retrieved",
        extra={
            "user_id": current_user.user_id,
            "total_videos": stats.total_videos,
            "recent_count": len(recent_videos),
        },
    )

    return DashboardDataResponse(
        stats=stats,
        recent_videos=recent_videos,
    )
