"""Layout detector agent for screen/camera region detection."""

import time
import uuid
from typing import Any

import cv2
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService
from app.services.s3_service import s3_service

logger = get_logger(__name__)


def get_db_session():
    """Create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def detect_layout(
    s3_key: str | None,
    job_id: str,
    local_video_path: str | None = None,
) -> dict[str, Any]:
    """Detect screen and camera regions in video using simple heuristic analysis.

    Supports detection of:
    - side_by_side: Screen and camera positioned horizontally
    - picture_in_picture: Small camera overlay on screen
    - screen_only: Full-screen content only
    - camera_only: Speaker-focused video
    - unknown: Fallback when detection is uncertain

    Args:
        s3_key: S3 object key (optional if local_video_path provided)
        job_id: Job identifier
        local_video_path: Optional local video file path (skips S3 download)

    Returns:
        Result dictionary with layout information

    Raises:
        Exception: If video cannot be read or processing fails
    """
    start_time = time.time()

    logger.info(
        "Layout detection started",
        extra={
            "job_id": job_id,
            "s3_key": s3_key,
            "local_video_path": local_video_path,
        },
    )

    try:
        # determine video path
        if local_video_path:
            video_path = local_video_path
            logger.info("Using local video path", extra={"job_id": job_id, "path": video_path})
        elif s3_key:
            # download from S3 if needed (fallback)
            presigned_url = s3_service.generate_presigned_url(s3_key)
            video_path = presigned_url
            logger.info("Using S3 presigned URL", extra={"job_id": job_id, "s3_key": s3_key})
        else:
            raise ValueError("Either s3_key or local_video_path must be provided")

        # analyze video layout
        layout_info = analyze_video_layout(video_path, job_id)

        # store in database
        store_layout_in_database(layout_info, job_id)

        processing_time = time.time() - start_time

        result = {
            "job_id": job_id,
            "status": "completed",
            "screen_region": layout_info["screen_region"],
            "camera_region": layout_info["camera_region"],
            "split_ratio": layout_info["split_ratio"],
            "layout_type": layout_info["layout_type"],
            "confidence_score": layout_info["confidence_score"],
            "sample_frame_time": layout_info["sample_frame_time"],
            "processing_time_seconds": round(processing_time, 2),
        }

        logger.info(
            "Layout detection completed",
            extra={
                "job_id": job_id,
                "layout_type": layout_info["layout_type"],
                "confidence": layout_info["confidence_score"],
                "processing_time": round(processing_time, 2),
            },
        )

        return result

    except Exception as e:
        logger.error(
            "Layout detection failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        # return safe default layout (don't fail the pipeline)
        return get_safe_default_layout(job_id)


def analyze_video_layout(video_path: str, job_id: str) -> dict[str, Any]:
    """Analyze video frames to detect layout using simple heuristics.

    Algorithm:
    1. Sample 3-5 frames from video (beginning, middle, end)
    2. Use edge detection to find high-activity regions
    3. Apply heuristics to classify layout type
    4. Return layout info with confidence score

    Args:
        video_path: Path to video file or presigned URL
        job_id: Job identifier for logging

    Returns:
        Dictionary with layout information

    Raises:
        Exception: If video cannot be opened
    """
    cap = cv2.VideoCapture(video_path)

    try:
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        # get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info(
            "Video properties",
            extra={
                "job_id": job_id,
                "total_frames": total_frames,
                "fps": fps,
                "resolution": f"{width}x{height}",
            },
        )

        # sample frames at key positions
        sample_positions = [
            int(total_frames * 0.1),  # 10% into video
            int(total_frames * 0.5),  # 50% (middle)
            int(total_frames * 0.9),  # 90% near end
        ]

        # analyze sampled frames
        layout_detections = []
        for frame_idx in sample_positions:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                logger.warning(
                    "Failed to read frame",
                    extra={"job_id": job_id, "frame_idx": frame_idx},
                )
                continue

            # detect layout in this frame
            frame_layout = detect_layout_in_frame(frame, width, height)
            layout_detections.append(frame_layout)

        if not layout_detections:
            raise ValueError("No frames could be analyzed")

        # aggregate detections (use most common layout type)
        final_layout = aggregate_layout_detections(layout_detections, width, height)
        final_layout["sample_frame_time"] = sample_positions[1] / fps  # middle frame time

        logger.info(
            "Layout analysis complete",
            extra={
                "job_id": job_id,
                "layout_type": final_layout["layout_type"],
                "confidence": final_layout["confidence_score"],
            },
        )

        return final_layout

    finally:
        cap.release()


def detect_layout_in_frame(frame: np.ndarray, width: int, height: int) -> dict[str, Any]:
    """Detect layout in a single frame using edge detection heuristics.

    Heuristics:
    - High edge density in left/right half → side_by_side
    - Small high-motion region + large static region → picture_in_picture
    - Uniform edge distribution → screen_only or camera_only

    Args:
        frame: Video frame (BGR format)
        width: Frame width
        height: Frame height

    Returns:
        Dictionary with detected layout info for this frame
    """
    # convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # apply edge detection
    edges = cv2.Canny(gray, 50, 150)

    # divide frame into regions for analysis
    left_half = edges[:, : width // 2]
    right_half = edges[:, width // 2 :]

    # calculate edge density (ratio of edge pixels to total pixels)
    left_density = np.sum(left_half > 0) / left_half.size
    right_density = np.sum(right_half > 0) / right_half.size
    total_density = np.sum(edges > 0) / edges.size

    # heuristic 1: side-by-side detection
    # significant edge density in both halves, with clear division
    if left_density > 0.05 and right_density > 0.05 and abs(left_density - right_density) < 0.1:
        return {
            "layout_type": "side_by_side",
            "screen_region": {"x": 0, "y": 0, "width": width // 2, "height": height},
            "camera_region": {"x": width // 2, "y": 0, "width": width // 2, "height": height},
            "split_ratio": 0.5,
            "confidence": 0.75,
        }

    # heuristic 2: picture-in-picture detection
    # look for small high-density region (typically in corner)
    corner_size = min(width, height) // 4
    corners = [
        edges[:corner_size, :corner_size],  # top-left
        edges[:corner_size, -corner_size:],  # top-right
        edges[-corner_size:, :corner_size],  # bottom-left
        edges[-corner_size:, -corner_size:],  # bottom-right
    ]

    corner_densities = [np.sum(corner > 0) / corner.size for corner in corners]
    max_corner_density = max(corner_densities)

    if max_corner_density > 0.08 and total_density > 0.03:
        # high activity in corner suggests PiP
        corner_idx = corner_densities.index(max_corner_density)
        camera_x = (corner_idx % 2) * (width - corner_size)
        camera_y = (corner_idx // 2) * (height - corner_size)

        return {
            "layout_type": "picture_in_picture",
            "screen_region": {"x": 0, "y": 0, "width": width, "height": height},
            "camera_region": {
                "x": camera_x,
                "y": camera_y,
                "width": corner_size,
                "height": corner_size,
            },
            "split_ratio": 0.9,  # 90% screen, 10% camera
            "confidence": 0.65,
        }

    # heuristic 3: screen-only vs camera-only
    # high edge density → likely slides/screen (text, graphics)
    # low edge density → likely camera (smoother, less detail)
    if total_density > 0.04:
        return {
            "layout_type": "screen_only",
            "screen_region": {"x": 0, "y": 0, "width": width, "height": height},
            "camera_region": {},
            "split_ratio": 1.0,
            "confidence": 0.7,
        }
    else:
        return {
            "layout_type": "camera_only",
            "screen_region": {},
            "camera_region": {"x": 0, "y": 0, "width": width, "height": height},
            "split_ratio": 0.0,
            "confidence": 0.6,
        }


def aggregate_layout_detections(
    detections: list[dict[str, Any]], width: int, height: int
) -> dict[str, Any]:
    """Aggregate multiple frame detections into final layout decision.

    Uses majority voting for layout type and averages confidence scores.

    Args:
        detections: List of layout detections from different frames
        width: Video width
        height: Video height

    Returns:
        Final aggregated layout information
    """
    if not detections:
        return get_safe_default_layout_info(width, height)

    # count layout types
    layout_counts = {}
    for detection in detections:
        layout_type = detection["layout_type"]
        layout_counts[layout_type] = layout_counts.get(layout_type, 0) + 1

    # pick most common layout type
    most_common_layout = max(layout_counts, key=layout_counts.get)

    # filter detections to only this layout type
    matching_detections = [d for d in detections if d["layout_type"] == most_common_layout]

    # average confidence
    avg_confidence = sum(d["confidence"] for d in matching_detections) / len(matching_detections)

    # use first matching detection as template
    final_layout = matching_detections[0].copy()
    final_layout["confidence_score"] = round(avg_confidence, 2)

    # if confidence is too low, fall back to safe default
    if avg_confidence < 0.6:
        logger.warning(
            "Low confidence layout detection, using safe default",
            extra={"confidence": avg_confidence, "detected_layout": most_common_layout},
        )
        return get_safe_default_layout_info(width, height)

    return final_layout


def get_safe_default_layout_info(width: int, height: int) -> dict[str, Any]:
    """Return safe default layout (screen-only, full frame).

    Args:
        width: Video width
        height: Video height

    Returns:
        Default layout information
    """
    return {
        "layout_type": "screen_only",
        "screen_region": {"x": 0, "y": 0, "width": width, "height": height},
        "camera_region": {},
        "split_ratio": 1.0,
        "confidence_score": 0.0,  # 0.0 indicates fallback
        "sample_frame_time": 0.0,
    }


def get_safe_default_layout(job_id: str) -> dict[str, Any]:
    """Return safe default layout result for pipeline (on error).

    Args:
        job_id: Job identifier

    Returns:
        Safe default result dictionary
    """
    logger.warning(
        "Returning safe default layout due to error",
        extra={"job_id": job_id},
    )

    # assume 1920x1080 default resolution
    default_info = get_safe_default_layout_info(1920, 1080)

    # store default in database
    try:
        store_layout_in_database(default_info, job_id)
    except Exception as db_error:
        logger.error(
            "Failed to store default layout in database",
            exc_info=db_error,
            extra={"job_id": job_id},
        )

    return {
        "job_id": job_id,
        "status": "completed",
        "screen_region": default_info["screen_region"],
        "camera_region": default_info["camera_region"],
        "split_ratio": default_info["split_ratio"],
        "layout_type": default_info["layout_type"],
        "confidence_score": 0.0,
        "sample_frame_time": 0.0,
        "processing_time_seconds": 0.0,
    }


def store_layout_in_database(layout_info: dict[str, Any], job_id: str) -> None:
    """Store layout analysis results in database.

    Args:
        layout_info: Layout information dictionary
        job_id: Job identifier

    Raises:
        Exception: If database operation fails
    """
    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # create layout analysis record
        db_service.layout_analysis.create(
            layout_id=str(uuid.uuid4()),
            job_id=job_id,
            screen_region=layout_info["screen_region"],
            camera_region=layout_info["camera_region"],
            split_ratio=layout_info["split_ratio"],
            layout_type=layout_info["layout_type"],
            confidence_score=layout_info["confidence_score"],
            sample_frame_time=layout_info["sample_frame_time"],
        )

        db.commit()

        logger.info(
            "Layout analysis stored in database",
            extra={
                "job_id": job_id,
                "layout_type": layout_info["layout_type"],
            },
        )

    except Exception as e:
        logger.error(
            "Failed to store layout analysis in database",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()
