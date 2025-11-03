"""Celery task for video compilation."""

import time
from typing import Any

from celery import Task

from agents.compiler import CompilationError, compile_video_clips
from app.core.logging import get_logger
from app.models.database import Job, ProcessingLog

from pipeline.celery_app import celery_app
from pipeline.utils.progress import emit_progress

from app.services.db_service import DatabaseService
from app.core.settings import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def get_db():
    """Create a database session (temporary fix until central get_db is added)."""
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

logger = get_logger(__name__)


class CompilationTask(Task):
    """Custom task class for video compilation with error handling."""

    name = "tasks.compile_video"
    autoretry_for = (CompilationError,)
    retry_kwargs = {"max_retries": 2, "countdown": 60}
    retry_backoff = True

    def on_failure(
        self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any
    ) -> None:
        """Handle task failure.

        Args:
            exc: Exception that caused failure
            task_id: Task ID
            args: Task arguments
            kwargs: Task keyword arguments
            einfo: Exception info
        """
        job_id = args[0] if args else kwargs.get("job_id")
        logger.error(
            "Compilation task failed",
            exc_info=exc,
            extra={"job_id": job_id, "task_id": task_id},
        )

        # update job status
        db = next(get_db())
        try:
            job = db.query(Job).filter(Job.job_id == job_id).first()
            if job:
                job.status = "failed"
                job.error_message = f"Compilation failed: {exc!s}"
                job.current_stage = "compilation"
                db.commit()

                # emit failure progress
                emit_progress(
                    job_id=job_id,
                    stage="compilation",
                    percent=0,
                    message=f"Compilation failed: {exc!s}",
                    status="failed",
                )
        finally:
            db.close()


@celery_app.task(bind=True, base=CompilationTask, name="tasks.compile_video")
def compile_video_task(self: Task, job_id: str) -> dict[str, Any]:
    """Celery task to compile video clips.

    Args:
        self: Task instance
        job_id: Job identifier

    Returns:
        Compilation result dictionary
    """
    logger.info("Starting compilation task", extra={"job_id": job_id, "task_id": self.request.id})

    start_time = time.time()
    db = next(get_db())

    try:
        # update job status
        job = db.query(Job).filter(Job.job_id == job_id).first()
        if not job:
            raise CompilationError(f"Job not found: {job_id}")

        job.status = "running"
        job.current_stage = "compilation"
        job.celery_task_id = self.request.id
        db.commit()

        # emit initial progress
        emit_progress(
            job_id=job_id,
            stage="compilation",
            percent=0,
            message="Starting video compilation",
            status="running",
        )

        # log processing start
        log = ProcessingLog(
            log_id=f"log_{job_id}_compilation_start",
            job_id=job_id,
            stage="compilation",
            agent_name="video_compiler",
            status="started",
        )
        db.add(log)
        db.commit()

        # emit progress: downloading video
        emit_progress(
            job_id=job_id,
            stage="compilation",
            percent=10,
            message="Downloading original video",
            status="running",
        )

        # emit progress: processing segments
        emit_progress(
            job_id=job_id,
            stage="compilation",
            percent=30,
            message="Processing video segments",
            status="running",
        )

        # perform compilation
        result = compile_video_clips(job_id=job_id, db=db)

        # emit progress: generating thumbnails
        emit_progress(
            job_id=job_id,
            stage="compilation",
            percent=70,
            message="Generating thumbnails and subtitles",
            status="running",
        )

        # emit progress: uploading
        emit_progress(
            job_id=job_id,
            stage="compilation",
            percent=90,
            message="Uploading compiled clips",
            status="running",
        )

        # update job status
        duration = time.time() - start_time
        job.status = "completed"
        job.current_stage = "complete"
        job.progress_percent = 100
        job.progress_message = "Compilation completed"
        db.commit()

        # log processing completion
        log = ProcessingLog(
            log_id=f"log_{job_id}_compilation_complete",
            job_id=job_id,
            stage="compilation",
            agent_name="video_compiler",
            status="completed",
            duration_seconds=duration,
            extra_metadata={
                "clips_generated": result.get("clips_generated", 0),
            },
        )
        db.add(log)
        db.commit()

        # emit completion progress
        emit_progress(
            job_id=job_id,
            stage="complete",
            percent=100,
            message=f"Compilation completed: {result.get('clips_generated', 0)} clips generated",
            status="completed",
        )

        logger.info(
            "Compilation task completed",
            extra={
                "job_id": job_id,
                "duration": duration,
                "clips_generated": result.get("clips_generated", 0),
            },
        )

        return result

    except Exception as e:
        duration = time.time() - start_time
        logger.error(
            "Compilation task failed",
            exc_info=e,
            extra={"job_id": job_id, "duration": duration},
        )

        # log processing failure
        log = ProcessingLog(
            log_id=f"log_{job_id}_compilation_failed",
            job_id=job_id,
            stage="compilation",
            agent_name="video_compiler",
            status="failed",
            duration_seconds=duration,
            error_message=str(e),
        )
        db.add(log)
        db.commit()

        raise

    finally:
        db.close()
