"""Progress tracking utilities for WebSocket updates."""

import json
from datetime import datetime

import redis

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


def get_redis_client() -> redis.Redis:
    """Get Redis client for progress publishing.

    Returns:
        Redis client instance
    """
    return redis.from_url(settings.redis_url, decode_responses=True)


def emit_progress(
    job_id: str,
    stage: str,
    percent: float,
    message: str,
    status: str = "running",
    eta_seconds: int | None = None,
) -> None:
    """Emit progress update via Redis pub/sub for WebSocket consumption.

    Args:
        job_id: Job identifier
        stage: Current processing stage
        percent: Progress percentage (0-100)
        message: Progress message
        status: Job status (running, completed, failed)
        eta_seconds: Estimated time remaining in seconds
    """
    try:
        redis_client = get_redis_client()

        # construct progress message
        progress_data = {
            "type": "progress",
            "job_id": job_id,
            "status": status,
            "data": {
                "stage": stage,
                "percent": round(percent, 2),
                "message": message,
                "eta_seconds": eta_seconds,
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

        # publish to Redis channel
        channel = f"job:{job_id}:progress"
        redis_client.publish(channel, json.dumps(progress_data))

        logger.debug(
            "Progress emitted",
            extra={
                "job_id": job_id,
                "stage": stage,
                "percent": percent,
                "status": status,
            },
        )

    except Exception as e:
        # don't fail task if progress emission fails
        logger.warning(
            "Failed to emit progress",
            exc_info=e,
            extra={"job_id": job_id, "stage": stage},
        )
