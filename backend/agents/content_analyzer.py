"""content analyzer agent using Google Gemini API."""

import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import google.generativeai as genai
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService

logger = get_logger(__name__)

# content analysis parameters
MIN_IMPORTANCE_SCORE = 0.3  # filter segments below this score
MIN_SEGMENT_DURATION = 30  # minimum 30 seconds
MAX_SEGMENT_DURATION = 300  # maximum 5 minutes


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def format_transcript_for_gemini(transcripts: list[Any]) -> str:
    """format transcript segments into readable text with timestamps.

    Args:
        transcripts: list of Transcript objects

    Returns:
        formatted transcript string with timestamps
    """
    if not transcripts:
        return ""

    lines = []
    for transcript in transcripts:
        # format: [start - end]: "text"
        time_str = f"[{transcript.start_time:.1f}s - {transcript.end_time:.1f}s]"
        lines.append(f'{time_str}: "{transcript.text}"')

    return "\n".join(lines)


def build_analysis_prompt(
    transcript_text: str,
    layout_info: dict[str, Any] | None = None,
    custom_instructions: str | None = None,
    visual_content: dict[str, Any] | None = None,
) -> str:
    """build Gemini prompt for content analysis.

    Args:
        transcript_text: formatted transcript with timestamps
        layout_info: optional layout analysis data (type, regions, confidence)
        custom_instructions: optional user-provided AI instructions for focus areas
        visual_content: optional slide content data (text, visual elements, concepts)

    Returns:
        complete prompt string for Gemini
    """
    # build layout context section if available
    layout_context = ""
    if layout_info:
        layout_type = layout_info.get("layout_type", "unknown")
        confidence = layout_info.get("confidence_score", 0.0)

        # handle both real floats and mock objects
        try:
            confidence_value = float(confidence) if confidence is not None else 0.0
        except (TypeError, ValueError):
            confidence_value = 0.0

        layout_descriptions = {
            "side_by_side": "The video has a side-by-side layout with screen content (slides/presentation) on one half and camera (speaker) on the other half.",
            "picture_in_picture": "The video has a picture-in-picture layout with full-screen content and a small camera overlay in the corner.",
            "screen_only": "The video shows only screen content (slides, presentations, or demonstrations) without visible camera.",
            "camera_only": "The video shows only the speaker/camera without any screen sharing or slides.",
        }

        layout_desc = layout_descriptions.get(
            layout_type, "The video layout could not be determined."
        )

        if confidence_value > 0.6:
            layout_context = f"\nVIDEO LAYOUT INFORMATION:\n{layout_desc}\n(Detection confidence: {confidence_value:.0%})\n"
        elif confidence_value > 0.0:
            layout_context = f"\nVIDEO LAYOUT INFORMATION:\n{layout_desc}\n(Low confidence detection - layout may vary)\n"
        # if confidence is 0.0, it's a fallback default, so don't mention it

    # build custom instructions context section if provided
    custom_context = ""
    if custom_instructions:
        custom_context = f"""
USER INSTRUCTIONS (High Priority):
{custom_instructions}

Please prioritize the above user instructions while maintaining the structured output format below.
"""

    # build visual content section if available
    visual_context = ""
    if visual_content:
        text_blocks = visual_content.get("text_blocks", [])
        visual_elements = visual_content.get("visual_elements", [])
        key_concepts = visual_content.get("key_concepts", [])

        visual_context = "\nVISUAL CONTENT FROM SLIDES:\n"

        # handle both real lists and mock objects
        try:
            text_blocks_list = list(text_blocks) if text_blocks else []
        except (TypeError, ValueError):
            text_blocks_list = []

        try:
            visual_elements_list = list(visual_elements) if visual_elements else []
        except (TypeError, ValueError):
            visual_elements_list = []

        try:
            key_concepts_list = list(key_concepts) if key_concepts else []
        except (TypeError, ValueError):
            key_concepts_list = []

        if text_blocks_list:
            visual_context += f"Extracted text from {len(text_blocks_list)} slide frames:\n"
            # Include sample text blocks (limit to avoid prompt bloat)
            for block in text_blocks_list[:10]:  # max 10 text blocks
                timestamp = block.get("timestamp", 0) if isinstance(block, dict) else 0
                text = block.get("text", "") if isinstance(block, dict) else ""
                visual_context += f"  [{timestamp:.1f}s]: {text[:200]}\n"  # max 200 chars each
            if len(text_blocks_list) > 10:
                visual_context += f"  ... and {len(text_blocks_list) - 10} more text blocks\n"

        if visual_elements_list:
            visual_context += (
                f"Visual elements detected: {', '.join(str(e) for e in visual_elements_list)}\n"
            )

        if key_concepts_list:
            visual_context += f"Key concepts identified visually: {', '.join(str(c) for c in key_concepts_list)}\n"

    prompt = f"""You are analyzing an educational lecture transcript to identify key content segments for highlight extraction.
{layout_context}{custom_context}{visual_context}
TRANSCRIPT (time-stamped):
{transcript_text}

TASK:
Identify 5-15 distinct educational segments. For each segment:

1. **start_time** and **end_time** (in seconds, from the transcript timestamps)
2. **topic** (concise title, maximum 100 characters)
3. **description** (2-3 sentence summary of what's covered)
4. **importance_score** (float 0.0-1.0):
   - 0.9-1.0: Core concepts, critical explanations, fundamental principles
   - 0.7-0.8: Important examples, key details, significant demonstrations
   - 0.5-0.6: Supporting content, additional context, review material
   - 0.3-0.4: Minor topics, tangential discussions
   - 0.0-0.2: Off-topic content, administrative notes, digressions
5. **keywords** (list of 5-10 key terms)
6. **concepts** (list of 2-5 academic concepts or learning objectives)

RULES:
- Segments should be {MIN_SEGMENT_DURATION} seconds to {MAX_SEGMENT_DURATION // 60} minutes long
- No overlapping segments
- Segments must be in chronological order
- Focus on educational value and learning outcomes
- Use exact timestamps from the transcript

OUTPUT FORMAT (return ONLY valid JSON, no markdown):
{{
  "segments": [
    {{
      "start_time": 0.0,
      "end_time": 125.5,
      "topic": "Introduction to Neural Networks",
      "description": "Overview of artificial neural networks...",
      "importance_score": 0.85,
      "keywords": ["neural networks", "AI", "machine learning"],
      "concepts": ["supervised learning", "backpropagation"]
    }}
  ]
}}"""

    return prompt


