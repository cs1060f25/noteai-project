"""WebSocket service for sending real-time progress updates via Redis pub/sub."""

import json
from datetime import datetime, timezone

import redis

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)

# Redis client for publishing messages
_redis_client = None


def get_redis_client() -> redis.Redis:
    """Get or create Redis client for publishing.

    Returns:
        Redis client instance
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            decode_responses=True,
        )
    return _redis_client


def publish_to_redis(channel: str, message: dict) -> None:
    """Publish a message to Redis channel.

    Args:
        channel: Redis channel name
        message: Message dictionary to publish
    """
    try:
        client = get_redis_client()
        client.publish(channel, json.dumps(message))
        logger.debug(
            "Published message to Redis",
            extra={"channel": channel, "message_type": message.get("type")},
        )
    except Exception as e:
        logger.error(
            "Failed to publish to Redis",
            exc_info=e,
            extra={"channel": channel},
        )


def send_progress_sync(
    job_id: str,
    stage: str,
    percent: float,
    message: str,
    eta_seconds: int | None = None,
) -> None:
    """Send progress update via Redis pub/sub (called from Celery tasks).

    This publishes to a Redis channel that FastAPI subscribes to,
    which then forwards the message to WebSocket clients.

    Args:
        job_id: The job ID
        stage: Current processing stage
        percent: Progress percentage (0-100)
        message: Status message
        eta_seconds: Optional estimated time to completion in seconds
    """
    payload = {
        "type": "progress",
        "job_id": job_id,
        "progress": {
            "stage": stage,
            "percent": round(percent, 2),
            "message": message,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if eta_seconds is not None:
        payload["progress"]["eta_seconds"] = eta_seconds

    # Publish to Redis channel (FastAPI will forward to WebSocket)
    channel = f"job_progress:{job_id}"
    publish_to_redis(channel, payload)

    logger.debug(
        "Sent progress update via Redis",
        extra={
            "job_id": job_id,
            "stage": stage,
            "percent": percent,
        },
    )


def send_completion_sync(job_id: str) -> None:
    """Send completion notification via Redis pub/sub (called from Celery tasks).

    Args:
        job_id: The job ID
    """
    payload = {
        "type": "complete",
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    channel = f"job_progress:{job_id}"
    publish_to_redis(channel, payload)

    logger.info("Sent completion update via Redis", extra={"job_id": job_id})


def send_error_sync(job_id: str, error: str) -> None:
    """Send error notification via Redis pub/sub (called from Celery tasks).

    Args:
        job_id: The job ID
        error: Error message
    """
    payload = {
        "type": "error",
        "job_id": job_id,
        "error": error,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    channel = f"job_progress:{job_id}"
    publish_to_redis(channel, payload)

    logger.info(
        "Sent error update via Redis",
        extra={"job_id": job_id, "error": error},
    )
