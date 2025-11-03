"""celery application configuration and initialization."""

from celery import Celery
from kombu import Exchange, Queue
from prometheus_client import Counter, Gauge, Histogram

from app.core.logging import get_logger
from app.core.settings import settings
from pipeline.tasks.compilation_task import compile_video_task


logger = get_logger(__name__)

# prometheus metrics for celery tasks
task_duration_seconds = Histogram(
    "celery_task_duration_seconds",
    "Task execution duration in seconds",
    ["task_name", "status"],
)

task_counter = Counter(
    "celery_task_total",
    "Total number of tasks executed",
    ["task_name", "status"],
)

active_workers = Gauge(
    "celery_active_workers",
    "Number of active Celery workers",
)

queue_length = Gauge(
    "celery_queue_length",
    "Number of tasks waiting in queue",
    ["queue_name"],
)

# create celery app instance
celery_app = Celery(
    "lecture_extractor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# celery configuration
celery_app.conf.update(
    # task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.celery_task_time_limit,
    task_soft_time_limit=settings.celery_task_soft_time_limit,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # result backend settings
    result_expires=3600 * 24,  # 24 hours
    result_extended=True,
    # retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    # worker settings
    worker_max_tasks_per_child=50,
    worker_disable_rate_limits=False,
    # routing
    task_routes={
        "pipeline.tasks.process_video": {"queue": "processing"},
        "pipeline.tasks.stage_one_parallel": {"queue": "processing"},
        "pipeline.tasks.stage_two_sequential": {"queue": "processing"},
        "tasks.compile_video": {"queue": "processing"},  # 👈 ADD THIS LINE
        "pipeline.tasks.*": {"queue": "default"},
    },
    task_queues=(
        Queue(
            "default",
            Exchange("default"),
            routing_key="default",
        ),
        Queue(
            "processing",
            Exchange("processing"),
            routing_key="processing",
            priority=10,
        ),
    ),
)

# autodiscover tasks from the pipeline module
celery_app.autodiscover_tasks(["pipeline"])


@celery_app.task(bind=True)
def debug_task(self):
    """debug task to test celery configuration."""
    logger.info(f"Request: {self.request!r}")
    return {"status": "ok", "task_id": self.request.id}


# celery beat schedule for periodic tasks (if needed in future)
celery_app.conf.beat_schedule = {
    # example: cleanup old jobs every day
    # "cleanup-old-jobs": {
    #     "task": "pipeline.tasks.cleanup_old_jobs",
    #     "schedule": crontab(hour=2, minute=0),  # 2 AM daily
    # },
}

logger.info(
    "Celery app configured",
    extra={
        "broker": settings.celery_broker_url,
        "backend": settings.celery_result_backend,
    },
)
