"""Silence detector agent for audio/video silence analysis."""

import os
import tempfile
import time
import uuid
from pathlib import Path

import requests
from pydub import AudioSegment
from pydub.silence import detect_silence as pydub_detect_silence
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from agents.utils.ffmpeg_helper import FFmpegHelper
from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

# silence detection parameters
SILENCE_THRESH_DBFS = -35  # decibels relative to full scale
MIN_SILENCE_LEN_MS = 500  # minimum silence duration in milliseconds
MIN_SILENCE_LEN_SEC = MIN_SILENCE_LEN_MS / 1000.0  # convert to seconds for ffmpeg


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def download_video_from_s3(s3_key: str, job_id: str) -> str:
    """download video file from s3 to temporary location.

    Args:
        s3_key: s3 object key for the video
        job_id: job identifier for logging

    Returns:
        path to downloaded temporary file

    Raises:
        Exception: if download fails
    """
    try:
        # generate pre-signed url for download
        presigned_url = s3_service.generate_presigned_url(s3_key)

        # create temporary file
        suffix = Path(s3_key).suffix or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name

        logger.info(
            "Downloading video from S3",
            extra={"job_id": job_id, "s3_key": s3_key, "temp_path": temp_path},
        )

        # download file
        response = requests.get(presigned_url, stream=True, timeout=300)
        response.raise_for_status()

        with open(temp_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        logger.info(
            "Video downloaded successfully",
            extra={"job_id": job_id, "file_size": os.path.getsize(temp_path)},
        )

        return temp_path

    except Exception as e:
        logger.error(
            "Failed to download video from S3",
            exc_info=e,
            extra={"job_id": job_id, "s3_key": s3_key},
        )
        raise


def analyze_audio_silence(video_path: str, job_id: str, use_ffmpeg: bool = True) -> list[dict]:
    """analyze audio track for silence regions.

    Uses FFmpeg-based detection by default (50-100x faster), with pydub as fallback.

    Args:
        video_path: path to video file
        job_id: job identifier for logging
        use_ffmpeg: whether to use FFmpeg-based detection (default: True)

    Returns:
        list of silence region dictionaries

    Raises:
        Exception: if audio analysis fails
    """
    detection_start_time = time.time()

    try:
        logger.info(
            "Starting silence detection",
            extra={
                "job_id": job_id,
                "video_path": video_path,
                "method": "ffmpeg" if use_ffmpeg else "pydub",
            },
        )

        # try ffmpeg-based detection first (much faster)
        if use_ffmpeg:
            try:
                silence_regions = _detect_silence_ffmpeg(video_path, job_id)
                detection_time = time.time() - detection_start_time

                logger.info(
                    "FFmpeg silence detection completed",
                    extra={
                        "job_id": job_id,
                        "silence_regions_found": len(silence_regions),
                        "detection_time_seconds": round(detection_time, 2),
                        "method": "ffmpeg",
                    },
                )
                return silence_regions

            except Exception as ffmpeg_error:
                logger.warning(
                    "FFmpeg silence detection failed, falling back to pydub",
                    exc_info=ffmpeg_error,
                    extra={"job_id": job_id},
                )
                # fall through to pydub fallback

        # fallback to pydub-based detection
        silence_regions = _detect_silence_pydub(video_path, job_id)
        detection_time = time.time() - detection_start_time

        logger.info(
            "Pydub silence detection completed",
            extra={
                "job_id": job_id,
                "silence_regions_found": len(silence_regions),
                "detection_time_seconds": round(detection_time, 2),
                "method": "pydub",
            },
        )

        return silence_regions

    except Exception as e:
        logger.error(
            "Failed to analyze audio silence",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise


def _detect_silence_ffmpeg(video_path: str, job_id: str) -> list[dict]:
    """detect silence using FFmpeg silencedetect filter.

    Args:
        video_path: path to video file
        job_id: job identifier for logging

    Returns:
        list of silence region dictionaries

    Raises:
        Exception: if FFmpeg detection fails
    """
    logger.info(
        "Using FFmpeg-based silence detection (optimized)",
        extra={"job_id": job_id, "video_path": video_path},
    )

    ffmpeg_helper = FFmpegHelper()

    # use ffmpeg to detect silence (much faster than pydub)
    raw_silence_regions = ffmpeg_helper.detect_silence(
        video_path=Path(video_path),
        silence_threshold_db=SILENCE_THRESH_DBFS,
        min_silence_duration=MIN_SILENCE_LEN_SEC,
    )

    # add metadata to match expected format
    silence_regions = []
    for region in raw_silence_regions:
        silence_regions.append(
            {
                "start_time": region["start_time"],
                "end_time": region["end_time"],
                "duration": region["duration"],
                "silence_type": "audio_silence",
                "amplitude_threshold": SILENCE_THRESH_DBFS,
            }
        )

    return silence_regions


def _detect_silence_pydub(video_path: str, job_id: str) -> list[dict]:
    """detect silence using pydub (legacy fallback).

    Args:
        video_path: path to video file
        job_id: job identifier for logging

    Returns:
        list of silence region dictionaries

    Raises:
        Exception: if pydub detection fails
    """
    # load audio from video using pydub
    try:
        audio = AudioSegment.from_file(video_path)
    except IndexError as e:
        # this can happen if video has no audio track
        logger.warning(
            "No audio track found in video file",
            exc_info=e,
            extra={"job_id": job_id, "video_path": video_path},
        )
        raise ValueError(
            f"Video file '{video_path}' has no audio track or audio stream could not be detected"
        ) from e

    logger.info(
        "Audio loaded via pydub",
        extra={
            "job_id": job_id,
            "duration_ms": len(audio),
            "channels": audio.channels,
            "frame_rate": audio.frame_rate,
        },
    )

    # detect silence regions
    # pydub_detect_silence returns list of [start_ms, end_ms]
    silence_ranges = pydub_detect_silence(
        audio,
        min_silence_len=MIN_SILENCE_LEN_MS,
        silence_thresh=SILENCE_THRESH_DBFS,
    )

    # convert to standardized format (seconds)
    silence_regions = []
    for start_ms, end_ms in silence_ranges:
        start_time = start_ms / 1000.0
        end_time = end_ms / 1000.0
        duration = end_time - start_time

        silence_regions.append(
            {
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "silence_type": "audio_silence",
                "amplitude_threshold": SILENCE_THRESH_DBFS,
            }
        )

    return silence_regions


def store_silence_regions(silence_regions: list[dict], job_id: str) -> None:
    """store silence regions in database.

    Args:
        silence_regions: list of silence region dictionaries
        job_id: job identifier

    Raises:
        Exception: if database operation fails
    """
    if not silence_regions:
        logger.info("No silence regions to store", extra={"job_id": job_id})
        return

    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # add region_id and job_id to each region
        for region in silence_regions:
            region["region_id"] = str(uuid.uuid4())
            region["job_id"] = job_id

        # bulk create silence regions
        db_service.silence_regions.bulk_create(silence_regions)
        db.commit()

        logger.info(
            "Silence regions stored in database",
            extra={"job_id": job_id, "count": len(silence_regions)},
        )

    except Exception as e:
        logger.error(
            "Failed to store silence regions",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()


def detect_silence(s3_key: str | None, job_id: str, local_video_path: str | None = None) -> dict:
    """detect silence in video file.

    this function either uses a local video file or downloads from s3,
    analyzes the audio track for silence regions, stores the results in
    the database, and returns a summary of the detected silence.

    Args:
        s3_key: s3 key for the video file (optional if local_video_path provided)
        job_id: job identifier
        local_video_path: optional local video file path (skips s3 download)

    Returns:
        result dictionary with silence regions and statistics

    Raises:
        Exception: if any step of the process fails
    """
    start_time = time.time()
    temp_video_path = None
    cleanup_required = False

    logger.info(
        "Silence detection started",
        extra={
            "job_id": job_id,
            "s3_key": s3_key,
            "using_local_path": local_video_path is not None,
        },
    )

    try:
        # use local video path if provided, otherwise download from s3
        if local_video_path and os.path.exists(local_video_path):
            temp_video_path = local_video_path
            cleanup_required = False
            logger.info(
                "Using local video path (optimized pipeline)",
                extra={"job_id": job_id, "local_path": local_video_path},
            )
        else:
            # fallback to s3 download
            if not s3_key:
                raise ValueError("Either local_video_path or s3_key must be provided")
            temp_video_path = download_video_from_s3(s3_key, job_id)
            cleanup_required = True

        # extract video metadata and update job duration if not set
        db = get_db_session()
        try:
            db_service = DatabaseService(db)
            job = db_service.jobs.get_by_id(job_id)

            if job and job.video_duration is None:
                # extract media duration using FFmpeg (works for both audio and video)
                ffmpeg_helper = FFmpegHelper()
                duration = ffmpeg_helper.get_media_duration(Path(temp_video_path))

                db_service.jobs.update_video_metadata(job_id=job_id, video_duration=duration)
                logger.info(
                    "Updated job with media duration",
                    extra={"job_id": job_id, "duration": duration},
                )
        finally:
            db.close()

        # analyze audio for silence
        silence_regions = analyze_audio_silence(temp_video_path, job_id)

        # store results in database
        store_silence_regions(silence_regions, job_id)

        # calculate statistics
        total_silence_duration = sum(region["duration"] for region in silence_regions)
        processing_time = time.time() - start_time

        result = {
            "job_id": job_id,
            "status": "completed",
            "silence_regions": [
                {
                    "start_time": r["start_time"],
                    "end_time": r["end_time"],
                    "duration": r["duration"],
                }
                for r in silence_regions
            ],
            "total_silence_duration": round(total_silence_duration, 2),
            "silence_count": len(silence_regions),
            "processing_time_seconds": round(processing_time, 2),
            "threshold_dbfs": SILENCE_THRESH_DBFS,
            "min_silence_duration_ms": MIN_SILENCE_LEN_MS,
        }

        logger.info(
            "Silence detection completed successfully",
            extra={
                "job_id": job_id,
                "silence_count": len(silence_regions),
                "total_silence_duration": total_silence_duration,
                "processing_time": processing_time,
            },
        )

        return result

    except Exception as e:
        logger.error(
            "Silence detection failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise

    finally:
        # clean up temporary file only if we downloaded it
        if cleanup_required and temp_video_path and os.path.exists(temp_video_path):
            try:
                os.unlink(temp_video_path)
                logger.info(
                    "Cleaned up temporary video file",
                    extra={"job_id": job_id, "temp_path": temp_video_path},
                )
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to clean up temporary file",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id, "temp_path": temp_video_path},
                )
