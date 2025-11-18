"""Image Agent for extracting visual content from video slides/screens.

This agent analyzes video frames to extract text and visual elements from
slide regions, complementing the Layout Detector's region identification.
"""

import time
import uuid
from typing import Any

import cv2
import google.generativeai as genai
import numpy as np
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService

logger = get_logger(__name__)


def get_db_session():
    """Create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def extract_slide_content(
    s3_key: str | None,
    job_id: str,
    local_video_path: str | None = None,
    layout_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Extract visual content (text, diagrams) from video slides using Gemini Vision.

    This agent samples key frames from the video, extracts the screen region
    (using layout info), and uses Gemini Vision API to read text and describe
    visual elements.

    Args:
        s3_key: S3 object key (optional if local_video_path provided)
        job_id: Job identifier
        local_video_path: Optional local video file path (skips S3 download)
        layout_info: Optional layout detection result to focus on screen region

    Returns:
        Result dictionary with extracted visual content

    Raises:
        Exception: If video cannot be read or processing fails
    """
    start_time = time.time()

    logger.info(
        "Image Agent started",
        extra={
            "job_id": job_id,
            "s3_key": s3_key,
            "local_video_path": local_video_path,
            "has_layout_info": layout_info is not None,
        },
    )

    try:
        # validate API key
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not configured in settings")

        # configure Gemini
        genai.configure(api_key=settings.gemini_api_key)

        # determine video path
        if local_video_path:
            video_path = local_video_path
            logger.info("Using local video path", extra={"job_id": job_id, "path": video_path})
        elif s3_key:
            raise NotImplementedError("S3 download not implemented in this version")
        else:
            raise ValueError("Either s3_key or local_video_path must be provided")

        # extract frames and analyze visual content
        visual_content = analyze_video_frames(video_path, job_id, layout_info)

        # store in database
        store_visual_content_in_database(visual_content, job_id)

        processing_time = time.time() - start_time

        result = {
            "job_id": job_id,
            "status": "completed",
            "frames_analyzed": visual_content["frames_analyzed"],
            "total_text_blocks": visual_content["total_text_blocks"],
            "visual_elements_detected": visual_content["visual_elements_detected"],
            "processing_time_seconds": round(processing_time, 2),
        }

        logger.info(
            "Image Agent completed",
            extra={
                "job_id": job_id,
                "frames_analyzed": visual_content["frames_analyzed"],
                "text_blocks": visual_content["total_text_blocks"],
                "processing_time": round(processing_time, 2),
            },
        )

        return result

    except Exception as e:
        logger.error(
            "Image Agent failed",
            exc_info=e,
            extra={"job_id": job_id},
        )
        # return empty result (don't fail the pipeline)
        return get_safe_default_result(job_id)


