"""prometheus metrics service for job tracking."""

from datetime import datetime, timezone

from prometheus_client import Gauge
from sqlalchemy import func

from app.core.database import SessionLocal
from app.core.logging import get_logger
from app.models.database import Job

logger = get_logger(__name__)

# custom prometheus metrics for job tracking
job_count_by_status = Gauge(
    "job_count_by_status",
    "Number of jobs by status",
    ["status"],
)

job_processing_duration = Gauge(
    "job_processing_duration_seconds",
    "Average job processing duration in seconds",
    ["status"],
)

job_count_by_stage = Gauge(
    "job_count_by_stage",
    "Number of jobs by current processing stage",
    ["stage"],
)


async def update_job_metrics() -> None:
    """update prometheus metrics for job statistics."""
    try:
        db = SessionLocal()

        # count jobs by status
        status_counts = db.query(Job.status, func.count(Job.id)).group_by(Job.status).all()

        # reset all status counts first
        for status in ["queued", "running", "completed", "failed"]:
            job_count_by_status.labels(status=status).set(0)

        # set actual counts
        for status, count in status_counts:
            job_count_by_status.labels(status=status).set(count)

        # count jobs by stage (only for running jobs)
        stage_counts = (
            db.query(Job.current_stage, func.count(Job.id))
            .filter(Job.status == "running")
            .filter(Job.current_stage.isnot(None))
            .group_by(Job.current_stage)
            .all()
        )

        for stage, count in stage_counts:
            job_count_by_stage.labels(stage=stage).set(count)

        # calculate average processing duration for completed jobs (today only)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        completed_jobs = (
            db.query(func.extract("epoch", Job.completed_at - Job.created_at).label("duration"))
            .filter(Job.status == "completed")
            .filter(Job.completed_at.isnot(None))
            .filter(Job.created_at >= today_start)
            .all()
        )

        if completed_jobs:
            avg_duration = sum(row.duration for row in completed_jobs) / len(completed_jobs)
            job_processing_duration.labels(status="completed").set(avg_duration)

        db.close()

        logger.debug("Job metrics updated successfully")

    except Exception as e:
        logger.error("Failed to update job metrics", exc_info=e)
