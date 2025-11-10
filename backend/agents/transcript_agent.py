"""Transcription agent for speech-to-text using Google Gemini API."""

import os
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import google.generativeai as genai
import requests
from pydub import AudioSegment
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

# gemini api configuration for audio transcription
MAX_AUDIO_SIZE_MB = 10  # chunk size for large files
# 5 minutes per chunk (gemini can handle longer audio)
MAX_AUDIO_DURATION_SECONDS = 300
# minimum non-silent audio duration to proceed with transcription
MIN_AUDIO_DURATION_SECONDS = 3


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def validate_gemini_config() -> None:
    """validate gemini api configuration.

    Raises:
        ValueError: if gemini api key is not configured
    """
    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not configured. Please add it to your .env file.")

    # configure gemini
    genai.configure(api_key=settings.gemini_api_key)

    logger.info(
        "Gemini API configured successfully",
        extra={"model": "gemini-2.5-flash"},
    )


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


def get_non_silent_intervals(job_id: str, video_duration: float) -> list[dict]:
    """retrieve silence regions and calculate non-silent intervals.

    Args:
        job_id: job identifier
        video_duration: total video duration in seconds

    Returns:
        list of non-silent interval dictionaries with start_time and end_time

    Raises:
        Exception: if database query fails
    """
    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # retrieve all silence regions for this job, sorted by start_time
        silence_regions = db_service.silence_regions.get_by_job_id(job_id, order_by_time=True)

        logger.info(
            "Retrieved silence regions from database",
            extra={"job_id": job_id, "silence_count": len(silence_regions)},
        )

        # handle edge case: no silence detected (transcribe entire video)
        if not silence_regions:
            logger.info(
                "No silence regions found, will transcribe entire video",
                extra={"job_id": job_id, "video_duration": video_duration},
            )
            return [{"start_time": 0.0, "end_time": video_duration}]

        # calculate non-silent intervals (inverse of silence regions)
        non_silent_intervals = []
        current_time = 0.0

        for region in silence_regions:
            # if there's a gap before this silence region, it's non-silent
            if current_time < region.start_time:
                non_silent_intervals.append(
                    {"start_time": current_time, "end_time": region.start_time}
                )

            # move current time to end of silence region
            current_time = max(current_time, region.end_time)

        # handle remaining time after last silence region
        if current_time < video_duration:
            non_silent_intervals.append({"start_time": current_time, "end_time": video_duration})

        # calculate statistics
        total_non_silent_duration = sum(
            interval["end_time"] - interval["start_time"] for interval in non_silent_intervals
        )
        total_silence_duration = video_duration - total_non_silent_duration

        logger.info(
            "Calculated non-silent intervals",
            extra={
                "job_id": job_id,
                "non_silent_intervals": len(non_silent_intervals),
                "total_non_silent_duration": round(total_non_silent_duration, 2),
                "total_silence_duration": round(total_silence_duration, 2),
                "silence_percentage": (
                    round((total_silence_duration / video_duration * 100), 2)
                    if video_duration > 0
                    else 0
                ),
            },
        )

        # handle edge case: video is entirely silent
        if not non_silent_intervals:
            logger.warning(
                "No non-silent intervals found, entire video is silent",
                extra={"job_id": job_id},
            )
            return []

        return non_silent_intervals

    except Exception as e:
        logger.error(
            "Failed to retrieve silence regions",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise
    finally:
        db.close()


def extract_and_segment_audio(
    video_path: str, non_silent_intervals: list[dict], job_id: str
) -> tuple[str | AudioSegment, list[dict], bool]:
    """extract audio from video and remove silent segments.

    Args:
        video_path: path to video file
        non_silent_intervals: list of non-silent time intervals
        job_id: job identifier for logging

    Returns:
        tuple of (audio_or_path, timestamp_mapping, needs_chunking)
        - audio_or_path: file path if audio is small, AudioSegment if needs chunking
        - timestamp_mapping: list of dicts mapping compressed time to original time
        - needs_chunking: True if audio exceeds size or duration limits

    Raises:
        Exception: if audio extraction fails
        ValueError: if no audio segments to process
    """
    try:
        logger.info(
            "Extracting audio from video",
            extra={"job_id": job_id, "video_path": video_path},
        )

        # extract full audio from video
        try:
            audio = AudioSegment.from_file(video_path)
        except IndexError as e:
            logger.error(
                "No audio track found in video file",
                exc_info=e,
                extra={"job_id": job_id, "video_path": video_path},
            )
            raise ValueError(
                f"Video file '{video_path}' has no audio track or audio stream could not be detected"
            ) from e

        logger.info(
            "Audio extracted",
            extra={
                "job_id": job_id,
                "duration_ms": len(audio),
                "channels": audio.channels,
                "frame_rate": audio.frame_rate,
                "sample_width": audio.sample_width,
            },
        )

        # extract non-silent segments and build timestamp mapping
        audio_segments = []
        timestamp_mapping = []
        compressed_time = 0.0

        for interval in non_silent_intervals:
            start_ms = int(interval["start_time"] * 1000)
            end_ms = int(interval["end_time"] * 1000)

            # extract segment
            segment = audio[start_ms:end_ms]
            audio_segments.append(segment)

            # create timestamp mapping for this segment
            segment_duration = (end_ms - start_ms) / 1000.0
            timestamp_mapping.append(
                {
                    "compressed_start": compressed_time,
                    "compressed_end": compressed_time + segment_duration,
                    "original_start": interval["start_time"],
                    "original_end": interval["end_time"],
                }
            )

            compressed_time += segment_duration

        logger.info(
            "Extracted non-silent audio segments",
            extra={
                "job_id": job_id,
                "segments": len(audio_segments),
                "total_compressed_duration": round(compressed_time, 2),
            },
        )

        # concatenate all non-silent segments
        if not audio_segments:
            raise ValueError("No audio segments to process")

        combined_audio = audio_segments[0]
        for segment in audio_segments[1:]:
            combined_audio += segment

        logger.info(
            "Concatenated audio segments",
            extra={
                "job_id": job_id,
                "final_duration_ms": len(combined_audio),
                "final_duration_s": round(len(combined_audio) / 1000.0, 2),
            },
        )

        # export to mp3 format (whisper compatible)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3", mode="wb") as temp_audio:
            audio_path = temp_audio.name

        combined_audio.export(audio_path, format="mp3", bitrate="128k")

        # check both file size and duration against API limits
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        duration_seconds = len(combined_audio) / 1000.0

        logger.info(
            "Audio exported to temporary file",
            extra={
                "job_id": job_id,
                "audio_path": audio_path,
                "file_size_mb": round(file_size_mb, 2),
                "duration_seconds": round(duration_seconds, 2),
            },
        )

        # check if chunking is needed based on file size OR duration
        needs_chunking = (
            file_size_mb > MAX_AUDIO_SIZE_MB or duration_seconds > MAX_AUDIO_DURATION_SECONDS
        )

        if needs_chunking:
            reason = []
            if file_size_mb > MAX_AUDIO_SIZE_MB:
                reason.append(f"size {file_size_mb:.2f}MB > {MAX_AUDIO_SIZE_MB}MB")
            if duration_seconds > MAX_AUDIO_DURATION_SECONDS:
                reason.append(f"duration {duration_seconds:.1f}s > {MAX_AUDIO_DURATION_SECONDS}s")

            logger.warning(
                "Audio exceeds API limits, will use chunking",
                extra={
                    "job_id": job_id,
                    "reason": " and ".join(reason),
                    "file_size_mb": round(file_size_mb, 2),
                    "duration_seconds": round(duration_seconds, 2),
                },
            )
            # return audio object for chunking, delete the single file
            os.unlink(audio_path)
            return combined_audio, timestamp_mapping, True  # True indicates needs chunking

        # False indicates no chunking needed
        return audio_path, timestamp_mapping, False

    except Exception as e:
        logger.error(
            "Failed to extract and segment audio",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise


def chunk_and_transcribe_audio(
    audio: AudioSegment, job_id: str, chunk_duration_seconds: int = 300
) -> dict:
    """split large audio into chunks and transcribe each chunk.

    Gemini API can handle longer audio segments, so we chunk into
    5-minute segments for better accuracy.

    Args:
        audio: pydub AudioSegment object
        job_id: job identifier for logging
        chunk_duration_seconds: duration of each chunk in seconds (default: 300s/5min)

    Returns:
        combined transcription result dictionary with all segments

    Raises:
        Exception: if any chunk transcription fails
    """

    chunk_duration_ms = chunk_duration_seconds * 1000  # convert to milliseconds
    total_duration_ms = len(audio)
    num_chunks = (
        total_duration_ms + chunk_duration_ms - 1
    ) // chunk_duration_ms  # ceiling division

    logger.info(
        "Starting chunked transcription",
        extra={
            "job_id": job_id,
            "total_duration_s": round(total_duration_ms / 1000.0, 2),
            "chunk_duration_s": chunk_duration_seconds,
            "num_chunks": num_chunks,
        },
    )

    all_segments = []
    full_text = ""
    chunk_files = []

    try:
        # step 1: prepare all chunks (export to temp files)
        chunk_data = []
        for chunk_idx in range(num_chunks):
            start_ms = chunk_idx * chunk_duration_ms
            end_ms = min(start_ms + chunk_duration_ms, total_duration_ms)

            # extract chunk
            chunk = audio[start_ms:end_ms]
            chunk_start_seconds = start_ms / 1000.0

            logger.info(
                f"Preparing chunk {chunk_idx + 1}/{num_chunks}",
                extra={
                    "job_id": job_id,
                    "chunk_idx": chunk_idx,
                    "start_s": round(chunk_start_seconds, 2),
                    "end_s": round(end_ms / 1000.0, 2),
                },
            )

            # export chunk to temporary file
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=f"_chunk_{chunk_idx}.mp3", mode="wb"
            ) as temp_chunk:
                chunk_path = temp_chunk.name

            chunk.export(chunk_path, format="mp3", bitrate="128k")
            chunk_files.append(chunk_path)

            # verify chunk size
            chunk_size_mb = os.path.getsize(chunk_path) / (1024 * 1024)
            logger.info(
                f"Chunk {chunk_idx + 1} exported",
                extra={
                    "job_id": job_id,
                    "chunk_path": chunk_path,
                    "size_mb": round(chunk_size_mb, 2),
                },
            )

            if chunk_size_mb > MAX_AUDIO_SIZE_MB:
                raise ValueError(
                    f"Chunk {chunk_idx + 1} still exceeds size limit ({chunk_size_mb:.2f}MB > {MAX_AUDIO_SIZE_MB}MB). "
                    f"Try reducing chunk_duration_seconds."
                )

            chunk_data.append(
                {
                    "path": chunk_path,
                    "start_seconds": chunk_start_seconds,
                    "index": chunk_idx,
                }
            )

        # step 2: parallel transcription (3 chunks at a time to avoid rate limits)
        logger.info(
            "Starting PARALLEL transcription",
            extra={"job_id": job_id, "max_workers": 3, "num_chunks": num_chunks},
        )

        chunk_results = [None] * num_chunks  # preserve order

        with ThreadPoolExecutor(max_workers=3) as executor:
            # submit all transcription tasks
            future_to_chunk = {
                executor.submit(transcribe_with_gemini, chunk["path"], job_id): chunk
                for chunk in chunk_data
            }

            # collect results as they complete
            for future in as_completed(future_to_chunk):
                chunk = future_to_chunk[future]
                chunk_idx = chunk["index"]

                try:
                    chunk_result = future.result()

                    # adjust timestamps for this chunk's position
                    adjusted_segments = []
                    for segment in chunk_result.get("segments", []):
                        adjusted_segment = segment.copy()
                        adjusted_segment["start"] = round(
                            segment["start"] + chunk["start_seconds"], 2
                        )
                        adjusted_segment["end"] = round(segment["end"] + chunk["start_seconds"], 2)
                        adjusted_segments.append(adjusted_segment)

                    chunk_results[chunk_idx] = {
                        "text": chunk_result.get("text", ""),
                        "segments": adjusted_segments,
                    }

                    logger.info(
                        f"Chunk {chunk_idx + 1}/{num_chunks} transcribed (parallel)",
                        extra={
                            "job_id": job_id,
                            "chunk_segments": len(adjusted_segments),
                        },
                    )

                except Exception as e:
                    logger.error(
                        f"Chunk {chunk_idx + 1} transcription failed",
                        exc_info=e,
                        extra={"job_id": job_id},
                    )
                    raise

        # step 3: merge results in order
        for result in chunk_results:
            if result:
                all_segments.extend(result["segments"])
                full_text += result["text"] + " "

    finally:
        # clean up chunk files
        for chunk_file in chunk_files:
            try:
                if os.path.exists(chunk_file):
                    os.unlink(chunk_file)
                    logger.debug(
                        f"Cleaned up chunk file: {chunk_file}",
                        extra={"job_id": job_id},
                    )
            except Exception as cleanup_error:
                logger.warning(
                    f"Failed to clean up chunk file: {chunk_file}",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id},
                )

    # calculate total duration
    duration = all_segments[-1]["end"] if all_segments else 0.0

    result = {
        "text": full_text.strip(),
        "task": "transcribe",
        "language": "chunked",  # we don't have a single language from chunks
        "duration": duration,
        "segments": all_segments,
    }

    logger.info(
        "Chunked transcription complete",
        extra={
            "job_id": job_id,
            "total_segments": len(all_segments),
            "total_duration": round(duration, 2),
        },
    )

    return result