def analyze_video_frames(
    video_path: str, job_id: str, layout_info: dict[str, Any] | None
) -> dict[str, Any]:
    """Analyze video frames to extract visual content from slides.

    Algorithm:
    1. Sample key frames from video (every 5 seconds)
    2. Extract screen region using layout info (if available)
    3. Use Gemini Vision API to read text and identify visual elements
    4. Aggregate results across all frames

    Args:
        video_path: Path to video file
        job_id: Job identifier for logging
        layout_info: Optional layout detection result

    Returns:
        Dictionary with extracted visual content

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
        duration = total_frames / fps if fps > 0 else 0

        logger.info(
            "Video properties for Image Agent",
            extra={
                "job_id": job_id,
                "total_frames": total_frames,
                "fps": fps,
                "resolution": f"{width}x{height}",
                "duration": round(duration, 2),
            },
        )

        # determine screen region to focus on
        screen_region = get_screen_region(layout_info, width, height)

        # sample frames every 5 seconds (or max 10 frames to avoid cost)
        sample_interval_seconds = 5
        sample_interval_frames = int(fps * sample_interval_seconds)
        max_samples = 10

        frame_indices = []
        for i in range(0, total_frames, sample_interval_frames):
            frame_indices.append(i)
            if len(frame_indices) >= max_samples:
                break

        logger.info(
            "Sampling frames for analysis",
            extra={
                "job_id": job_id,
                "sample_count": len(frame_indices),
                "interval_seconds": sample_interval_seconds,
            },
        )

        # analyze each sampled frame
        all_content = []
        for frame_idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()

            if not ret:
                logger.warning(
                    "Failed to read frame",
                    extra={"job_id": job_id, "frame_idx": frame_idx},
                )
                continue

            # extract screen region from frame
            screen_frame = extract_region_from_frame(frame, screen_region)

            # analyze this frame with Gemini Vision
            timestamp = frame_idx / fps if fps > 0 else 0
            frame_content = analyze_frame_with_gemini(screen_frame, timestamp, job_id)

            if frame_content:
                all_content.append(frame_content)

        # aggregate results
        aggregated = aggregate_visual_content(all_content, job_id)

        logger.info(
            "Frame analysis complete",
            extra={
                "job_id": job_id,
                "frames_analyzed": len(all_content),
                "text_blocks": aggregated["total_text_blocks"],
            },
        )

        return aggregated

    finally:
        cap.release()


def get_screen_region(
    layout_info: dict[str, Any] | None, video_width: int, video_height: int
) -> dict[str, int]:
    """Determine screen region to focus on for OCR/visual analysis.

    Args:
        layout_info: Layout detection result (if available)
        video_width: Video width in pixels
        video_height: Video height in pixels

    Returns:
        Dictionary with screen region coordinates {x, y, width, height}
    """
    if layout_info and "screen_region" in layout_info:
        screen_region = layout_info["screen_region"]

        # validate region has required fields
        if all(key in screen_region for key in ["x", "y", "width", "height"]):
            logger.debug(
                "Using layout info for screen region",
                extra={"screen_region": screen_region},
            )
            return screen_region

    # fallback: use full frame
    logger.debug("Using full frame as screen region (no layout info)")
    return {"x": 0, "y": 0, "width": video_width, "height": video_height}


def extract_region_from_frame(frame: np.ndarray, region: dict[str, int]) -> np.ndarray:
    """Extract a specific region from a video frame.

    Args:
        frame: Video frame (BGR format from OpenCV)
        region: Region coordinates {x, y, width, height}

    Returns:
        Cropped frame (BGR format)
    """
    x = region["x"]
    y = region["y"]
    width = region["width"]
    height = region["height"]

    # ensure coordinates are within frame bounds
    x = max(0, x)
    y = max(0, y)
    width = min(width, frame.shape[1] - x)
    height = min(height, frame.shape[0] - y)

    # extract region
    cropped = frame[y : y + height, x : x + width]

    return cropped


def analyze_frame_with_gemini(
    frame: np.ndarray, timestamp: float, job_id: str
) -> dict[str, Any] | None:
    """Analyze a single frame using Gemini Vision API to extract text and visual elements.

    Args:
        frame: Video frame (BGR format from OpenCV)
        timestamp: Frame timestamp in seconds
        job_id: Job identifier for logging

    Returns:
        Dictionary with extracted content, or None if analysis fails
    """
    try:
        # convert BGR (OpenCV) to RGB (PIL/Gemini)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # convert to PIL Image
        pil_image = Image.fromarray(rgb_frame)

        # create Gemini Vision model
        model = genai.GenerativeModel("gemini-2.0-flash-exp")

        # build prompt for slide content extraction
        prompt = """Analyze this educational video frame/slide and extract:

1. **Text Content**: All visible text (titles, bullet points, equations, labels)
2. **Visual Elements**: Types of diagrams, charts, or graphics present
3. **Key Concepts**: Main topics or concepts shown visually

Return your analysis in JSON format:
{
    "text_blocks": ["text1", "text2", ...],
    "visual_elements": ["diagram", "chart", "equation", ...],
    "key_concepts": ["concept1", "concept2", ...]
}

