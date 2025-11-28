"""Quiz generation API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agents.quiz_agent import generate_quiz
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.schemas import QuizResponse
from pipeline.tasks import get_user_api_key

router = APIRouter()
logger = get_logger(__name__)


@router.post("/jobs/{job_id}/quiz", response_model=QuizResponse)
def create_quiz(
    job_id: str,
    num_questions: int = 5,
    difficulty: str = "medium",
    db: Session = Depends(get_db),
):
    """Generate a quiz for a specific job based on its transcript.

    Args:
        job_id: Job identifier
        num_questions: Number of questions to generate (default: 5)
        difficulty: Difficulty level (default: "medium")
        db: Database session

    Returns:
        QuizResponse containing generated questions
    """
    try:
        # Get user API key (decrypted)
        api_key = get_user_api_key(job_id)

        # Generate quiz
        quiz = generate_quiz(
            job_id=job_id,
            db=db,
            api_key=api_key,
            num_questions=num_questions,
            difficulty=difficulty,
        )

        return quiz

    except ValueError as e:
        logger.error(f"Quiz generation failed: {e!s}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error generating quiz: {e!s}")
        raise HTTPException(status_code=500, detail="Internal server error generating quiz") from e