def parse_gemini_response(response_text: str) -> dict:
    """parse JSON from Gemini response, handling markdown code blocks.

    Args:
        response_text: raw response text from Gemini

    Returns:
        parsed JSON dictionary

    Raises:
        ValueError: if JSON parsing fails
    """
    # handle markdown code blocks
    json_text = response_text.strip()

    # extract JSON from markdown code blocks if present
    if "```json" in json_text:
        # extract content between ```json and ```
        json_text = json_text.split("```json")[1].split("```")[0].strip()
    elif "```" in json_text:
        # extract content between ``` and ```
        json_text = json_text.split("```")[1].split("```")[0].strip()

    # parse JSON
    try:
        data = json.loads(json_text)
        return data
    except json.JSONDecodeError as e:
        logger.error(
            "failed to parse Gemini JSON response",
            exc_info=e,
            extra={"response_preview": json_text[:500]},
        )
        raise ValueError(f"Invalid JSON from Gemini API: {e}") from e


def validate_and_enrich_segments(
    segments: list[dict], job_id: str, min_score: float = MIN_IMPORTANCE_SCORE
) -> list[dict]:
    """validate, filter, and add metadata to segments.

    Args:
        segments: raw segments from Gemini
        job_id: job identifier
        min_score: minimum importance score threshold

    Returns:
        validated and enriched segments list
    """
    enriched_segments = []
    filtered_count = 0

    for idx, segment in enumerate(segments):
        # filter by importance score
        importance_score = segment.get("importance_score", 0.0)
        if importance_score < min_score:
            filtered_count += 1
            logger.info(
                "filtering low-importance segment",
                extra={
                    "job_id": job_id,
                    "topic": segment.get("topic"),
                    "importance_score": importance_score,
                    "min_score": min_score,
                },
            )
            continue

        # add required metadata
        segment["segment_id"] = str(uuid.uuid4())
        segment["job_id"] = job_id

        # calculate duration
        start_time = segment.get("start_time", 0.0)
        end_time = segment.get("end_time", 0.0)
        segment["duration"] = end_time - start_time

        # add segment order
        segment["segment_order"] = idx + 1

        # ensure keywords and concepts are lists
        if not isinstance(segment.get("keywords"), list):
            segment["keywords"] = []
        if not isinstance(segment.get("concepts"), list):
            segment["concepts"] = []

        # ensure description exists
        if not segment.get("description"):
            segment["description"] = (
                f"Educational content about {segment.get('topic', 'this topic')}"
            )

        enriched_segments.append(segment)

    logger.info(
        "segments validated and enriched",
        extra={
            "job_id": job_id,
            "total_segments": len(segments),
            "filtered_segments": filtered_count,
            "enriched_segments": len(enriched_segments),
        },
    )

    return enriched_segments


