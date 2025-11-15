"""Segment extraction agent for identifying optimal highlight segments."""

import time
import uuid
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

# segment extraction parameters
MIN_DURATION_SECONDS = 5  # 5 seconds (flexible minimum)
MAX_DURATION_SECONDS = 60  # 1min (flexible maximum)
TARGET_MIN_DURATION = 120  # 2 minutes (target minimum)
TARGET_MAX_DURATION = 300  # 5 minutes (target maximum)
MAX_SEGMENTS_TO_SELECT = 5  # top 5 segments
SILENCE_SEARCH_WINDOW = 5.0  # search for silence within ±5 seconds


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def find_nearest_silence(
    target_time: float,
    silence_regions: list[Any],
    window: float = SILENCE_SEARCH_WINDOW,
    prefer: str = "closest",
) -> tuple[float | None, dict | None]:
    """find the nearest silence region to a target time.

    Args:
        target_time: target time in seconds
        silence_regions: list of SilenceRegion objects
        window: search window in seconds (±window)
        prefer: preference - 'closest', 'before', 'after'

    Returns:
        tuple of (optimal_time, silence_info) or (None, None) if no silence found
    """
    if not silence_regions:
        return None, None

    # filter silence regions within window
    candidates = []
    for region in silence_regions:
        # check if region is within search window
        start_dist = abs(region.start_time - target_time)
        end_dist = abs(region.end_time - target_time)

        if start_dist <= window:
            candidates.append(
                {
                    "time": region.start_time,
                    "distance": start_dist,
                    "position": "start",
                    "region": region,
                }
            )
        if end_dist <= window:
            candidates.append(
                {
                    "time": region.end_time,
                    "distance": end_dist,
                    "position": "end",
                    "region": region,
                }
            )

    if not candidates:
        return None, None

    # apply preference
    if prefer == "before":
        # prefer silence points before target_time
        before = [c for c in candidates if c["time"] <= target_time]
        candidates = before if before else candidates
    elif prefer == "after":
        # prefer silence points after target_time
        after = [c for c in candidates if c["time"] >= target_time]
        candidates = after if after else candidates

    # sort by distance and pick closest
    candidates.sort(key=lambda x: x["distance"])
    best = candidates[0]

    silence_info = {
        "time": best["time"],
        "distance": best["distance"],
        "position": best["position"],
        "region_id": best["region"].region_id,
        "duration": best["region"].duration,
    }

    return best["time"], silence_info


def optimize_segment_boundaries(
    segment: Any, silence_regions: list[Any]
) -> tuple[float, float, dict]:
    """optimize segment boundaries using nearby silence regions.

    Args:
        segment: ContentSegment object
        silence_regions: list of SilenceRegion objects

    Returns:
        tuple of (optimal_start, optimal_end, metadata)
    """
    original_start = segment.start_time
    original_end = segment.end_time

    # find optimal start boundary (prefer silence after original start)
    optimal_start, start_silence = find_nearest_silence(
        original_start, silence_regions, prefer="after"
    )

    # find optimal end boundary (prefer silence before original end)
    optimal_end, end_silence = find_nearest_silence(original_end, silence_regions, prefer="before")

    # fallback to original boundaries if no silence found
    if optimal_start is None:
        optimal_start = original_start
    if optimal_end is None:
        optimal_end = original_end

    # ensure end > start
    if optimal_end <= optimal_start:
        logger.warning(
            "optimized boundaries invalid, using original",
            extra={
                "segment_id": segment.segment_id,
                "optimal_start": optimal_start,
                "optimal_end": optimal_end,
            },
        )
        optimal_start = original_start
        optimal_end = original_end

    # generate metadata
    metadata = {
        "optimization": {
            "start_adjusted": optimal_start != original_start,
            "start_adjustment_seconds": round(optimal_start - original_start, 3),
            "end_adjusted": optimal_end != original_end,
            "end_adjustment_seconds": round(optimal_end - original_end, 3),
            "start_silence": start_silence,
            "end_silence": end_silence,
        },
        "original_boundaries": {
            "start_time": original_start,
            "end_time": original_end,
            "duration": original_end - original_start,
        },
        "selection_reason": "importance_score",
    }

    return optimal_start, optimal_end, metadata