def transcribe_with_gemini(audio_path: str, job_id: str) -> dict:
    """transcribe audio file using Google Gemini API.

    Args:
        audio_path: path to audio file
        job_id: job identifier for logging

    Returns:
        transcription response dictionary with segments and metadata

    Raises:
        Exception: if transcription fails after all retries
    """
    max_retries = 3
    base_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            logger.info(
                "Calling Gemini API for transcription",
                extra={
                    "job_id": job_id,
                    "attempt": attempt + 1,
                    "max_retries": max_retries,
                },
            )

            # upload audio file to gemini
            audio_file = genai.upload_file(path=audio_path)

            # use gemini 2.5 flash for audio transcription
            model = genai.GenerativeModel("gemini-2.5-flash")

            # prompt for transcription
            prompt = """Transcribe this audio file. Provide the transcription as plain text only,
without any formatting, timestamps, or additional commentary. Just return the spoken words."""

            # generate transcription
            response = model.generate_content([audio_file, prompt])

            # get audio duration using pydub
            audio = AudioSegment.from_file(audio_path)
            duration_seconds = len(audio) / 1000.0

            # extract text from response
            full_text = response.text.strip()

            # create simple segments (split by sentences)
            sentences = []
            current_sentence = ""
            for char in full_text:
                current_sentence += char
                if char in ".!?":
                    sentences.append(current_sentence.strip())
                    current_sentence = ""

            if current_sentence.strip():
                sentences.append(current_sentence.strip())

            # estimate timestamps based on text length
            segments = []
            total_chars = len(full_text)
            current_time = 0.0

            for segment_id, sentence in enumerate(sentences):
                sentence_duration = (
                    (len(sentence) / total_chars) * duration_seconds
                    if total_chars > 0
                    else duration_seconds
                )
                end_time = min(current_time + sentence_duration, duration_seconds)

                segments.append(
                    {
                        "id": segment_id,
                        "start": round(current_time, 2),
                        "end": round(end_time, 2),
                        "text": sentence,
                        "confidence": None,  # gemini doesn't provide confidence scores
                    }
                )

                current_time = end_time

            logger.info(
                "Gemini transcription successful",
                extra={
                    "job_id": job_id,
                    "segments": len(segments),
                    "duration": duration_seconds,
                },
            )

            # delete uploaded file from gemini
            try:
                genai.delete_file(audio_file.name)
            except Exception as delete_error:
                logger.warning(
                    "Failed to delete uploaded audio file from Gemini",
                    exc_info=delete_error,
                    extra={"job_id": job_id},
                )

            return {
                "text": full_text,
                "task": "transcribe",
                "language": "en",  # gemini auto-detects language
                "duration": duration_seconds,
                "segments": segments,
            }

        except Exception as e:
            error_msg = str(e)
            is_rate_limit = (
                "quota" in error_msg.lower() or "rate" in error_msg.lower() or "429" in error_msg
            )

            logger.warning(
                "Gemini API call failed",
                exc_info=e,
                extra={
                    "job_id": job_id,
                    "attempt": attempt + 1,
                    "max_retries": max_retries,
                    "is_rate_limit": is_rate_limit,
                },
            )

            # if this was the last attempt, raise the exception
            if attempt == max_retries - 1:
                logger.error(
                    "Gemini API call failed after all retries",
                    exc_info=e,
                    extra={"job_id": job_id, "max_retries": max_retries},
                )
                raise

            # calculate exponential backoff delay
            delay = base_delay * (2**attempt)
            logger.info(
                f"Retrying in {delay} seconds",
                extra={"job_id": job_id, "delay": delay},
            )
            time.sleep(delay)

    # this should never be reached, but just in case
    raise Exception("Gemini API call failed unexpectedly")


