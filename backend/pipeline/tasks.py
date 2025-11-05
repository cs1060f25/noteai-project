"""celery task definitions for video processing pipeline."""

import time
from datetime import datetime, timezone
from typing import Any

from celery import Task, chain
from celery.signals import worker_ready
from prometheus_client import start_http_server
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from agents.content_analyzer import analyze_content
from agents.layout_detector import detect_layout
from agents.segment_extractor import extract_segments
from agents.silence_detector import detect_silence
from agents.transcript_agent import generate_transcript
from agents.video_compiler import compile_clips
from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService

from .celery_app import celery_app, task_counter, task_duration_seconds

logger = get_logger(__name__)


# database session factory for celery tasks
def get_task_db():
    """create database session for celery tasks."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=engine)
    return session_local()


def get_job_s3_key(job_id: str) -> str:
    """get S3 key for a job from database.

    Args:
        job_id: job identifier

    Returns:
        S3 key for the video file

    Raises:
        ValueError: if job not found
    """
    db = get_task_db()
    try:
        db_service = DatabaseService(db)
        job = db_service.jobs.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        logger.info(
            "Retrieved job S3 key",
            extra={"job_id": job_id, "s3_key": job.original_s3_key},
        )

        return job.original_s3_key
    finally:
        db.close()


class BaseProcessingTask(Task):
    """base task with progress tracking and error handling."""

    def before_start(self, task_id, args, kwargs):
        """track task start time for metrics."""
        self._start_time = time.time()

    def on_success(self, retval, task_id, args, kwargs):
        """track successful task completion metrics."""
        if hasattr(self, "_start_time"):
            duration = time.time() - self._start_time
            task_duration_seconds.labels(
                task_name=self.name, status="success").observe(duration)

        task_counter.labels(task_name=self.name, status="success").inc()

        logger.info(
            "Task completed successfully",
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "duration": duration if hasattr(self, "_start_time") else None,
            },
        )

    def update_job_progress(
        self,
        job_id: str,
        stage: str,
        percent: float,
        message: str,
        status: str = "running",
        eta_seconds: int | None = None,
    ) -> None:
        """update job progress in database."""
        db = get_task_db()
        try:
            db_service = DatabaseService(db)
            # update status separately if needed
            if status:
                db_service.jobs.update_status(job_id=job_id, status=status)
            # update progress fields
            db_service.jobs.update_progress(
                job_id=job_id,
                current_stage=stage,
                progress_percent=percent,
                progress_message=message,
                eta_seconds=eta_seconds,
            )
            db.commit()

            logger.info(
                "Job progress updated",
                extra={
                    "job_id": job_id,
                    "stage": stage,
                    "percent": percent,
                    "status": status,
                },
            )
        except Exception as e:
            logger.error(
                "Failed to update job progress",
                exc_info=e,
                extra={"job_id": job_id},
            )
            db.rollback()
        finally:
            db.close()

    def mark_job_failed(self, job_id: str, error_message: str) -> None:
        """mark job as failed with error message."""
        db = get_task_db()
        try:
            db_service = DatabaseService(db)
            job = db_service.jobs.get_by_id(job_id)
            if job:
                job.status = "failed"
                job.error_message = error_message
                job.completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.error(
                "Job marked as failed",
                extra={"job_id": job_id, "error": error_message},
            )
        except Exception as e:
            logger.error(
                "Failed to mark job as failed",
                exc_info=e,
                extra={"job_id": job_id},
            )
            db.rollback()
        finally:
            db.close()

    def mark_job_completed(self, job_id: str) -> None:
        """mark job as completed."""
        db = get_task_db()
        try:
            db_service = DatabaseService(db)
            job = db_service.jobs.get_by_id(job_id)
            if job:
                job.status = "completed"
                job.current_stage = "complete"
                job.progress_percent = 100.0
                job.progress_message = "Processing complete"
                job.completed_at = datetime.now(timezone.utc)
                db.commit()

            logger.info("Job marked as completed", extra={"job_id": job_id})
        except Exception as e:
            logger.error(
                "Failed to mark job as completed",
                exc_info=e,
                extra={"job_id": job_id},
            )
            db.rollback()
        finally:
            db.close()

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """handle task failure."""
        # track failure metrics
        if hasattr(self, "_start_time"):
            duration = time.time() - self._start_time
            task_duration_seconds.labels(
                task_name=self.name, status="failure").observe(duration)

        task_counter.labels(task_name=self.name, status="failure").inc()

        job_id = kwargs.get("job_id") or (args[0] if args else None)
        if job_id:
            error_message = f"Task failed: {exc!s}"
            self.mark_job_failed(job_id, error_message)

        logger.error(
            "Task failed",
            exc_info=exc,
            extra={
                "task_id": task_id,
                "job_id": job_id,
                "error": str(exc),
            },
        )


@celery_app.task(
    bind=True,
    base=BaseProcessingTask,
    name="pipeline.tasks.process_video",
)
def process_video(self, job_id: str) -> dict[str, Any]:
    """main task to orchestrate video processing pipeline.

    runs agents sequentially:
    1. silence detector
    2. content analyzer (gemini)
    3. segment extractor

    args:
        job_id: unique job identifier

    returns:
        dict with processing results
    """
    logger.info("starting video processing pipeline (sequential)",
                extra={"job_id": job_id})

    try:
        # update job status to running
        self.update_job_progress(
            job_id=job_id,
            stage="initializing",
            percent=5.0,
            message="starting processing pipeline",
            status="running",
        )

        # sequential pipeline: silence → transcription → content → segments
        # use .s() for transcription to receive silence result, .si() for others
        pipeline = chain(
            silence_detection_task.si(job_id),
            transcription_task.s(job_id=job_id),  # receives silence_result as first arg
            content_analysis_task.si(job_id),
            # segment_extraction_task.si(job_id),
        )

        # execute pipeline
        result = pipeline.apply_async()

        logger.info(
            "sequential pipeline started",
            extra={"job_id": job_id, "chain_id": result.id},
        )

        return {
            "job_id": job_id,
            "status": "started",
            "chain_id": result.id,
            "pipeline": "sequential",
        }

    except Exception as e:
        logger.error(
            "failed to start pipeline",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"pipeline initialization failed: {e!s}")
        raise


@celery_app.task(
    bind=True,
    base=BaseProcessingTask,
    name="pipeline.tasks.stage_one_parallel",
)
def stage_one_parallel(self, job_id: str) -> dict[str, Any]:
    """stage one: sequential silence detection followed by transcription.

    runs agents in sequence to ensure transcription only processes non-silent segments:
    1. silence detector (analyzes and stores silence regions)
    2. transcript generator (retrieves silence regions and transcribes only non-silent parts)
    3. layout analyzer (runs in parallel, optional)

    args:
        job_id: unique job identifier

    returns:
        dict with stage one results
    """
    logger.info("Starting stage one (sequential processing)",
                extra={"job_id": job_id})

    try:
        self.update_job_progress(
            job_id=job_id,
            stage="parallel_processing",
            percent=10.0,
            message="Running analysis (silence detection, then transcription)",
            status="running",
            eta_seconds=300,
        )

        # chain silence detection followed by transcription
        # this ensures silence regions are stored in DB before transcription starts
        sequential_chain = chain(
            silence_detection_task.s(job_id),
            transcription_task.s(job_id=job_id),  # receives silence_result as first arg
        )

        # execute sequential chain
        # layout analysis can be added separately if needed
        sequential_chain.apply_async()

        logger.info("Stage one completed", extra={"job_id": job_id})

        return {
            "job_id": job_id,
            "stage": "stage_one",
            "status": "completed",
        }

    except Exception as e:
        logger.error(
            "Stage one failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Stage one failed: {e!s}")
        raise


@celery_app.task(
    bind=True,
    base=BaseProcessingTask,
    name="pipeline.tasks.stage_two_sequential",
)
def stage_two_sequential(self, _stage_one_result: dict[str, Any], job_id: str) -> dict[str, Any]:
    """stage two: sequential processing of content, segmentation, and compilation.

    runs three agents sequentially:
    1. content analyzer (gemini)
    2. segment extractor
    3. video compiler

    args:
        stage_one_result: results from stage one
        job_id: unique job identifier

    returns:
        dict with final processing results
    """
    logger.info("Starting stage two (sequential)", extra={"job_id": job_id})

    try:
        # content analysis
        self.update_job_progress(
            job_id=job_id,
            stage="content_analysis",
            percent=50.0,
            message="Analyzing content with AI",
            status="running",
            eta_seconds=180,
        )
        content_analysis_task.apply_async(args=[job_id])

        # segment extraction
        self.update_job_progress(
            job_id=job_id,
            stage="segmentation",
            percent=70.0,
            message="Extracting highlight segments",
            status="running",
            eta_seconds=120,
        )
        segment_extraction_task.apply_async(args=[job_id])

        # video compilation
        self.update_job_progress(
            job_id=job_id,
            stage="compilation",
            percent=85.0,
            message="Compiling final video clips",
            status="running",
            eta_seconds=60,
        )
        video_compilation_task.apply_async(args=[job_id])

        # mark job as completed
        self.mark_job_completed(job_id)

        logger.info("Stage two completed", extra={"job_id": job_id})

        return {
            "job_id": job_id,
            "stage": "stage_two",
            "status": "completed",
        }

    except Exception as e:
        logger.error(
            "Stage two failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Stage two failed: {e!s}")
        raise


# placeholder tasks for individual agents (will be replaced with actual agent implementations)


@celery_app.task(bind=True, base=BaseProcessingTask)
def silence_detection_task(self, job_id: str) -> dict[str, Any]:
    """silence detection agent task (step 1 of 3)."""

    # update progress
    self.update_job_progress(
        job_id=job_id,
        stage="silence_detection",
        percent=10.0,
        message="detecting silence regions in audio",
        status="running",
        eta_seconds=60,
    )

    s3_key = get_job_s3_key(job_id)
    logger.info(
        "starting silence detection",
        extra={"job_id": job_id, "s3_key": s3_key},
    )

    result = detect_silence(s3_key, job_id)

    # update progress after completion
    self.update_job_progress(
        job_id=job_id,
        stage="silence_detection",
        percent=30.0,
        message="silence detection completed",
        status="running",
    )

    logger.info(
        "silence detection completed",
        extra={
            "job_id": job_id,
            "silence_regions": result.get("silence_count", 0),
        },
    )

    return result


@celery_app.task(bind=True, base=BaseProcessingTask)
def transcription_task(self, silence_result: dict[str, Any], job_id: str) -> dict[str, Any]:
    """transcription agent task with progress updates.

    this task is chained after silence detection to ensure transcription
    only processes non-silent segments.

    args:
        silence_result: result from silence detection task (passed via chain)
        job_id: unique job identifier

    returns:
        dict with transcription results
    """
    try:
        s3_key = get_job_s3_key(job_id)

        logger.info(
            "Starting transcription after silence detection",
            extra={
                "job_id": job_id,
                "s3_key": s3_key,
                "silence_regions_detected": silence_result.get("silence_count", 0),
            },
        )

        # update progress: starting
        self.update_job_progress(
            job_id=job_id,
            stage="transcription",
            percent=0.0,
            message="Starting audio transcription (non-silent segments only)",
            status="running",
        )

        # run transcription
        # the transcript agent will automatically retrieve silence regions from DB
        # and only transcribe non-silent parts
        result = generate_transcript(s3_key, job_id)

        # update progress: completed
        self.update_job_progress(
            job_id=job_id,
            stage="transcription",
            percent=100.0,
            message=f"Transcription completed ({result.get('total_segments', 0)} segments)",
            status="running",
        )

        logger.info(
            "Transcription completed",
            extra={"job_id": job_id, "result": result},
        )

        return result

    except Exception as e:
        logger.error(
            "Transcription task failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Transcription failed: {e!s}")
        raise


@celery_app.task(bind=True, base=BaseProcessingTask)
def layout_analysis_task(_self, job_id: str) -> dict[str, Any]:
    """layout analysis agent task."""
    s3_key = get_job_s3_key(job_id)
    logger.info(
        "Starting layout analysis",
        extra={"job_id": job_id, "s3_key": s3_key},
    )
    return detect_layout(s3_key, job_id)


@celery_app.task(bind=True, base=BaseProcessingTask)
def content_analysis_task(self, job_id: str) -> dict[str, Any]:
    """content analysis agent task (step 2 of 3).

    analyzes video transcripts using Gemini API to identify key educational segments
    with importance scores, topics, and concepts.

    note: agent queries database directly for all required data (transcripts).
    """
    logger.info("starting content analysis", extra={"job_id": job_id})

    # update progress
    self.update_job_progress(
        job_id=job_id,
        stage="content_analysis",
        percent=35.0,
        message="analyzing content with AI (Gemini)",
        status="running",
        eta_seconds=30,
    )

    # agent queries database directly, pass empty dict for legacy signature
    result = analyze_content({}, job_id)

    # update progress after completion
    self.update_job_progress(
        job_id=job_id,
        stage="content_analysis",
        percent=60.0,
        message="content analysis completed",
        status="running",
    )

    logger.info(
        "content analysis completed",
        extra={
            "job_id": job_id,
            "segments_created": result.get("segments_created", 0),
            "model_used": result.get("model_used"),
            "processing_time": result.get("processing_time_seconds", 0),
        },
    )

    return result


@celery_app.task(bind=True, base=BaseProcessingTask)
def segment_extraction_task(self, job_id: str) -> dict[str, Any]:
    """segment extraction agent task."""
    content_data = {}  # TODO: get from database
    silence_data = {}  # TODO: get from database
    transcript_data = {}  # TODO: get from database
    return extract_segments(content_data, silence_data, transcript_data, job_id)


@celery_app.task(bind=True, base=BaseProcessingTask)
def video_compilation_task(_self, job_id: str) -> dict[str, Any]:
    """video compilation agent task."""
    s3_key = get_job_s3_key(job_id)
    logger.info(
        "Starting video compilation",
        extra={"job_id": job_id, "s3_key": s3_key},
    )

    # TODO: get segments, layout, and transcript from database
    segments_data = {}
    layout_data = {}
    transcript_data = {}

    return compile_clips(s3_key, segments_data, layout_data, transcript_data, job_id)


# start prometheus metrics server when worker is ready
@worker_ready.connect
def start_metrics_server(**_kwargs):
    """start prometheus metrics HTTP server on worker startup."""
    try:
        start_http_server(9090)
        logger.info("Prometheus metrics server started on port 9090")
    except Exception as e:
        logger.error(
            "Failed to start metrics server",
            exc_info=e,
            extra={"port": 9090},
        )