def select_segments(job_id: str, db_service: DatabaseService) -> list[Any]:
    """select top segments by importance score with duration filtering.

    Args:
        job_id: job identifier
        db_service: database service instance

    Returns:
        list of selected ContentSegment objects
    """
    logger.info(
        "selecting top segments",
        extra={"job_id": job_id, "max_segments": MAX_SEGMENTS_TO_SELECT},
    )

    # get all content segments for this job, ordered by importance score
    all_segments = db_service.content_segments.get_by_job_id(job_id)

    if not all_segments:
        logger.warning("no content segments found", extra={"job_id": job_id})
        return []

    logger.info(
        "content segments retrieved",
        extra={"job_id": job_id, "total_segments": len(all_segments)},
    )

    # sort by importance score descending
    all_segments.sort(key=lambda s: s.importance_score, reverse=True)

    # filter by duration (flexible: 1:45 to 5:30)
    valid_segments = [
        s for s in all_segments if MIN_DURATION_SECONDS <= s.duration <= MAX_DURATION_SECONDS
    ]

    logger.info(
        "segments after duration filtering",
        extra={
            "job_id": job_id,
            "valid_segments": len(valid_segments),
            "filtered_out": len(all_segments) - len(valid_segments),
        },
    )

    # select top N
    selected = valid_segments[:MAX_SEGMENTS_TO_SELECT]

    logger.info(
        "top segments selected",
        extra={
            "job_id": job_id,
            "selected_count": len(selected),
            "importance_scores": [round(s.importance_score, 3) for s in selected],
        },
    )

    return selected


def create_clips(
    selected_segments: list[Any],
    silence_regions: list[Any],
    job_id: str,
    db_service: DatabaseService,
) -> list[Any]:
    """create clip records with optimized boundaries.

    Args:
        selected_segments: list of ContentSegment objects
        silence_regions: list of SilenceRegion objects
        job_id: job identifier
        db_service: database service instance

    Returns:
        list of created Clip objects
    """
    create_start = time.time()
    clip_data_list = []

    # prepare all clip data (no DB operations in loop)
    for order, segment in enumerate(selected_segments, 1):
        logger.info(
            "processing segment",
            extra={
                "job_id": job_id,
                "segment_id": segment.segment_id,
                "order": order,
                "topic": segment.topic,
            },
        )

        # optimize boundaries using silence data
        optimal_start, optimal_end, metadata = optimize_segment_boundaries(segment, silence_regions)

        optimal_duration = optimal_end - optimal_start

        # add quality assessment to metadata
        metadata["quality_assessment"] = {
            "duration_fit": (
                "optimal"
                if TARGET_MIN_DURATION <= optimal_duration <= TARGET_MAX_DURATION
                else "acceptable"
            ),
            "importance_score": segment.importance_score,
            "has_silence_boundaries": (
                metadata["optimization"]["start_adjusted"]
                or metadata["optimization"]["end_adjusted"]
            ),
        }

        # prepare clip data for bulk insert
        clip_id = str(uuid.uuid4())
        clip_data_list.append(
            {
                "clip_id": clip_id,
                "job_id": job_id,
                "content_segment_id": segment.segment_id,
                "title": segment.topic or f"Highlight {order}",
                "topic": segment.topic,
                "importance_score": segment.importance_score,
                "start_time": optimal_start,
                "end_time": optimal_end,
                "duration": optimal_duration,
                "clip_order": order,
                # placeholder for video_compiler
                "s3_key": f"clips/{job_id}/clip_{order}.mp4",
                "extra_metadata": metadata,
            }
        )

        logger.info(
            "clip data prepared",
            extra={
                "job_id": job_id,
                "clip_id": clip_id,
                "order": order,
                "duration": round(optimal_duration, 2),
                "boundaries_optimized": metadata["optimization"]["start_adjusted"]
                or metadata["optimization"]["end_adjusted"],
            },
        )

    # bulk insert all clips with single commit (much faster!)
    clips = db_service.clips.bulk_create(clip_data_list)

    create_duration = time.time() - create_start
    logger.info(
        "clips created via bulk insert",
        extra={
            "job_id": job_id,
            "clips_created": len(clips),
            "execution_time_ms": round(create_duration * 1000, 2),
        },
    )

    return clips


