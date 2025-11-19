"""pipeline orchestration utilities for managing video processing workflows."""

from typing import Any

from app.core.logging import get_logger
from app.services.s3_service import s3_service

from .tasks import process_video_optimized

logger = get_logger(__name__)


def get_db():
    """Create a new database session."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.core.settings import settings

    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


class PipelineOrchestrator:
    """orchestrates the video processing pipeline."""

    @staticmethod
    def start_processing(job_id: str, s3_key: str) -> dict[str, Any]:
        """start the video processing pipeline for a job.

        this is called after the client uploads a video to s3.
        it verifies the upload and kicks off the celery task.

        the optimized pipeline will automatically route to audio-only
        or vision mode based on the job's processing configuration.

        args:
            job_id: unique job identifier
            s3_key: s3 object key for the uploaded video

        returns:
            dict with task information

        raises:
            exception if s3 verification fails
        """
        logger.info(
            "Starting pipeline orchestration",
            extra={"job_id": job_id, "s3_key": s3_key},
        )

        # verify s3 upload exists
        try:
            if not s3_service.object_exists(s3_key):
                error_msg = f"S3 object not found: {s3_key}"
                logger.error(error_msg, extra={"job_id": job_id})
                raise ValueError(error_msg)
        except Exception as e:
            logger.error(
                "Failed to verify S3 upload",
                exc_info=e,
                extra={"job_id": job_id, "s3_key": s3_key},
            )
            raise

        # Verify user has API key
        db = get_db()
        try:
            from app.services.db_service import DatabaseService

            db_service = DatabaseService(db)
            job = db_service.jobs.get_by_id(job_id)
            if not job:
                raise ValueError(f"Job not found: {job_id}")

            if not job.user or not job.user.gemini_api_key_encrypted:
                error_msg = (
                    "Missing API Key: Please add your Gemini API key in Settings to process videos."
                )
                logger.error(
                    error_msg,
                    extra={"job_id": job_id, "user_id": job.user_id if job.user else "unknown"},
                )

                # Mark job as failed immediately
                job.status = "failed"
                job.error_message = error_msg
                db.commit()

                # Send error notification (if websocket service available here, otherwise task will handle it?
                # Actually orchestrator runs in API context usually, so we might not have async context for websocket
                # but we should try to fail fast)
                raise ValueError(error_msg)

        except Exception as e:
            logger.error("Failed to validate user API key", exc_info=e, extra={"job_id": job_id})
            raise
        finally:
            db.close()

        # start optimized celery task (routes based on processing config)
        task = process_video_optimized.delay(job_id)

        logger.info(
            "Pipeline task started",
            extra={
                "job_id": job_id,
                "task_id": task.id,
                "task_name": "process_video_optimized",
            },
        )

        return {
            "job_id": job_id,
            "task_id": task.id,
            "status": "started",
        }

    @staticmethod
    def get_task_status(task_id: str) -> dict[str, Any]:
        """get the status of a celery task.

        args:
            task_id: celery task id

        returns:
            dict with task status information
        """
        from celery.result import AsyncResult

        result = AsyncResult(task_id)

        return {
            "task_id": task_id,
            "state": result.state,
            "ready": result.ready(),
            "successful": result.successful() if result.ready() else None,
            "result": result.result if result.ready() else None,
        }


# convenience function for starting pipeline
def start_pipeline(job_id: str, s3_key: str) -> dict[str, Any]:
    """convenience function to start the processing pipeline.

    args:
        job_id: unique job identifier
        s3_key: s3 object key for the uploaded video

    returns:
        dict with task information
    """
    orchestrator = PipelineOrchestrator()
    return orchestrator.start_processing(job_id, s3_key)
