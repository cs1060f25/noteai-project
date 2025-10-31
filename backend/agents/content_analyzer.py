"""content analyzer agent using Google Gemini API."""

import json
import time
import uuid
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


def build_analysis_prompt(transcript_text: str) -> str:
    """build Gemini prompt for content analysis.

    Args:
        transcript_text: formatted transcript with timestamps

    Returns:
        complete prompt string for Gemini
    """
    prompt = f"""You are analyzing an educational lecture transcript to identify key content segments for highlight extraction.

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


def analyze_content(_transcript_data: dict, job_id: str) -> dict:
    """analyze transcript content and extract topics using Gemini.

    this agent processes video transcripts to identify key educational segments,
    assign importance scores, and extract metadata for highlight generation.

    Args:
        _transcript_data: unused (queries database directly)
        job_id: job identifier

    Returns:
        result dictionary with analysis statistics

    Raises:
        ValueError: if API key missing or no transcripts found
        Exception: if Gemini API or database operations fail
    """
    start_time = time.time()

    logger.info("content analysis started", extra={"job_id": job_id})

    try:
        # validate Gemini API key
        if not settings.gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY not configured in environment. "
                "Please set GEMINI_API_KEY in your .env file."
            )

        # create database session and query transcripts
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

        # build analysis prompt
        prompt = build_analysis_prompt(transcript_text)

        # configure and call Gemini API
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)

        logger.info(
            "calling Gemini API",
            extra={"job_id": job_id, "model": settings.gemini_model},
        )

        response = model.generate_content(prompt)

        logger.info(
            "Gemini API response received",
            extra={
                "job_id": job_id,
                "response_length": len(response.text),
            },
        )

        # parse response
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