If the frame is mostly empty or contains no meaningful content, return empty arrays."""

        # call Gemini Vision API
        response = model.generate_content([prompt, pil_image])

        # parse response
        parsed_content = parse_gemini_vision_response(response.text, timestamp)

        logger.debug(
            "Frame analyzed",
            extra={
                "job_id": job_id,
                "timestamp": round(timestamp, 2),
                "text_blocks": len(parsed_content.get("text_blocks", [])),
            },
        )

        return parsed_content

    except Exception as e:
        logger.error(
            "Gemini Vision API call failed for frame",
            exc_info=e,
            extra={"job_id": job_id, "timestamp": round(timestamp, 2)},
        )
        return None


def parse_gemini_vision_response(response_text: str, timestamp: float) -> dict[str, Any]:
    """Parse Gemini Vision API response into structured format.

    Args:
        response_text: Raw response text from Gemini
        timestamp: Frame timestamp in seconds

    Returns:
        Dictionary with structured visual content
    """
    import json

    try:
        # remove markdown code blocks if present
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # parse JSON
        parsed = json.loads(cleaned)

        # add timestamp
        parsed["timestamp"] = timestamp

        # ensure required fields exist
        if "text_blocks" not in parsed:
            parsed["text_blocks"] = []
        if "visual_elements" not in parsed:
            parsed["visual_elements"] = []
        if "key_concepts" not in parsed:
            parsed["key_concepts"] = []

        return parsed

    except json.JSONDecodeError as e:
        logger.warning(
            f"Failed to parse Gemini Vision response as JSON: {e}",
            extra={"response_text": response_text[:200]},
        )

        # fallback: return response as single text block
        return {
            "timestamp": timestamp,
            "text_blocks": [response_text] if response_text.strip() else [],
            "visual_elements": [],
            "key_concepts": [],
        }


def aggregate_visual_content(
    frame_contents: list[dict[str, Any]], job_id: str
) -> dict[str, Any]:
    """Aggregate visual content from multiple frames into a summary.

    Args:
        frame_contents: List of visual content from each analyzed frame
        job_id: Job identifier for logging

    Returns:
        Aggregated visual content summary
    """
    all_text_blocks = []
    all_visual_elements = []
    all_key_concepts = []
    frame_data = []

    for content in frame_contents:
        timestamp = content.get("timestamp", 0)

        # collect all text blocks with timestamps
        for text in content.get("text_blocks", []):
            if text.strip():  # skip empty text
                all_text_blocks.append({"timestamp": timestamp, "text": text})

        # collect visual elements
        all_visual_elements.extend(content.get("visual_elements", []))

        # collect key concepts
        all_key_concepts.extend(content.get("key_concepts", []))

        # store frame-level data
        frame_data.append(
            {
                "timestamp": timestamp,
                "text_block_count": len(content.get("text_blocks", [])),
                "visual_element_count": len(content.get("visual_elements", [])),
            }
        )

    # deduplicate visual elements and concepts
    unique_visual_elements = list(set(all_visual_elements))
    unique_concepts = list(set(all_key_concepts))

    result = {
        "frames_analyzed": len(frame_contents),
        "total_text_blocks": len(all_text_blocks),
        "visual_elements_detected": len(unique_visual_elements),
        "text_blocks": all_text_blocks,  # list of {timestamp, text}
        "visual_elements": unique_visual_elements,  # deduplicated list
        "key_concepts": unique_concepts,  # deduplicated list
        "frame_data": frame_data,  # per-frame summary
    }

    logger.info(
        "Visual content aggregated",
        extra={
            "job_id": job_id,
            "frames": len(frame_contents),
            "text_blocks": len(all_text_blocks),
            "visual_elements": len(unique_visual_elements),
        },
    )

    return result


def store_visual_content_in_database(
    visual_content: dict[str, Any], job_id: str
) -> None:
    """Store extracted visual content in database.

    Args:
        visual_content: Visual content data
        job_id: Job identifier

    Raises:
        Exception: If database operation fails
    """
    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # create visual content record
        db_service.slide_content.create(
            content_id=str(uuid.uuid4()),
            job_id=job_id,
            frames_analyzed=visual_content["frames_analyzed"],
            text_blocks=visual_content["text_blocks"],
            visual_elements=visual_content["visual_elements"],
            key_concepts=visual_content["key_concepts"],
            frame_data=visual_content["frame_data"],
        )

        db.commit()

        logger.info(
            "Visual content stored in database",
            extra={
                "job_id": job_id,
                "frames_analyzed": visual_content["frames_analyzed"],
            },
        )

    except Exception as e:
        logger.error(
            "Failed to store visual content in database",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()


def get_safe_default_result(job_id: str) -> dict[str, Any]:
    """Return safe default result for Image Agent (on error).

    Args:
        job_id: Job identifier

    Returns:
        Safe default result dictionary
    """
    logger.warning(
        "Returning safe default Image Agent result due to error",
        extra={"job_id": job_id},
    )

    return {
        "job_id": job_id,
        "status": "failed",
        "frames_analyzed": 0,
        "total_text_blocks": 0,
        "visual_elements_detected": 0,
        "processing_time_seconds": 0.0,
    }
