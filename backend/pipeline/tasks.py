"""celery task definitions for video processing pipeline."""

import os
import subprocess
import time
from datetime import datetime, timezone
from typing import Any

import requests
from celery import Task
from celery.signals import worker_ready
from prometheus_client import start_http_server
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from agents.content_analyzer import analyze_content
from agents.layout_detector import detect_layout
from agents.segment_extractor import extract_segments
from agents.silence_detector import detect_silence
from agents.transcript_agent import generate_transcript
from agents.video_compiler import VideoCompiler, compile_clips
from app.core.logging import get_logger
from app.core.settings import settings
from app.models.database import Job
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service
from app.services.websocket_service import send_completion_sync, send_error_sync, send_progress_sync

from .celery_app import celery_app, task_counter, task_duration_seconds

logger = get_logger(__name__)


# database session factory for celery tasks
def get_task_db():
    """create database session for celery tasks."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
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


def get_user_api_key(job_id: str) -> str:
    """Get decrypted user API key for a job.

    Args:
        job_id: job identifier

    Returns:
        Decrypted API key

    Raises:
        ValueError: if key is missing or invalid
    """
    from app.core.security import decrypt_string

    db = get_task_db()
    try:
        db_service = DatabaseService(db)
        job = db_service.jobs.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        if not job.user or not job.user.gemini_api_key_encrypted:
            raise ValueError("User API key not found")

        try:
            api_key = decrypt_string(
                job.user.gemini_api_key_encrypted, settings.api_key_encryption_secret
            )
            return api_key
        except Exception as e:
            logger.error("Failed to decrypt API key", exc_info=e, extra={"job_id": job_id})
            raise ValueError("Invalid API key configuration") from e
    finally:
        db.close()


def create_processing_log_entry(
    job_id: str,
    stage: str,
    agent_name: str | None,
    status: str,
    duration_seconds: float | None = None,
    error_message: str | None = None,
) -> None:
    """create processing log entry in database (standalone function for inline agent calls).

    idempotent - checks for existing log with same job_id + stage + agent_name to prevent duplicates.

    Args:
        job_id: job identifier
        stage: processing stage name
        agent_name: agent name (e.g., 'TranscriptAgent')
        status: log status ('started', 'completed', 'failed')
        duration_seconds: execution time in seconds
        error_message: error message if failed
    """
    import uuid

    db = get_task_db()
    try:
        from app.models.database import ProcessingLog

        # check if log already exists (idempotency - prevent duplicates from retries)
        existing_log = (
            db.query(ProcessingLog)
            .filter(
                ProcessingLog.job_id == job_id,
                ProcessingLog.stage == stage,
                ProcessingLog.agent_name == agent_name,
                ProcessingLog.status == "completed",
            )
            .first()
        )

        if existing_log:
            logger.info(
                "Processing log already exists, skipping duplicate",
                extra={
                    "job_id": job_id,
                    "stage": stage,
                    "agent_name": agent_name,
                    "existing_duration": existing_log.duration_seconds,
                },
            )
            return

        log = ProcessingLog(
            log_id=str(uuid.uuid4()),
            job_id=job_id,
            stage=stage,
            agent_name=agent_name,
            status=status,
            duration_seconds=duration_seconds,
            error_message=error_message,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        db.commit()

        logger.info(
            "Processing log created",
            extra={
                "job_id": job_id,
                "stage": stage,
                "agent_name": agent_name,
                "duration": duration_seconds,
                "status": status,
            },
        )
    except Exception as e:
        logger.error(
            "Failed to create processing log",
            exc_info=e,
            extra={"job_id": job_id, "stage": stage},
        )
        db.rollback()
    finally:
        db.close()


def get_processing_config(job_id: str) -> dict[str, Any]:
    """get processing configuration from job metadata.

    Args:
        job_id: job identifier

    Returns:
        processing configuration dict with keys: prompt, resolution, processing_mode

    Raises:
        ValueError: if job not found
    """
    db = get_task_db()
    try:
        db_service = DatabaseService(db)
        job = db_service.jobs.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        # extract processing config from extra_metadata
        config = job.extra_metadata.get("processing_config", {})

        # provide defaults if config not present
        default_config = {
            "prompt": None,
            "resolution": "1080p",
            "processing_mode": "vision",
        }

        # merge with defaults
        result = {**default_config, **config}

        logger.info(
            "Retrieved processing config",
            extra={"job_id": job_id, "config": result},
        )

        return result
    finally:
        db.close()


class BaseProcessingTask(Task):
    """base task with progress tracking and error handling."""

    def before_start(self, task_id, args, kwargs):
        """track task start time for metrics."""
        self._start_time = time.time()

    def on_success(self, retval, task_id, args, kwargs):
        """track successful task completion metrics and save processing log."""
        duration = None
        if hasattr(self, "_start_time"):
            duration = time.time() - self._start_time
            task_duration_seconds.labels(task_name=self.name, status="success").observe(duration)

        task_counter.labels(task_name=self.name, status="success").inc()

        logger.info(
            "Task completed successfully",
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "duration": duration,
            },
        )

        # save processing log to database (only for actual agent tasks, not wrappers)
        job_id = kwargs.get("job_id") or (args[0] if args else None)
        agent_name = self._get_agent_name()

        # only log if this is an actual agent task (not a wrapper/orchestrator)
        if job_id and duration is not None and agent_name is not None:
            self._create_processing_log(
                job_id=job_id,
                stage=self._get_stage_name(),
                agent_name=agent_name,
                status="completed",
                duration_seconds=duration,
            )

    def _get_stage_name(self) -> str:
        """extract stage name from task name."""
        # map task names to stage names
        task_to_stage = {
            "silence_detection_task": "silence_detection",
            "transcription_task": "transcription",
            "layout_analysis_task": "layout_analysis",
            "content_analysis_task": "content_analysis",
            "segment_extraction_task": "segmentation",
            "video_compilation_task": "compilation",
        }
        task_name = self.name.split(".")[-1] if "." in self.name else self.name
        return task_to_stage.get(task_name, task_name)

    def _get_agent_name(self) -> str | None:
        """extract agent name from task name.

        returns None for wrapper/orchestrator tasks that should not be logged.
        """
        # wrapper tasks that should NOT create processing logs
        wrapper_tasks = {
            "process_video_optimized",
            "process_audio_only_pipeline",
            "process_vision_pipeline",
        }

        task_to_agent = {
            "silence_detection_task": "SilenceDetector",
            "transcription_task": "TranscriptAgent",
            "layout_analysis_task": "LayoutDetector",
            "content_analysis_task": "ContentAnalyzer",
            "segment_extraction_task": "SegmentExtractor",
            "video_compilation_task": "VideoCompiler",
        }
        task_name = self.name.split(".")[-1] if "." in self.name else self.name

        # don't log wrapper tasks
        if task_name in wrapper_tasks:
            return None

        return task_to_agent.get(task_name)

    def _create_processing_log(
        self,
        job_id: str,
        stage: str,
        agent_name: str | None,
        status: str,
        duration_seconds: float | None = None,
        error_message: str | None = None,
    ) -> None:
        """create processing log entry in database (idempotent - prevents duplicates)."""
        import uuid

        db = get_task_db()
        try:
            from app.models.database import ProcessingLog

            # check if log already exists (prevent duplicates from retries/re-runs)
            existing_log = (
                db.query(ProcessingLog)
                .filter(
                    ProcessingLog.job_id == job_id,
                    ProcessingLog.stage == stage,
                    ProcessingLog.agent_name == agent_name,
                    ProcessingLog.status == "completed",
                )
                .first()
            )

            if existing_log:
                logger.info(
                    "Processing log already exists, skipping duplicate",
                    extra={
                        "job_id": job_id,
                        "stage": stage,
                        "agent_name": agent_name,
                        "existing_duration": existing_log.duration_seconds,
                    },
                )
                return

            log = ProcessingLog(
                log_id=str(uuid.uuid4()),
                job_id=job_id,
                stage=stage,
                agent_name=agent_name,
                status=status,
                duration_seconds=duration_seconds,
                error_message=error_message,
                created_at=datetime.now(timezone.utc),
            )
            db.add(log)
            db.commit()

            logger.info(
                "Processing log created",
                extra={
                    "job_id": job_id,
                    "stage": stage,
                    "agent_name": agent_name,
                    "duration": duration_seconds,
                },
            )
        except Exception as e:
            logger.error(
                "Failed to create processing log",
                exc_info=e,
                extra={"job_id": job_id, "stage": stage},
            )
            db.rollback()
        finally:
            db.close()

    def update_job_progress(
        self,
        job_id: str,
        stage: str,
        percent: float,
        message: str,
        status: str = "running",
        eta_seconds: int | None = None,
    ) -> None:
        """update job progress in database and send WebSocket update."""
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

            # Send WebSocket update to connected clients
            send_progress_sync(job_id, stage, percent, message, eta_seconds)

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
        """mark job as failed with error message and send WebSocket update."""
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

            # Send WebSocket error notification
            send_error_sync(job_id, error_message)

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
        """mark job as completed and send WebSocket update."""
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

            # Send WebSocket completion notification
            send_completion_sync(job_id)

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
            task_duration_seconds.labels(task_name=self.name, status="failure").observe(duration)

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


def download_audio_from_s3_to_temp(s3_key: str, job_id: str) -> str:
    """download audio only from S3 video file.

    Args:
        s3_key: S3 object key
        job_id: job identifier (for temp dir naming)

    Returns:
        path to downloaded audio file (WAV format)

    Raises:
        Exception: if download fails
    """
    temp_dir = f"/tmp/lecture_extractor_{job_id}"
    os.makedirs(temp_dir, exist_ok=True)

    temp_path = os.path.join(temp_dir, "audio.wav")

    logger.info(
        "Downloading audio from S3 (audio-only pipeline)",
        extra={"s3_key": s3_key, "temp_path": temp_path, "job_id": job_id},
    )

    # generate presigned URL
    presigned_url = s3_service.generate_presigned_url(s3_key)

    # extract audio using ffmpeg
    ffmpeg_cmd = [
        "ffmpeg",
        "-i",
        presigned_url,  # Input from S3 URL
        "-vn",  # No video
        "-acodec",
        "pcm_s16le",  # PCM audio codec
        "-ar",
        "44100",  # Sample rate
        "-ac",
        "2",  # Stereo
        "-y",  # Overwrite
        temp_path,
    ]

    subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True)

    file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
    logger.info(
        "Audio downloaded successfully",
        extra={"s3_key": s3_key, "file_size_mb": round(file_size_mb, 2), "job_id": job_id},
    )

    return temp_path


def download_video_from_s3_to_temp(s3_key: str, job_id: str, transcode_720p: bool = True) -> str:
    """download video from S3 and optionally transcode to 720p.

    Args:
        s3_key: S3 object key
        job_id: job identifier (for temp dir naming)
        transcode_720p: if True, transcode to 720p during download (default: True)

    Returns:
        path to downloaded (and transcoded) video file

    Raises:
        Exception: if download fails
    """
    temp_dir = f"/tmp/lecture_extractor_{job_id}"
    os.makedirs(temp_dir, exist_ok=True)

    temp_path = os.path.join(temp_dir, "video_720p.mp4" if transcode_720p else "original.mp4")

    logger.info(
        "Downloading video from S3 (optimized pipeline)",
        extra={
            "s3_key": s3_key,
            "temp_path": temp_path,
            "job_id": job_id,
            "transcode_720p": transcode_720p,
        },
    )

    # generate presigned URL
    presigned_url = s3_service.generate_presigned_url(s3_key)

    if transcode_720p:
        # Stream from S3 and transcode to 720p in one pass (much faster!)
        ffmpeg_cmd = [
            "ffmpeg",
            "-i",
            presigned_url,  # Input from S3 URL
            "-vf",
            "scale=-2:720",  # Scale to 720p (maintain aspect ratio)
            "-c:v",
            "libx264",  # H.264 codec
            "-preset",
            "fast",  # Fast encoding
            "-crf",
            "23",  # Quality (23 = good balance)
            "-c:a",
            "aac",  # AAC audio
            "-b:a",
            "128k",  # 128kbps audio
            "-movflags",
            "+faststart",  # Web-optimized
            "-y",  # Overwrite
            temp_path,
        ]

        subprocess.run(ffmpeg_cmd, capture_output=True, text=True, check=True)

        file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
        logger.info(
            "Video downloaded and transcoded to 720p",
            extra={"s3_key": s3_key, "file_size_mb": round(file_size_mb, 2), "job_id": job_id},
        )
    else:
        # download without transcoding
        response = requests.get(presigned_url, stream=True, timeout=300)
        response.raise_for_status()

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        file_size_mb = os.path.getsize(temp_path) / (1024 * 1024)
        logger.info(
            "Video downloaded successfully",
            extra={"s3_key": s3_key, "file_size_mb": round(file_size_mb, 2), "job_id": job_id},
        )

    return temp_path


@celery_app.task(
    bind=True,
    base=BaseProcessingTask,
    name="pipeline.tasks.process_video_optimized",
)
def process_video_optimized(self, job_id: str) -> dict[str, Any]:
    """router for optimized pipelines based on processing mode.

    reads processing configuration and routes to appropriate pipeline:
    - audio mode: process_audio_only_pipeline
    - vision mode: process_vision_pipeline

    Args:
        job_id: job identifier

    Returns:
        result dictionary with job completion info

    Raises:
        Exception: if any stage fails
    """
    logger.info("Starting pipeline router", extra={"job_id": job_id})

    try:
        # get processing configuration
        config = get_processing_config(job_id)
        processing_mode = config.get("processing_mode", "vision")

        logger.info(
            "Routing to pipeline",
            extra={"job_id": job_id, "processing_mode": processing_mode, "config": config},
        )

        # route to appropriate pipeline
        if processing_mode == "audio":
            return process_audio_only_pipeline(self, job_id, config)
        else:
            return process_vision_pipeline(self, job_id, config)

    except Exception as e:
        logger.error(
            "Pipeline router failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Pipeline routing failed: {e!s}")
        raise


def process_audio_only_pipeline(self, job_id: str, config: dict[str, Any]) -> dict[str, Any]:
    """audio-only optimized pipeline with parallel downloads.

    pipeline strategy:
    1. parallel downloads:
       - download audio-only → silence + transcript + content + segment
       - download full video (in background)
    2. video compilation uses the downloaded video

    Args:
        self: task instance
        job_id: job identifier
        config: processing configuration

    Returns:
        result dictionary with job completion info

    Raises:
        Exception: if any stage fails
    """
    import concurrent.futures

    start_time = time.time()
    audio_path = None
    video_path = None

    logger.info("Starting AUDIO-ONLY pipeline", extra={"job_id": job_id, "config": config})

    try:
        # update status
        self.update_job_progress(
            job_id=job_id,
            stage="initializing",
            percent=5.0,
            message="Starting audio-only pipeline (parallel downloads)",
            status="running",
        )

        s3_key = get_job_s3_key(job_id)

        # parallel download: audio + video
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            audio_future = executor.submit(download_audio_from_s3_to_temp, s3_key, job_id)
            video_future = executor.submit(download_video_from_s3_to_temp, s3_key, job_id)

            # process audio path first (fast)
            audio_path = audio_future.result()

            # audio processing pipeline (while video downloads in background)

            # step 1: silence detection on audio
            self.update_job_progress(
                job_id, "silence_detection", 10.0, "Detecting silence regions (audio-only mode)"
            )
            logger.info("Step 1/5: Silence detection (audio-only)", extra={"job_id": job_id})

            # log start
            create_processing_log_entry(
                job_id=job_id,
                stage="silence_detection",
                agent_name="SilenceDetector",
                status="started",
            )

            silence_result = detect_silence(
                s3_key=None,
                job_id=job_id,
                local_video_path=audio_path,  # use audio file
            )

            # log completion
            create_processing_log_entry(
                job_id=job_id,
                stage="silence_detection",
                agent_name="SilenceDetector",
                status="completed",
            )

            logger.info(
                "Silence detection complete",
                extra={
                    "job_id": job_id,
                    "silence_count": silence_result.get("silence_count", 0),
                },
            )

            # step 2: transcription
            self.update_job_progress(
                job_id, "transcription", 20.0, "Transcribing audio (parallel chunks)"
            )
            logger.info("Step 2/5: Transcription", extra={"job_id": job_id})

            # log start
            create_processing_log_entry(
                job_id=job_id,
                stage="transcription",
                agent_name="TranscriptAgent",
                status="started",
            )

            # fetch API key early for transcription and content analysis
            try:
                api_key = get_user_api_key(job_id)
            except Exception as e:
                logger.error("Failed to get API key", exc_info=e, extra={"job_id": job_id})
                raise

            transcript_result = generate_transcript(
                s3_key=None,
                job_id=job_id,
                local_video_path=audio_path,
                api_key=api_key,
            )

            # log completion
            create_processing_log_entry(
                job_id=job_id,
                stage="transcription",
                agent_name="TranscriptAgent",
                status="completed",
            )

            logger.info(
                "Transcription complete",
                extra={
                    "job_id": job_id,
                    "segments": transcript_result.get("total_segments", 0),
                },
            )

            # step 3: content analysis (uses custom prompt if provided)
            self.update_job_progress(
                job_id,
                "content_analysis",
                40.0,
                "Analyzing content with AI (audio-only mode)",
            )
            logger.info("Step 3/5: Content analysis", extra={"job_id": job_id})

            # log start
            create_processing_log_entry(
                job_id=job_id,
                stage="content_analysis",
                agent_name="ContentAnalyzer",
                status="started",
            )

            content_result = analyze_content({}, job_id, config)
            # API key already fetched above

            content_result = analyze_content({}, job_id, api_key=api_key)

            # log completion
            create_processing_log_entry(
                job_id=job_id,
                stage="content_analysis",
                agent_name="ContentAnalyzer",
                status="completed",
            )

            logger.info(
                "Content analysis complete",
                extra={
                    "job_id": job_id,
                    "segments_created": content_result.get("segments_created", 0),
                },
            )

            # step 4: segment extraction
            self.update_job_progress(job_id, "segmentation", 60.0, "Extracting highlight segments")
            logger.info("Step 4/5: Segment extraction", extra={"job_id": job_id})

            # log start
            create_processing_log_entry(
                job_id=job_id,
                stage="segmentation",
                agent_name="SegmentExtractor",
                status="started",
            )

            segment_result = extract_segments({}, {}, {}, job_id)

            # log completion
            create_processing_log_entry(
                job_id=job_id,
                stage="segmentation",
                agent_name="SegmentExtractor",
                status="completed",
            )

            logger.info(
                "Segment extraction complete",
                extra={
                    "job_id": job_id,
                    "clips_created": segment_result.get("clips_created", 0),
                },
            )

            # wait for video download to complete
            video_path = video_future.result()

        # step 5: video compilation
        self.update_job_progress(job_id, "compilation", 80.0, "Compiling final clips")
        logger.info("Step 5/5: Video compilation", extra={"job_id": job_id})

        # log start
        create_processing_log_entry(
            job_id=job_id,
            stage="compilation",
            agent_name="VideoCompiler",
            status="started",
        )

        db = get_task_db()
        try:
            compiler = VideoCompiler(db)
            compilation_result = compiler.compile_clips(
                job_id=job_id,
                local_video_path=video_path,
            )
        finally:
            db.close()

        # log completion
        create_processing_log_entry(
            job_id=job_id,
            stage="compilation",
            agent_name="VideoCompiler",
            status="completed",
        )

        logger.info(
            "Video compilation complete",
            extra={
                "job_id": job_id,
                "clips_compiled": compilation_result.get("clips_compiled", 0),
            },
        )

        # mark complete
        self.mark_job_completed(job_id)

        processing_time = time.time() - start_time

        logger.info(
            "AUDIO-ONLY pipeline completed successfully",
            extra={
                "job_id": job_id,
                "total_duration_seconds": round(processing_time, 2),
                "pipeline_type": "audio_only",
            },
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "pipeline": "audio_only",
            "processing_time_seconds": round(processing_time, 2),
        }

    except Exception as e:
        logger.error(
            "AUDIO-ONLY pipeline failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Pipeline failed: {e!s}")
        raise

    finally:
        # cleanup temp files
        for path in [audio_path, video_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                    logger.info("Cleaned up temp file", extra={"job_id": job_id, "path": path})
                except Exception as cleanup_error:
                    logger.warning(
                        "Failed to cleanup temp file",
                        exc_info=cleanup_error,
                        extra={"job_id": job_id, "path": path},
                    )

        # cleanup temp directory
        temp_dir = f"/tmp/lecture_extractor_{job_id}"
        if os.path.exists(temp_dir) and os.path.isdir(temp_dir):
            try:
                os.rmdir(temp_dir)
                logger.info("Cleaned up temp directory", extra={"job_id": job_id, "dir": temp_dir})
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to cleanup temp directory",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id},
                )


def process_vision_pipeline(self, job_id: str, config: dict[str, Any]) -> dict[str, Any]:
    """vision pipeline with parallel audio and video processing.

    pipeline strategy:
    1. parallel track processing:
       - audio track: download audio → silence + transcript
       - video track: download video → layout analysis
    2. content analysis (uses both transcript + layout if available)
    3. segment extraction + video compilation

    Args:
        self: task instance
        job_id: job identifier
        config: processing configuration

    Returns:
        result dictionary with job completion info

    Raises:
        Exception: if any stage fails
    """
    import concurrent.futures

    start_time = time.time()
    audio_path = None
    video_path = None

    logger.info("Starting VISION pipeline", extra={"job_id": job_id, "config": config})

    try:
        # update status
        self.update_job_progress(
            job_id=job_id,
            stage="initializing",
            percent=5.0,
            message="Starting vision pipeline (parallel audio+video processing)",
            status="running",
        )

        s3_key = get_job_s3_key(job_id)

        # fetch API key early for transcription and content analysis
        try:
            api_key = get_user_api_key(job_id)
        except Exception as e:
            logger.error("Failed to get API key", exc_info=e, extra={"job_id": job_id})
            raise

        # parallel download and processing
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            # audio track processing
            def audio_track():
                nonlocal audio_path
                audio_path = download_audio_from_s3_to_temp(s3_key, job_id)

                # silence detection
                self.update_job_progress(
                    job_id, "silence_detection", 10.0, "Detecting silence regions"
                )
                logger.info("Audio track: Silence detection", extra={"job_id": job_id})

                # log start
                create_processing_log_entry(
                    job_id=job_id,
                    stage="silence_detection",
                    agent_name="SilenceDetector",
                    status="started",
                )

                silence_result = detect_silence(
                    s3_key=None,
                    job_id=job_id,
                    local_video_path=audio_path,
                )

                # log completion
                create_processing_log_entry(
                    job_id=job_id,
                    stage="silence_detection",
                    agent_name="SilenceDetector",
                    status="completed",
                )

                # transcription
                self.update_job_progress(
                    job_id, "transcription", 20.0, "Transcribing audio (parallel chunks)"
                )
                logger.info("Audio track: Transcription", extra={"job_id": job_id})

                # log start
                create_processing_log_entry(
                    job_id=job_id,
                    stage="transcription",
                    agent_name="TranscriptAgent",
                    status="started",
                )

                transcript_result = generate_transcript(
                    s3_key=None,
                    job_id=job_id,
                    local_video_path=audio_path,
                    api_key=api_key,
                )

                # log completion
                create_processing_log_entry(
                    job_id=job_id,
                    stage="transcription",
                    agent_name="TranscriptAgent",
                    status="completed",
                )

                return {
                    "silence": silence_result,
                    "transcript": transcript_result,
                }

            # video track processing
            def video_track():
                nonlocal video_path
                video_path = download_video_from_s3_to_temp(s3_key, job_id)

                # layout analysis
                self.update_job_progress(job_id, "layout_analysis", 15.0, "Analyzing video layout")
                logger.info("Video track: Layout analysis", extra={"job_id": job_id})

                # log start
                create_processing_log_entry(
                    job_id=job_id,
                    stage="layout_analysis",
                    agent_name="LayoutDetector",
                    status="started",
                )

                layout_result = detect_layout(
                    s3_key=None,  # Video already downloaded locally
                    job_id=job_id,
                    local_video_path=video_path,  # Pass local video path
                )

                # log completion
                create_processing_log_entry(
                    job_id=job_id,
                    stage="layout_analysis",
                    agent_name="LayoutDetector",
                    status="completed",
                )

                return {
                    "layout": layout_result,
                }

            # execute both tracks in parallel
            audio_future = executor.submit(audio_track)
            video_future = executor.submit(video_track)

            # wait for both to complete
            audio_results = audio_future.result()
            _video_results = video_future.result()  # layout saved to DB, not needed here

        logger.info(
            "Parallel processing complete",
            extra={
                "job_id": job_id,
                "silence_count": audio_results["silence"].get("silence_count", 0),
                "transcript_segments": audio_results["transcript"].get("total_segments", 0),
            },
        )

        # step 3: content analysis (combines audio + video data)
        self.update_job_progress(
            job_id,
            "content_analysis",
            40.0,
            "Analyzing content with AI (vision mode)",
        )
        logger.info("Step 3/5: Content analysis (vision mode)", extra={"job_id": job_id})

        # log start
        create_processing_log_entry(
            job_id=job_id,
            stage="content_analysis",
            agent_name="ContentAnalyzer",
            status="started",
        )

        # API key already fetched above

        content_result = analyze_content({}, job_id, api_key=api_key, config=config)

        # log completion
        create_processing_log_entry(
            job_id=job_id,
            stage="content_analysis",
            agent_name="ContentAnalyzer",
            status="completed",
        )

        logger.info(
            "Content analysis complete",
            extra={
                "job_id": job_id,
                "segments_created": content_result.get("segments_created", 0),
            },
        )

        # step 4: segment extraction
        self.update_job_progress(job_id, "segmentation", 60.0, "Extracting highlight segments")
        logger.info("Step 4/5: Segment extraction", extra={"job_id": job_id})

        # log start
        create_processing_log_entry(
            job_id=job_id,
            stage="segmentation",
            agent_name="SegmentExtractor",
            status="started",
        )

        segment_result = extract_segments({}, {}, {}, job_id)

        # log completion
        create_processing_log_entry(
            job_id=job_id,
            stage="segmentation",
            agent_name="SegmentExtractor",
            status="completed",
        )

        logger.info(
            "Segment extraction complete",
            extra={
                "job_id": job_id,
                "clips_created": segment_result.get("clips_created", 0),
            },
        )

        # step 5: video compilation
        self.update_job_progress(job_id, "compilation", 80.0, "Compiling final clips")
        logger.info("Step 5/5: Video compilation", extra={"job_id": job_id})

        # log start
        create_processing_log_entry(
            job_id=job_id,
            stage="compilation",
            agent_name="VideoCompiler",
            status="started",
        )

        db = get_task_db()
        try:
            compiler = VideoCompiler(db)
            compilation_result = compiler.compile_clips(
                job_id=job_id,
                local_video_path=video_path,
            )
        finally:
            db.close()

        # log completion
        create_processing_log_entry(
            job_id=job_id,
            stage="compilation",
            agent_name="VideoCompiler",
            status="completed",
        )

        logger.info(
            "Video compilation complete",
            extra={
                "job_id": job_id,
                "clips_compiled": compilation_result.get("clips_compiled", 0),
            },
        )

        # mark complete
        self.mark_job_completed(job_id)

        processing_time = time.time() - start_time

        logger.info(
            "VISION pipeline completed successfully",
            extra={
                "job_id": job_id,
                "total_duration_seconds": round(processing_time, 2),
                "pipeline_type": "vision",
            },
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "pipeline": "vision",
            "processing_time_seconds": round(processing_time, 2),
        }

    except Exception as e:
        logger.error(
            "VISION pipeline failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        self.mark_job_failed(job_id, f"Pipeline failed: {e!s}")
        raise

    finally:
        # cleanup temp files
        for path in [audio_path, video_path]:
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                    logger.info("Cleaned up temp file", extra={"job_id": job_id, "path": path})
                except Exception as cleanup_error:
                    logger.warning(
                        "Failed to cleanup temp file",
                        exc_info=cleanup_error,
                        extra={"job_id": job_id, "path": path},
                    )

        # cleanup temp directory
        temp_dir = f"/tmp/lecture_extractor_{job_id}"
        if os.path.exists(temp_dir) and os.path.isdir(temp_dir):
            try:
                os.rmdir(temp_dir)
                logger.info("Cleaned up temp directory", extra={"job_id": job_id, "dir": temp_dir})
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to cleanup temp directory",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id},
                )


# individual agent tasks (used by both pipelines)


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

        # get rate_limit_mode from job metadata
        db = get_task_db()
        try:
            job = db.query(Job).filter(Job.job_id == job_id).first()
            rate_limit_mode = True  # default to safe mode
            if job and job.extra_metadata:
                rate_limit_mode = job.extra_metadata.get("rate_limit_mode", True)
        finally:
            db.close()

        logger.info(
            "Starting transcription after silence detection",
            extra={
                "job_id": job_id,
                "s3_key": s3_key,
                "silence_regions_detected": silence_result.get("silence_count", 0),
                "rate_limit_mode": rate_limit_mode,
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
        result = generate_transcript(s3_key, job_id, rate_limit_mode=rate_limit_mode)

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

    # fetch API key
    try:
        api_key = get_user_api_key(job_id)
    except Exception as e:
        logger.error("Failed to get API key", exc_info=e, extra={"job_id": job_id})
        self.mark_job_failed(job_id, f"API Key Error: {e!s}")
        raise

    # agent queries database directly, pass empty dict for legacy signature
    result = analyze_content({}, job_id, api_key=api_key)

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
    """segment extraction agent task (step 3 of 3).

    extracts optimal highlight segments based on content importance scores
    and optimizes boundaries using silence detection data.

    note: agent queries database directly for all required data
    (content segments, silence regions, transcripts, layout analysis).
    """
    logger.info("starting segment extraction", extra={"job_id": job_id})

    # update progress
    self.update_job_progress(
        job_id=job_id,
        stage="segment_extraction",
        percent=65.0,
        message="extracting highlight segments with optimized boundaries",
        status="running",
        eta_seconds=10,
    )

    # agent queries database directly, pass empty dicts for legacy signature
    result = extract_segments({}, {}, {}, job_id)

    # update progress after completion
    self.update_job_progress(
        job_id=job_id,
        stage="segment_extraction",
        percent=90.0,
        message="segment extraction completed",
        status="running",
    )

    logger.info(
        "segment extraction completed",
        extra={
            "job_id": job_id,
            "segments_created": result.get("segments_created", 0),
            "processing_time": result.get("processing_time_seconds", 0),
        },
    )

    return result


@celery_app.task(bind=True, base=BaseProcessingTask)
def video_compilation_task(self, job_id: str) -> dict[str, Any]:
    """video compilation agent task.

    compiles video clips from content segments with transitions, multiple formats,
    subtitles, and thumbnails.

    args:
        job_id: unique job identifier

    returns:
        dict with compilation results including generated clips
    """
    logger.info(
        "Starting video compilation",
        extra={"job_id": job_id},
    )

    # update progress
    self.update_job_progress(
        job_id=job_id,
        stage="compilation",
        percent=85.0,
        message="compiling final video clips with transitions",
        status="running",
        eta_seconds=120,
    )

    # get database session and compile clips
    db = get_task_db()
    try:
        result = compile_clips(job_id, db)

        # update progress after completion
        self.update_job_progress(
            job_id=job_id,
            stage="compilation",
            percent=100.0,
            message=f"compilation completed ({result.get('clips_generated', 0)} clips)",
            status="running",
        )

        logger.info(
            "video compilation completed",
            extra={
                "job_id": job_id,
                "clips_generated": result.get("clips_generated", 0),
            },
        )

        # mark job as completed (final step)
        self.mark_job_completed(job_id)

        logger.info("processing pipeline completed successfully", extra={"job_id": job_id})

        return result
    finally:
        db.close()


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