def remap_timestamps_to_original(
    whisper_segments: list[dict], timestamp_mapping: list[dict], job_id: str
) -> list[dict]:
    """remap timestamps from compressed audio to original video time.

    Args:
        whisper_segments: list of segments from Whisper API
        timestamp_mapping: list of mappings from compressed to original time
        job_id: job identifier for logging

    Returns:
        list of segments with original video timestamps

    Raises:
        ValueError: if timestamp mapping is invalid
    """
    if not timestamp_mapping:
        raise ValueError("Timestamp mapping is empty")

    remapped_segments = []

    for segment in whisper_segments:
        compressed_start = segment["start"]
        compressed_end = segment["end"]

        # find which mapping interval this segment belongs to
        original_start = None
        original_end = None

        for mapping in timestamp_mapping:
            map_comp_start = mapping["compressed_start"]
            map_comp_end = mapping["compressed_end"]
            map_orig_start = mapping["original_start"]
            map_orig_end = mapping["original_end"]

            # calculate the duration of the mapping interval
            compressed_duration = map_comp_end - map_comp_start
            original_duration = map_orig_end - map_orig_start

            # check if segment start falls within this mapping interval
            if map_comp_start <= compressed_start <= map_comp_end:
                # calculate proportional position within the interval
                offset_from_start = compressed_start - map_comp_start
                proportion = (
                    offset_from_start / compressed_duration if compressed_duration > 0 else 0
                )
                original_start = map_orig_start + (proportion * original_duration)

            # check if segment end falls within this mapping interval
            if map_comp_start <= compressed_end <= map_comp_end:
                offset_from_start = compressed_end - map_comp_start
                proportion = (
                    offset_from_start / compressed_duration if compressed_duration > 0 else 0
                )
                original_end = map_orig_start + (proportion * original_duration)

            # if we found both timestamps, we can stop searching
            if original_start is not None and original_end is not None:
                break

        # handle edge case: segment spans multiple mapping intervals
        if original_start is None or original_end is None:
            logger.warning(
                "Segment timestamp could not be mapped",
                extra={
                    "job_id": job_id,
                    "segment_id": segment.get("id"),
                    "compressed_start": compressed_start,
                    "compressed_end": compressed_end,
                },
            )
            continue

        # create remapped segment
        remapped_segment = {
            "start_time": round(original_start, 2),
            "end_time": round(original_end, 2),
            "text": segment["text"].strip(),
            "confidence": segment.get("confidence"),
        }

        remapped_segments.append(remapped_segment)

    logger.info(
        "Remapped timestamps to original video time",
        extra={
            "job_id": job_id,
            "input_segments": len(whisper_segments),
            "output_segments": len(remapped_segments),
        },
    )

    return remapped_segments