def store_content_segments(segments: list[dict], job_id: str) -> None:
    """store content segments in database.

    Args:
        segments: list of validated segment dictionaries
        job_id: job identifier

    Raises:
        Exception: if database operation fails
    """
    if not segments:
        logger.info("no content segments to store", extra={"job_id": job_id})
        return

    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # bulk create content segments
        db_service.content_segments.bulk_create(segments)
        db.commit()

        logger.info(
            "content segments stored in database",
            extra={"job_id": job_id, "count": len(segments)},
        )

    except Exception as e:
        logger.error(
            "failed to store content segments",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()


def split_transcript_into_chunks(
    transcript_text: str, chunk_size: int = 5000, overlap: int = 500
) -> list[str]:
    """split large transcript into overlapping chunks for parallel processing.

    Args:
        transcript_text: full transcript text
        chunk_size: maximum characters per chunk
        overlap: number of characters to overlap between chunks

    Returns:
        list of transcript chunks
    """
    if len(transcript_text) <= chunk_size:
        return [transcript_text]

    chunks = []
    start = 0

    while start < len(transcript_text):
        end = min(start + chunk_size, len(transcript_text))

        # try to break at newline for cleaner chunks
        if end < len(transcript_text):
            newline_pos = transcript_text.rfind("\n", start, end)
            if newline_pos > start:
                end = newline_pos + 1

        chunks.append(transcript_text[start:end])
        start = end - overlap if end < len(transcript_text) else end

    return chunks


def analyze_chunk_with_gemini(
    chunk_text: str,
    job_id: str,
    chunk_idx: int,
    api_key: str,
    layout_info: dict[str, Any] | None = None,
    custom_instructions: str | None = None,
    visual_content: dict[str, Any] | None = None,
) -> list[dict]:
    """analyze a single transcript chunk with Gemini API.

    Args:
        chunk_text: chunk of transcript text
        job_id: job identifier for logging
        chunk_idx: index of this chunk
        api_key: Gemini API key
        layout_info: optional layout analysis data to provide context
        custom_instructions: optional user-provided AI instructions
        visual_content: optional slide content data to provide context

    Returns:
        list of segment dictionaries from Gemini
    """
    logger.info(
        f"Analyzing chunk {chunk_idx + 1} with Gemini",
        extra={
            "job_id": job_id,
            "chunk_size": len(chunk_text),
            "has_custom_instructions": bool(custom_instructions),
        },
    )

    prompt = build_analysis_prompt(chunk_text, layout_info, custom_instructions, visual_content)

    # log prompt details for debugging (first 800 chars only for chunks)
    prompt_preview = prompt[:800] + "..." if len(prompt) > 800 else prompt
    logger.info(
        f"Chunk {chunk_idx + 1} prompt (has_custom_instructions={bool(custom_instructions)}):\n{prompt_preview}",
        extra={"job_id": job_id},
    )

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(settings.gemini_model)

    response = model.generate_content(prompt)
    parsed_data = parse_gemini_response(response.text)
    segments = parsed_data.get("segments", [])

    logger.info(
        f"Chunk {chunk_idx + 1} analyzed",
        extra={"job_id": job_id, "segments_found": len(segments)},
    )

    return segments


def merge_and_deduplicate_segments(
    chunk_results: list[list[dict]], overlap_threshold: float = 5.0
) -> list[dict]:
    """merge segments from parallel chunk analysis and remove duplicates.

    Args:
        chunk_results: list of segment lists from each chunk
        overlap_threshold: seconds of overlap to consider segments duplicates

    Returns:
        merged and deduplicated segment list
    """
    all_segments = []
    for segments in chunk_results:
        all_segments.extend(segments)

    # sort by start time
    all_segments.sort(key=lambda s: s.get("start_time", 0))

    # remove near-duplicate segments (from overlapping chunks)
    deduplicated = []
    for segment in all_segments:
        is_duplicate = False

        for existing in deduplicated:
            time_diff = abs(segment.get("start_time", 0) - existing.get("start_time", 0))
            if time_diff < overlap_threshold:
                # keep segment with higher importance score
                if segment.get("importance_score", 0) > existing.get("importance_score", 0):
                    deduplicated.remove(existing)
                    deduplicated.append(segment)
                is_duplicate = True
                break

        if not is_duplicate:
            deduplicated.append(segment)

    # re-sort after deduplication
    deduplicated.sort(key=lambda s: s.get("start_time", 0))

    return deduplicated


def analyze_content(
    _transcript_data: dict, job_id: str, api_key: str | None = None, config: dict | None = None
) -> dict:
    """analyze transcript content and extract topics using Gemini.

    this agent processes video transcripts to identify key educational segments,
    assign importance scores, and extract metadata for highlight generation.

    Args:
        _transcript_data: unused (queries database directly)
        job_id: job identifier
        config: optional processing configuration (includes custom prompt)
        api_key: Gemini API key (required)
        config: optional processing configuration (includes custom prompt)

    Returns:
        result dictionary with analysis statistics

    Raises:
        ValueError: if API key missing or no transcripts found
        Exception: if Gemini API or database operations fail
    """
    start_time = time.time()

    logger.info("content analysis started", extra={"job_id": job_id})

    # retrieve custom prompt from config or database
    custom_prompt = None
    if config:
        custom_prompt = config.get("prompt")
    else:
        # fallback: retrieve from database if config not provided
        db_temp = get_db_session()
        try:
            db_service_temp = DatabaseService(db_temp)
            job = db_service_temp.jobs.get_by_id(job_id)
            if job and job.extra_metadata:
                processing_config = job.extra_metadata.get("processing_config", {})
                custom_prompt = processing_config.get("prompt")
        except Exception as e:
            logger.warning(
                "Failed to retrieve custom prompt from database, using default",
                exc_info=e,
                extra={"job_id": job_id},
            )
        finally:
            db_temp.close()

    if custom_prompt:
        logger.info(
            "Using custom AI instructions",
            extra={"job_id": job_id, "prompt_preview": custom_prompt[:100]},
        )
    else:
        logger.info("Using default AI instructions", extra={"job_id": job_id})

    try:
        # validate Gemini API key
        if not api_key:
            # Fallback to settings if not provided (legacy support or system key)
            api_key = settings.gemini_api_key

        if not api_key:
            raise ValueError("Gemini API key is missing. Please add your API key in Settings.")

        # defensive: ensure api_key is a clean string
        api_key = api_key.strip() if api_key else None

        # create database session and query transcripts + layout
        db = get_db_session()
        try:
            db_service = DatabaseService(db)

            # query transcripts from database
            transcripts = db_service.transcripts.get_by_job_id(job_id)

            if not transcripts:
                raise ValueError(
                    f"No transcripts found for job {job_id}. "
                    "Transcript agent must complete before content analysis."
                )

            logger.info(
                "transcripts retrieved",
                extra={"job_id": job_id, "transcript_count": len(transcripts)},
            )

            # query layout analysis if available (vision pipeline only)
            layout_analysis = db_service.layout_analysis.get_by_job_id(job_id)
            layout_info = None

            if layout_analysis:
                layout_info = {
                    "layout_type": layout_analysis.layout_type,
                    "screen_region": layout_analysis.screen_region,
                    "camera_region": layout_analysis.camera_region,
                    "split_ratio": layout_analysis.split_ratio,
                    "confidence_score": layout_analysis.confidence_score,
                }

                logger.info(
                    "layout analysis retrieved",
                    extra={
                        "job_id": job_id,
                        "layout_type": layout_analysis.layout_type,
                        "confidence": layout_analysis.confidence_score,
                    },
                )
            else:
                logger.info(
                    "no layout analysis found (audio pipeline or vision not yet complete)",
                    extra={"job_id": job_id},
                )

            # query slide content if available (Image Agent in vision pipeline)
            slide_content = db_service.slide_content.get_by_job_id(job_id)
            visual_content = None

            if slide_content:
                visual_content = {
                    "frames_analyzed": slide_content.frames_analyzed,
                    "text_blocks": slide_content.text_blocks,
                    "visual_elements": slide_content.visual_elements,
                    "key_concepts": slide_content.key_concepts,
                }

                logger.info(
                    "slide content retrieved",
                    extra={
                        "job_id": job_id,
                        "frames_analyzed": slide_content.frames_analyzed,
                        "text_blocks": len(slide_content.text_blocks),
                    },
                )
            else:
                logger.info(
                    "no slide content found (audio pipeline or Image Agent not yet complete)",
                    extra={"job_id": job_id},
                )

        finally:
            db.close()

        # format transcripts for Gemini
        transcript_text = format_transcript_for_gemini(transcripts)

        logger.info(
            "transcripts formatted for analysis",
            extra={
                "job_id": job_id,
                "transcript_length": len(transcript_text),
                "transcript_segments": len(transcripts),
            },
        )

        # parallel processing for large transcripts (> 15000 chars ~ 20+ min video)
        if len(transcript_text) > 15000:
            logger.info(
                "Using PARALLEL content analysis for large transcript",
                extra={
                    "job_id": job_id,
                    "transcript_length": len(transcript_text),
                },
            )

            # split into overlapping chunks
            chunks = split_transcript_into_chunks(transcript_text, chunk_size=5000, overlap=500)

            logger.info(
                f"Split transcript into {len(chunks)} chunks",
                extra={"job_id": job_id, "num_chunks": len(chunks)},
            )

            # analyze chunks in parallel (3 at a time)
            chunk_results = []
            with ThreadPoolExecutor(max_workers=3) as executor:
                future_to_idx = {
                    executor.submit(
                        analyze_chunk_with_gemini,
                        chunk,
                        job_id,
                        idx,
                        api_key,
                        layout_info,
                        custom_prompt,
                        visual_content,
                    ): idx
                    for idx, chunk in enumerate(chunks)
                }

                for future in as_completed(future_to_idx):
                    idx = future_to_idx[future]
                    try:
                        segments = future.result()
                        chunk_results.append(segments)
                    except Exception as e:
                        logger.error(
                            f"Chunk {idx + 1} analysis failed",
                            exc_info=e,
                            extra={"job_id": job_id},
                        )
                        raise

            # merge and deduplicate results
            raw_segments = merge_and_deduplicate_segments(chunk_results)

            logger.info(
                "Parallel content analysis complete",
                extra={
                    "job_id": job_id,
                    "chunks_analyzed": len(chunks),
                    "raw_segments": len(raw_segments),
                },
            )

        else:
            # single API call for smaller transcripts
            logger.info(
                "Using SINGLE content analysis for small transcript",
                extra={
                    "job_id": job_id,
                    "transcript_length": len(transcript_text),
                },
            )

            prompt = build_analysis_prompt(
                transcript_text, layout_info, custom_prompt, visual_content
            )

            # log the actual prompt being sent to Gemini (for debugging)
            prompt_preview = prompt[:1200] + "..." if len(prompt) > 1200 else prompt
            logger.info(
                f"Prompt built for Gemini API (length={len(prompt)}, "
                f"has_custom_instructions={bool(custom_prompt)})\n"
                f"PROMPT PREVIEW:\n{prompt_preview}",
                extra={"job_id": job_id},
            )

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(settings.gemini_model)

            response = model.generate_content(prompt)

            logger.info(
                "Gemini API response received",
                extra={
                    "job_id": job_id,
                    "response_length": len(response.text),
                },
            )

            parsed_data = parse_gemini_response(response.text)
            raw_segments = parsed_data.get("segments", [])

            logger.info(
                "response parsed",
                extra={"job_id": job_id, "raw_segments": len(raw_segments)},
            )

        # validate and enrich segments
        validated_segments = validate_and_enrich_segments(raw_segments, job_id)

        # store segments in database
        store_content_segments(validated_segments, job_id)

        # calculate statistics
        processing_time = time.time() - start_time
        filtered_count = len(raw_segments) - len(validated_segments)

        result = {
            "job_id": job_id,
            "status": "completed",
            "segments_created": len(validated_segments),
            "segments_filtered": filtered_count,
            "total_segments_analyzed": len(raw_segments),
            "processing_time_seconds": round(processing_time, 2),
            "model_used": settings.gemini_model,
        }

        logger.info(
            "content analysis completed successfully",
            extra={
                "job_id": job_id,
                "segments_created": len(validated_segments),
                "segments_filtered": filtered_count,
                "processing_time": round(processing_time, 2),
            },
        )

        return result

    except Exception as e:
        logger.error("content analysis failed", exc_info=e, extra={"job_id": job_id})
        raise
