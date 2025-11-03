"""Transcription agent for speech-to-text using Google Cloud Speech-to-Text API."""

import os
import tempfile
import time
import uuid
from pathlib import Path

import requests
from google.cloud import speech_v1
from pydub import AudioSegment
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)

# google cloud speech-to-text configuration
MAX_AUDIO_SIZE_MB = 10  # google cloud speech-to-text synchronous api limit


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def validate_google_cloud_config() -> None:
    """validate google cloud configuration.

    Raises:
        ValueError: if google cloud credentials are not configured
    """
    # set credentials path if provided
    if settings.google_cloud_credentials_path:
        if not os.path.exists(settings.google_cloud_credentials_path):
            raise ValueError(
                f"Google Cloud credentials file not found: {settings.google_cloud_credentials_path}"
            )
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_cloud_credentials_path
        logger.info(
            "Using Google Cloud credentials from file",
            extra={"credentials_path": settings.google_cloud_credentials_path},
        )
    else:
        # check if default credentials are available
        if "GOOGLE_APPLICATION_CREDENTIALS" not in os.environ:
            logger.warning(
                "No Google Cloud credentials configured. Will attempt to use default credentials (e.g., gcloud auth)."
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
) -> tuple[str, list[dict]]:
    """extract audio from video and remove silent segments.

    Args:
        video_path: path to video file
        non_silent_intervals: list of non-silent time intervals
        job_id: job identifier for logging

    Returns:
        tuple of (audio_file_path, timestamp_mapping)
        timestamp_mapping: list of dicts mapping compressed time to original time

    Raises:
        Exception: if audio extraction fails
        ValueError: if resulting audio file exceeds Whisper API size limit
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

        # check file size against Whisper API limit
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        logger.info(
            "Audio exported to temporary file",
            extra={
                "job_id": job_id,
                "audio_path": audio_path,
                "file_size_mb": round(file_size_mb, 2),
            },
        )

        if file_size_mb > MAX_AUDIO_SIZE_MB:
            os.unlink(audio_path)  # clean up oversized file
            raise ValueError(
                f"Audio file size ({file_size_mb:.2f}MB) exceeds Google Cloud Speech-to-Text API limit ({MAX_AUDIO_SIZE_MB}MB). "
                f"Consider implementing audio chunking for large files."
            )

        return audio_path, timestamp_mapping

    except Exception as e:
        logger.error(
            "Failed to extract and segment audio",
            exc_info=e,
            extra={"job_id": job_id},
        )
        raise


def transcribe_with_google_speech(audio_path: str, job_id: str) -> dict:
    """transcribe audio file using Google Cloud Speech-to-Text API with retry logic.

    Args:
        audio_path: path to audio file
        job_id: job identifier for logging

    Returns:
        speech-to-text api response dictionary with segments and metadata

    Raises:
        Exception: if transcription fails after all retries
    """
    client = speech_v1.SpeechClient()

    max_retries = 3
    base_delay = 2  # seconds

    for attempt in range(max_retries):
        try:
            logger.info(
                "Calling Google Cloud Speech-to-Text API",
                extra={
                    "job_id": job_id,
                    "attempt": attempt + 1,
                    "max_retries": max_retries,
                },
            )

            # read audio file content
            with open(audio_path, "rb") as audio_file:
                audio_content = audio_file.read()

            # configure audio and recognition settings
            audio = speech_v1.RecognitionAudio(content=audio_content)

            config = speech_v1.RecognitionConfig(
                encoding=speech_v1.RecognitionConfig.AudioEncoding.MP3,
                language_code=settings.speech_to_text_language_code,
                model=settings.speech_to_text_model,
                enable_word_time_offsets=settings.speech_to_text_enable_word_time_offsets,
                enable_automatic_punctuation=True,
            )

            # make api call
            response = client.recognize(config=config, audio=audio)

            logger.info(
                "Google Cloud Speech-to-Text API call successful",
                extra={
                    "job_id": job_id,
                    "results_count": len(response.results),
                },
            )

            # process response into segments
            segments = []
            full_text = ""
            segment_id = 0

            for result in response.results:
                # get the best alternative (highest confidence)
                alternative = result.alternatives[0]
                full_text += alternative.transcript + " "

                # create segments from words
                if alternative.words:
                    # group words into segments (by sentences or fixed intervals)
                    current_segment_words = []
                    segment_start = None
                    segment_end = None

                    for word_info in alternative.words:
                        if segment_start is None:
                            segment_start = (
                                word_info.start_time.seconds
                                + word_info.start_time.microseconds / 1e6
                            )

                        current_segment_words.append(word_info.word)
                        segment_end = (
                            word_info.end_time.seconds + word_info.end_time.microseconds / 1e6
                        )

                        # create segment every 10 words or at end of sentence
                        if len(current_segment_words) >= 10 or word_info.word.rstrip(" ").endswith(
                            (".", "!", "?")
                        ):
                            segments.append(
                                {
                                    "id": segment_id,
                                    "start": round(segment_start, 2),
                                    "end": round(segment_end, 2),
                                    "text": " ".join(current_segment_words),
                                    "confidence": (
                                        round(alternative.confidence, 3)
                                        if alternative.confidence > 0
                                        else None
                                    ),
                                }
                            )
                            segment_id += 1
                            current_segment_words = []
                            segment_start = None

                    # add remaining words as final segment
                    if current_segment_words and segment_start is not None:
                        segments.append(
                            {
                                "id": segment_id,
                                "start": round(segment_start, 2),
                                "end": round(segment_end, 2),
                                "text": " ".join(current_segment_words),
                                "confidence": (
                                    round(alternative.confidence, 3)
                                    if alternative.confidence > 0
                                    else None
                                ),
                            }
                        )
                        segment_id += 1
                else:
                    # no word-level timestamps, create single segment
                    segments.append(
                        {
                            "id": segment_id,
                            "start": 0.0,
                            "end": 0.0,
                            "text": alternative.transcript,
                            "confidence": (
                                round(alternative.confidence, 3)
                                if alternative.confidence > 0
                                else None
                            ),
                        }
                    )
                    segment_id += 1

            # calculate total duration from last word
            duration = segments[-1]["end"] if segments else 0.0

            response_dict = {
                "text": full_text.strip(),
                "task": "transcribe",
                "language": settings.speech_to_text_language_code,
                "duration": duration,
                "segments": segments,
            }

            logger.info(
                "Transcription processing complete",
                extra={
                    "job_id": job_id,
                    "total_segments": len(segments),
                    "duration": duration,
                },
            )

            return response_dict

        except Exception as e:
            error_msg = str(e)
            is_rate_limit = (
                "quota" in error_msg.lower() or "rate" in error_msg.lower() or "429" in error_msg
            )

            logger.warning(
                "Google Cloud Speech-to-Text API call failed",
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
                    "Google Cloud Speech-to-Text API call failed after all retries",
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
    raise Exception("Google Cloud Speech-to-Text API call failed unexpectedly")


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


def generate_transcript(video_path: str, job_id: str) -> dict:
    """generate transcript from video audio using Google Cloud Speech-to-Text.

    this function downloads the video from s3, retrieves silence regions,
    extracts and processes audio (removing silence), transcribes using
    Google Cloud Speech-to-Text API, stores results in database, and returns a summary.

    Args:
        video_path: s3 key for the video file (not local path)
        job_id: job identifier

    Returns:
        result dictionary with transcript segments and statistics

    Raises:
        Exception: if any step of the process fails
    """
    start_time = time.time()
    temp_video_path = None
    temp_audio_path = None

    logger.info(
        "Transcription started",
        extra={"job_id": job_id, "s3_key": video_path},
    )

    try:
        # validate google cloud configuration
        validate_google_cloud_config()

        # download video from s3
        temp_video_path = download_video_from_s3(video_path, job_id)

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

        # Phase 3: extract and segment audio (remove silence)
        temp_audio_path, timestamp_mapping = extract_and_segment_audio(
            temp_video_path, non_silent_intervals, job_id
        )

        # Phase 4: transcribe audio with Google Cloud Speech-to-Text API
        transcription_result = transcribe_with_google_speech(temp_audio_path, job_id)

        logger.info(
            "Transcription received from Google Cloud Speech-to-Text",
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
        # clean up temporary files
        if temp_video_path and os.path.exists(temp_video_path):
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