def extract_segments(
    _content_data: dict, _silence_data: dict, _transcript_data: dict, job_id: str
) -> dict:
    """extract optimal highlight segments with optimized boundaries.

    this agent processes content analysis results to identify the top 3-5
    highlight segments based on importance scores, then optimizes segment
    boundaries using silence detection data for clean transitions.

    Args:
        _content_data: unused (queries database directly)
        _silence_data: unused (queries database directly)
        _transcript_data: unused (reserved for future use)
        job_id: job identifier

    Returns:
        result dictionary with selected segments and metadata
    """
    start_time = time.time()

    logger.info("segment extraction started", extra={"job_id": job_id})

    try:
        # create database session
        db = get_db_session()

        try:
            db_service = DatabaseService(db)

            # query content segments from database
            query_start = time.time()
            selected_segments = select_segments(job_id, db_service)
            query_duration = time.time() - query_start

            logger.info(
                "content segments queried",
                extra={
                    "job_id": job_id,
                    "selected_count": len(selected_segments),
                    "query_time_ms": round(query_duration * 1000, 2),
                },
            )

            if not selected_segments:
                logger.warning("no valid segments found for extraction", extra={"job_id": job_id})
                return {
                    "job_id": job_id,
                    "status": "completed",
                    "selected_segments": [],
                    "segments_analyzed": 0,
                    "segments_created": 0,
                    "message": "no segments met duration and quality criteria",
                    "processing_time_seconds": round(time.time() - start_time, 2),
                }

            # query silence regions from database
            silence_start = time.time()
            silence_regions = db_service.silence_regions.get_by_job_id(job_id)
            silence_duration = time.time() - silence_start

            logger.info(
                "silence regions retrieved",
                extra={
                    "job_id": job_id,
                    "silence_count": len(silence_regions),
                    "query_time_ms": round(silence_duration * 1000, 2),
                },
            )

            # create optimized clips
            clips = create_clips(selected_segments, silence_regions, job_id, db_service)

            # commit transaction
            commit_start = time.time()
            db.commit()
            commit_duration = time.time() - commit_start

            logger.info(
                "transaction committed",
                extra={"job_id": job_id, "commit_time_ms": round(commit_duration * 1000, 2)},
            )

            logger.info(
                "clips committed to database",
                extra={"job_id": job_id, "clips_created": len(clips)},
            )

            # build result
            processing_time = time.time() - start_time

            result = {
                "job_id": job_id,
                "status": "completed",
                "selected_segments": [
                    {
                        "clip_id": clip.clip_id,
                        "title": clip.title,
                        "topic": clip.topic,
                        "start_time": round(clip.start_time, 3),
                        "end_time": round(clip.end_time, 3),
                        "duration": round(clip.duration, 2),
                        "importance_score": round(clip.importance_score, 3),
                        "clip_order": clip.clip_order,
                        "boundaries_optimized": (
                            clip.extra_metadata.get("optimization", {}).get("start_adjusted", False)
                            or clip.extra_metadata.get("optimization", {}).get(
                                "end_adjusted", False
                            )
                        ),
                    }
                    for clip in clips
                ],
                "segments_analyzed": len(selected_segments),
                "segments_created": len(clips),
                "silence_regions_available": len(silence_regions),
                "processing_time_seconds": round(processing_time, 2),
            }

            logger.info(
                "segment extraction completed successfully",
                extra={
                    "job_id": job_id,
                    "clips_created": len(clips),
                    "processing_time": round(processing_time, 2),
                },
            )

            return result

        except Exception as db_error:
            logger.error(
                "database error during segment extraction",
                exc_info=db_error,
                extra={"job_id": job_id},
            )
            db.rollback()
            raise

        finally:
            db.close()

    except Exception as e:
        logger.error("segment extraction failed", exc_info=e, extra={"job_id": job_id})
        raise
