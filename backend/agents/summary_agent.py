"""Summary agent for generating AI-powered lecture summaries using Google Gemini API."""

import json
import time
import uuid

import google.generativeai as genai
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.logging import get_logger
from app.core.settings import settings
from app.services.db_service import DatabaseService

logger = get_logger(__name__)


def get_db_session():
    """create database session for agent."""
    engine = create_engine(settings.database_url)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def format_transcript_for_summary(transcripts: list, content_segments: list) -> str:
    """format transcript segments into readable text for summary generation.

    Args:
        transcripts: list of Transcript objects
        content_segments: list of ContentSegment objects

    Returns:
        formatted transcript string with topic boundaries
    """
    if not transcripts:
        return ""

    # group transcripts by content segments for better context
    lines = []

    # add high-importance segments as context
    if content_segments:
        lines.append("=== KEY TOPICS ===")
        for segment in sorted(content_segments, key=lambda s: s.importance_score, reverse=True)[:5]:
            lines.append(
                f"• [{segment.start_time:.1f}s] {segment.topic} (importance: {segment.importance_score:.2f})"
            )
        lines.append("\n=== FULL TRANSCRIPT ===")

    # add transcript with timestamps
    for transcript in transcripts:
        time_str = f"[{transcript.start_time:.1f}s]"
        lines.append(f"{time_str} {transcript.text}")

    return "\n".join(lines)


def build_summary_prompt(
    transcript_text: str, segments_metadata: list, size: str = "medium", style: str = "academic"
) -> str:
    """build Gemini prompt for summary generation.

    Args:
        transcript_text: formatted transcript with timestamps
        segments_metadata: list of content segment metadata
        size: summary size (brief, medium, detailed)
        style: summary style (academic, casual, concise)

    Returns:
        complete prompt string for Gemini
    """
    topics_list = [s.topic for s in segments_metadata] if segments_metadata else []

    # configure word count based on size
    size_config = {
        "brief": {"words": "200-300", "takeaways": "2-3"},
        "medium": {"words": "500-800", "takeaways": "3-5"},
        "detailed": {"words": "1000-1500", "takeaways": "5-7"},
    }
    config = size_config.get(size, size_config["medium"])

    # configure style instructions
    style_instructions = {
        "academic": "Use formal, scholarly language. Structure paragraphs with topic sentences. Include academic terminology and precise definitions.",
        "casual": "Use conversational, accessible language. Write as if explaining to a friend. Avoid jargon and use everyday examples.",
        "concise": "Use brief, direct language. Focus on bullet-point clarity. Emphasize key facts over explanations.",
    }
    style_instruction = style_instructions.get(style, style_instructions["academic"])

    prompt = f"""You are analyzing an educational lecture transcript to create a comprehensive summary.

TRANSCRIPT:
{transcript_text}

SUMMARY REQUIREMENTS:
- Size: {config['words']} words
- Style: {style} - {style_instruction}

TASK:
Generate a structured summary with:
1. **summary_text** ({config['words']} words): Synthesize the main educational content, explaining key concepts and their relationships
2. **key_takeaways** ({config['takeaways']} items): Most important concepts to remember
3. **topics_covered** (list): Main subjects discussed in chronological order
4. **learning_objectives** (3-5 items): What students should understand after this lecture

RULES:
- Focus on educational value and learning outcomes
- {style_instruction}
- Connect concepts and show relationships
- Prioritize the most important information
- Ensure word count matches the {size} size requirement

OUTPUT FORMAT (return ONLY valid JSON, no markdown):
{{
  "summary_text": "comprehensive summary here...",
  "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "topics_covered": {json.dumps(topics_list) if topics_list else '["topic 1", "topic 2"]'},
  "learning_objectives": ["objective 1", "objective 2", "objective 3"]
}}"""

    return prompt


def parse_summary_response(response_text: str) -> dict:
    """parse JSON from Gemini response, handling markdown code blocks.

    Args:
        response_text: raw response text from Gemini

    Returns:
        parsed JSON dictionary

    Raises:
        ValueError: if JSON parsing fails
    """
    json_text = response_text.strip()

    # extract JSON from markdown code blocks if present
    if "```json" in json_text:
        json_text = json_text.split("```json")[1].split("```")[0].strip()
    elif "```" in json_text:
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


