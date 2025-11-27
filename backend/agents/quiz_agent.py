"""Agent for generating quiz questions from transcripts."""

import json

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.settings import settings
from app.models.database import Transcript
from app.models.schemas import QuizQuestion, QuizResponse

logger = get_logger(__name__)


def generate_quiz(
    job_id: str,
    db: Session,
    api_key: str,
    num_questions: int = 5,
    difficulty: str = "medium",
) -> QuizResponse:
    """Generate quiz questions from the video transcript.

    Args:
        job_id: Job identifier
        db: Database session
        api_key: Gemini API key
        num_questions: Number of questions to generate
        difficulty: Difficulty level ('easy', 'medium', 'hard')

    Returns:
        QuizResponse containing generated questions

    Raises:
        ValueError: If transcript is missing or API key is invalid
    """
    logger.info(
        "Starting quiz generation",
        extra={
            "job_id": job_id,
            "num_questions": num_questions,
            "difficulty": difficulty,
        },
    )

    # 1. Fetch transcript from database
    transcript_segments = (
        db.query(Transcript)
        .filter(Transcript.job_id == job_id)
        .order_by(Transcript.start_time)
        .all()
    )

    if not transcript_segments:
        raise ValueError(
            "No transcript found for this job. Please wait for processing to complete."
        )

    # Combine transcript text
    full_transcript = " ".join([seg.text for seg in transcript_segments])

    # 2. Configure Gemini
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(settings.gemini_model)

    # 3. Construct Prompt
    prompt = f"""
    You are an expert educator. Create a {num_questions}-question quiz based on the following lecture transcript.

    Difficulty Level: {difficulty}

    Requirements:
    1. Questions must be directly answerable from the transcript.
    2. Questions should test understanding of key concepts, not just recall of minor details.
    3. Provide a clear explanation for the correct answer.
    4. Output MUST be valid JSON matching the specified schema.

    Transcript:
    "{full_transcript[:20000]}"  # Truncate to avoid token limits if necessary

    Output Schema (JSON list of objects):
    [
      {{
        "id": 1,
        "type": "multiple-choice" | "true-false",
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"] (or ["True", "False"]),
        "correctAnswer": 0 (index of correct option),
        "explanation": "Why this is correct",
        "difficulty": "{difficulty}"
      }}
    ]
    """

    # 4. Generate Content
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )

        # 5. Parse Response
        questions_data = json.loads(response.text)

        # Validate and convert to Pydantic models
        questions = []
        for i, q_data in enumerate(questions_data):
            # Ensure ID is sequential
            q_data["id"] = i + 1
            # Ensure difficulty matches requested (or fallback to what model gave)
            if "difficulty" not in q_data:
                q_data["difficulty"] = difficulty

            questions.append(QuizQuestion(**q_data))

        logger.info(
            "Quiz generation complete",
            extra={"job_id": job_id, "questions_count": len(questions)},
        )

        return QuizResponse(job_id=job_id, questions=questions)

    except Exception as e:
        logger.error("Quiz generation failed", exc_info=e, extra={"job_id": job_id})
        raise ValueError(f"Failed to generate quiz: {e!s}") from e
