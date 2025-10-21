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

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

# silence detection parameters
SILENCE_THRESH_DBFS = -40  # decibels relative to full scale
MIN_SILENCE_LEN_MS = 500  # minimum silence duration in milliseconds


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(
        autocommit=False, autoflush=False, bind=engine)
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


def analyze_audio_silence(video_path: str, job_id: str) -> list[dict]:
    """analyze audio track for silence regions.

    Args:
        video_path: path to video file
        job_id: job identifier for logging

    Returns:
        list of silence region dictionaries

    Raises:
        Exception: if audio analysis fails
    """
    try:
        logger.info(
            "Extracting and analyzing audio",
            extra={"job_id": job_id, "video_path": video_path},
        )

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
            "Audio loaded",
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

        logger.info(
            "Silence detection completed",
            extra={"job_id": job_id,
                   "silence_regions_found": len(silence_ranges)},
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

    except Exception as e:
        logger.error(
            "Failed to analyze audio silence",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise


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


def detect_silence(video_path: str, job_id: str) -> dict:
    """detect silence in video file.

    this function downloads the video from s3, analyzes the audio track
    for silence regions, stores the results in the database, and returns
    a summary of the detected silence.

    Args:
        video_path: s3 key for the video file (not local path)
        job_id: job identifier

    Returns:
        result dictionary with silence regions and statistics

    Raises:
        Exception: if any step of the process fails
    """
    start_time = time.time()
    temp_video_path = None

    logger.info(
        "Silence detection started",
        extra={"job_id": job_id, "s3_key": video_path},
    )

    try:
        # download video from s3
        temp_video_path = download_video_from_s3(video_path, job_id)

        # analyze audio for silence
        silence_regions = analyze_audio_silence(temp_video_path, job_id)

        # store results in database
        store_silence_regions(silence_regions, job_id)

        # calculate statistics
        total_silence_duration = sum(
            region["duration"] for region in silence_regions)
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
        # clean up temporary file
        if temp_video_path and os.path.exists(temp_video_path):
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