def store_transcript_segments(segments: list[dict], job_id: str) -> None:
    """store transcript segments in database.

    Args:
        segments: list of transcript segment dictionaries
        job_id: job identifier

    Raises:
        Exception: if database operation fails
    """
    if not segments:
        logger.info("No transcript segments to store", extra={"job_id": job_id})
        return

    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # format segments for database storage
        db_segments = []
        for segment in segments:
            db_segment = {
                "segment_id": str(uuid.uuid4()),
                "job_id": job_id,
                "start_time": segment["start_time"],
                "end_time": segment["end_time"],
                "text": segment["text"],
                "confidence": segment.get("confidence"),
                "speaker_id": None,  # phase 1 doesn't include speaker diarization
            }
            db_segments.append(db_segment)

        # bulk create transcript segments
        db_service.transcripts.bulk_create(db_segments)
        db.commit()

        logger.info(
            "Transcript segments stored in database",
            extra={"job_id": job_id, "segment_count": len(db_segments)},
        )

    except Exception as e:
        logger.error(
            "Failed to store transcript segments",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()


def generate_transcript(
    s3_key: str | None, job_id: str, local_video_path: str | None = None
) -> dict:
    """generate transcript from video audio using Google Gemini API.

    this function either uses a local video file or downloads from s3,
    retrieves silence regions, extracts and processes audio (removing silence),
    transcribes using Gemini API, stores results in database, and returns a summary.

    Args:
        s3_key: s3 key for the video file (optional if local_video_path provided)
        job_id: job identifier
        local_video_path: optional local video file path (skips s3 download)

    Returns:
        result dictionary with transcript segments and statistics

    Raises:
        Exception: if any step of the process fails
    """
    start_time = time.time()
    temp_video_path = None
    temp_audio_path = None
    cleanup_required = False

    logger.info(
        "Transcription started",
        extra={
            "job_id": job_id,
            "s3_key": s3_key,
            "using_local_path": local_video_path is not None,
        },
    )

    try:
        # validate gemini api configuration
        validate_gemini_config()

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

        # get video duration from database
        db = get_db_session()
        try:
            db_service = DatabaseService(db)
            job = db_service.jobs.get_by_id(job_id)
            if not job:
                raise ValueError(f"Job not found: {job_id}")

            video_duration = job.video_duration
            if not video_duration or video_duration <= 0:
                # fallback: get duration from video file using pydub
                logger.warning(
                    "Video duration not in database, extracting from file",
                    extra={"job_id": job_id},
                )
                audio = AudioSegment.from_file(temp_video_path)
                video_duration = len(audio) / 1000.0  # convert ms to seconds
                logger.info(
                    "Extracted video duration from file",
                    extra={"job_id": job_id, "duration": video_duration},
                )
        finally:
            db.close()

        # Phase 2: retrieve silence regions and calculate non-silent intervals
        non_silent_intervals = get_non_silent_intervals(job_id, video_duration)

        # handle edge case: entire video is silent
        if not non_silent_intervals:
            logger.warning(
                "No non-silent intervals to transcribe",
                extra={"job_id": job_id},
            )
            processing_time = time.time() - start_time
            return {
                "job_id": job_id,
                "status": "completed",
                "total_segments": 0,
                "message": "No non-silent audio to transcribe",
                "processing_time_seconds": round(processing_time, 2),
            }

        # calculate total non-silent audio duration
        total_non_silent_duration = sum(
            interval["end_time"] - interval["start_time"] for interval in non_silent_intervals
        )

        # check if non-silent audio duration meets minimum threshold
        if total_non_silent_duration < MIN_AUDIO_DURATION_SECONDS:
            logger.warning(
                "Non-silent audio duration below minimum threshold, skipping transcription",
                extra={
                    "job_id": job_id,
                    "non_silent_duration": round(total_non_silent_duration, 2),
                    "min_threshold": MIN_AUDIO_DURATION_SECONDS,
                },
            )
            processing_time = time.time() - start_time
            return {
                "job_id": job_id,
                "status": "completed",
                "total_segments": 0,
                "message": f"Non-silent audio duration ({round(total_non_silent_duration, 2)}s) below minimum threshold ({MIN_AUDIO_DURATION_SECONDS}s)",
                "processing_time_seconds": round(processing_time, 2),
                "non_silent_duration": round(total_non_silent_duration, 2),
            }

        # Phase 3: extract and segment audio (remove silence)
        audio_or_path, timestamp_mapping, needs_chunking = extract_and_segment_audio(
            temp_video_path, non_silent_intervals, job_id
        )

        # Phase 4: transcribe audio with Google Cloud Speech-to-Text API
        if needs_chunking:
            # audio is too large, use chunking
            logger.info(
                "Using chunked transcription for large audio file",
                extra={"job_id": job_id},
            )
            transcription_result = chunk_and_transcribe_audio(audio_or_path, job_id)
            temp_audio_path = None  # no single file, chunks are handled internally
        else:
            # audio fits in single request
            temp_audio_path = audio_or_path
            transcription_result = transcribe_with_gemini(temp_audio_path, job_id)

        logger.info(
            "Transcription received from Gemini API",
            extra={
                "job_id": job_id,
                "segments": len(transcription_result.get("segments", [])),
                "language": transcription_result.get("language"),
            },
        )

        # Phase 5: remap timestamps to original video time
        remapped_segments = remap_timestamps_to_original(
            transcription_result.get("segments", []), timestamp_mapping, job_id
        )

        # Phase 6: store transcript segments in database
        store_transcript_segments(remapped_segments, job_id)

        # calculate statistics
        processing_time = time.time() - start_time
        total_transcript_duration = sum(
            seg["end_time"] - seg["start_time"] for seg in remapped_segments
        )
        avg_confidence = (
            sum(seg["confidence"] for seg in remapped_segments if seg["confidence"] is not None)
            / len([seg for seg in remapped_segments if seg["confidence"] is not None])
            if any(seg["confidence"] is not None for seg in remapped_segments)
            else None
        )

        result = {
            "job_id": job_id,
            "status": "completed",
            "total_segments": len(remapped_segments),
            "total_transcript_duration": round(total_transcript_duration, 2),
            "average_confidence": round(avg_confidence, 3) if avg_confidence else None,
            "language": transcription_result.get("language", "unknown"),
            "processing_time_seconds": round(processing_time, 2),
        }

        logger.info(
            "Transcription completed successfully",
            extra={
                "job_id": job_id,
                "total_segments": len(remapped_segments),
                "processing_time": processing_time,
            },
        )

        return result

    except Exception as e:
        logger.error(
            "Transcription failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise

    finally:
        # clean up temporary files only if we downloaded them
        if cleanup_required and temp_video_path and os.path.exists(temp_video_path):
            try:
                os.unlink(temp_video_path)
                logger.info(
                    "Cleaned up temporary video file",
                    extra={"job_id": job_id, "temp_path": temp_video_path},
                )
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to clean up temporary video file",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id, "temp_path": temp_video_path},
                )

        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
                logger.info(
                    "Cleaned up temporary audio file",
                    extra={"job_id": job_id, "temp_path": temp_audio_path},
                )
            except Exception as cleanup_error:
                logger.warning(
                    "Failed to clean up temporary audio file",
                    exc_info=cleanup_error,
                    extra={"job_id": job_id, "temp_path": temp_audio_path},
                )
