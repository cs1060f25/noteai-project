"""WebSocket endpoints for real-time job progress updates."""

import asyncio
import json

import redis.asyncio as aioredis
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.core.clerk_auth import verify_clerk_token
from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for job progress updates."""

    def __init__(self):
        # job_id -> list of websocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept a new WebSocket connection for a job.

        Args:
            websocket: The WebSocket connection
            job_id: The job ID to subscribe to
        """
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        logger.info(f"WebSocket connected for job {job_id}. Total connections: {len(self.active_connections[job_id])}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection
            job_id: The job ID
        """
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
                logger.info(f"WebSocket disconnected for job {job_id}. Remaining: {len(self.active_connections[job_id])}")

            # Clean up empty job lists
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]

    async def send_progress(self, job_id: str, message: dict):
        """Send progress update to all connections for a job.

        Args:
            job_id: The job ID
            message: The message to send
        """
        if job_id not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[job_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to WebSocket: {e}")
                disconnected.append(connection)

        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection, job_id)

    async def broadcast_to_job(self, job_id: str, message: dict):
        """Broadcast a message to all connections for a job.

        Args:
            job_id: The job ID
            message: The message to broadcast
        """
        await self.send_progress(job_id, message)


# Global connection manager instance
manager = ConnectionManager()


@router.websocket("/jobs/{job_id}")
async def websocket_job_progress(
    websocket: WebSocket,
    job_id: str,
    token: str = Query(None, description="Clerk authentication token")
):
    """WebSocket endpoint for real-time job progress updates.

    Args:
        websocket: The WebSocket connection
        job_id: The job ID to subscribe to
        token: Optional Clerk authentication token for security

    The WebSocket will receive JSON messages in the following format:
    {
        "type": "progress" | "complete" | "error",
        "job_id": "job_abc123",
        "progress": {
            "stage": "uploading" | "silence_detection" | "transcription" | "content_analysis" | "segmentation" | "compilation",
            "percent": 0-100,
            "message": "Status message",
            "eta_seconds": 120  # optional
        },
        "error": "Error message",  # only for type="error"
        "timestamp": "2024-01-01T12:00:00Z"
    }
    """
    # Verify authentication if token is provided
    if token:
        try:
            payload = verify_clerk_token(token)
            user_id = payload.get("sub")
            if not user_id:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
                return
            logger.info(f"Authenticated WebSocket connection for user {user_id}, job {job_id}")
        except Exception as e:
            logger.error(f"WebSocket authentication failed: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
            return

    try:
        await manager.connect(websocket, job_id)

        # Send initial connection success message
        await websocket.send_json({
            "type": "connected",
            "job_id": job_id,
            "message": "Connected to job progress stream"
        })

        # Create Redis subscriber for this job
        redis_client = aioredis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            decode_responses=True
        )
        pubsub = redis_client.pubsub()
        redis_channel = f"job_progress:{job_id}"
        await pubsub.subscribe(redis_channel)

        logger.info(f"Subscribed to Redis channel: {redis_channel}")

        # Create tasks for listening to both WebSocket and Redis
        async def listen_to_redis():
            """Listen to Redis pub/sub and forward to WebSocket."""
            try:
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        try:
                            data = json.loads(message["data"])
                            await websocket.send_json(data)
                            logger.debug(f"Forwarded Redis message to WebSocket: {data.get('type')}")
                        except json.JSONDecodeError as e:
                            logger.error(f"Invalid JSON from Redis: {e}")
                        except Exception as e:
                            logger.error(f"Failed to forward Redis message: {e}")
                            break
            except Exception as e:
                logger.error(f"Redis listener error: {e}")

        async def listen_to_websocket():
            """Listen to WebSocket for client messages (ping/pong)."""
            try:
                while True:
                    data = await websocket.receive_text()
                    # Handle ping/pong for keepalive
                    if data:
                        try:
                            message = json.loads(data)
                            if message.get("type") == "ping":
                                await websocket.send_json({"type": "pong"})
                        except json.JSONDecodeError:
                            pass
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for job {job_id}")
            except Exception as e:
                logger.error(f"WebSocket listener error for job {job_id}: {e}")

        # Run both listeners concurrently
        redis_task = asyncio.create_task(listen_to_redis())
        ws_task = asyncio.create_task(listen_to_websocket())

        # Wait for either task to complete (usually means disconnect)
        _done, pending = await asyncio.wait(
            [redis_task, ws_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        # Cancel remaining tasks
        for task in pending:
            task.cancel()

        # Clean up Redis connection
        await pubsub.unsubscribe(redis_channel)
        await pubsub.close()
        await redis_client.close()

    except Exception as e:
        logger.error(f"WebSocket connection error for job {job_id}: {e}", exc_info=e)
    finally:
        manager.disconnect(websocket, job_id)


@router.get("/connections/stats")
async def get_connection_stats() -> dict:
    """Get WebSocket connection statistics (for monitoring/debugging).

    Returns:
        Dictionary with connection statistics
    """
    total_connections = sum(len(conns) for conns in manager.active_connections.values())
    return {
        "total_jobs": len(manager.active_connections),
        "total_connections": total_connections,
        "jobs": {
            job_id: len(conns)
            for job_id, conns in manager.active_connections.items()
        }
    }


def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance.

    Returns:
        The ConnectionManager instance
    """
    return manager