def store_summary(summary_data: dict, job_id: str) -> None:
    """store summary in database.

    Args:
        summary_data: summary data dictionary
        job_id: job identifier

    Raises:
        Exception: if database operation fails
    """
    db = get_db_session()
    try:
        db_service = DatabaseService(db)

        # check if summary already exists
        existing_summary = db_service.summaries.get_by_job_id(job_id)
        if existing_summary:
            # delete existing summary to replace it
            db_service.summaries.delete_by_job_id(job_id)
            db.commit()

        # create new summary
        db_service.summaries.create(summary_data)
        db.commit()

        logger.info(
            "summary stored in database",
            extra={"job_id": job_id, "summary_id": summary_data["summary_id"]},
        )

    except Exception as e:
        logger.error(
            "failed to store summary",
            exc_info=e,
            extra={"job_id": job_id},
        )
        db.rollback()
        raise
    finally:
        db.close()


def generate_summary(
    job_id: str, api_key: str | None = None, size: str = "medium", style: str = "academic"
) -> dict:
    """generate summary from lecture transcript using Gemini.

    Args:
        job_id: job identifier
        api_key: Gemini API key (optional, falls back to user's encrypted key)
        size: summary size (brief, medium, detailed)
        style: summary style (academic, casual, concise)

    Returns:
        result dictionary with summary metadata

    Raises:
        ValueError: if API key missing or no transcripts found
        Exception: if Gemini API or database operations fail
    """
    start_time = time.time()

    logger.info(
        "summary generation started",
        extra={"job_id": job_id, "size": size, "style": style},
    )

    try:
        # get user's encrypted API key if not provided
        if not api_key:
            from app.core.security import decrypt_string

            db = get_db_session()
            try:
                db_service = DatabaseService(db)
                job = db_service.jobs.get_by_id(job_id)
                if not job:
                    raise ValueError(f"Job not found: {job_id}")

                if not job.user or not job.user.gemini_api_key_encrypted:
                    raise ValueError(
                        "Gemini API key is missing. Please add your API key in Settings."
                    )

                try:
                    api_key = decrypt_string(
                        job.user.gemini_api_key_encrypted, settings.api_key_encryption_secret
                    )
                except Exception as e:
                    logger.error("Failed to decrypt API key", exc_info=e, extra={"job_id": job_id})
                    raise ValueError("Invalid API key configuration") from e
            finally:
                db.close()

        if not api_key:
            raise ValueError("Gemini API key is missing. Please add your API key in Settings.")

        # retrieve transcripts and content segments from database
        db = get_db_session()
        try:
            db_service = DatabaseService(db)

            transcripts = db_service.transcripts.get_by_job_id(job_id)
            if not transcripts:
                raise ValueError(
                    f"No transcripts found for job {job_id}. "
                    "Transcript agent must complete before summary generation."
                )

            content_segments = db_service.content_segments.get_by_job_id(job_id)

            logger.info(
                "data retrieved from database",
                extra={
                    "job_id": job_id,
                    "transcript_count": len(transcripts),
                    "segment_count": len(content_segments),
                },
            )

        finally:
            db.close()

        # format transcript for summary prompt
        transcript_text = format_transcript_for_summary(transcripts, content_segments)

        # build prompt with size and style parameters
        prompt = build_summary_prompt(transcript_text, content_segments, size=size, style=style)

        logger.info(
            "calling Gemini API for summary generation",
            extra={
                "job_id": job_id,
                "prompt_length": len(prompt),
                "size": size,
                "style": style,
            },
        )

        # call Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(prompt)

        # parse response
        parsed_data = parse_summary_response(response.text)

        # calculate word count
        summary_text = parsed_data.get("summary_text", "")
        word_count = len(summary_text.split())

        # prepare summary data for storage
        summary_id = str(uuid.uuid4())
        summary_data = {
            "summary_id": summary_id,
            "job_id": job_id,
            "summary_text": summary_text,
            "key_takeaways": parsed_data.get("key_takeaways", []),
            "topics_covered": parsed_data.get("topics_covered", []),
            "learning_objectives": parsed_data.get("learning_objectives", []),
            "word_count": word_count,
            "model_used": settings.gemini_model,
        }

        # store in database
        store_summary(summary_data, job_id)

        # calculate statistics
        processing_time = time.time() - start_time

        result = {
            "job_id": job_id,
            "summary_id": summary_id,
            "status": "completed",
            "word_count": word_count,
            "key_takeaways_count": len(parsed_data.get("key_takeaways", [])),
            "topics_count": len(parsed_data.get("topics_covered", [])),
            "processing_time_seconds": round(processing_time, 2),
            "model_used": settings.gemini_model,
        }

        logger.info(
            "summary generation completed successfully",
            extra={
                "job_id": job_id,
                "summary_id": summary_id,
                "word_count": word_count,
                "processing_time": processing_time,
            },
        )

        return result

    except Exception as e:
        logger.error("summary generation failed", exc_info=e, extra={"job_id": job_id})
        raise
