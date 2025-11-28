"""Quiz generation API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from agents.quiz_agent import generate_quiz
from app.api.dependencies.clerk_auth import get_current_user_clerk
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


@router.get("/quizzes", response_model=list[dict])
def list_quizzes(
    current_user=Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
):
    """List all quizzes for the current user."""
    from app.models.database import Job, Quiz

    quizzes = (
        db.query(Quiz)
        .join(Job)
        .filter(Job.user_id == current_user.user_id)
        .order_by(Quiz.created_at.desc())
        .all()
    )

    return [
        {
            "id": q.quiz_id,
            "lectureTitle": q.job.filename,
            "lectureId": q.job_id,
            "questionsCount": q.num_questions,
            "difficulty": q.difficulty,
            "createdAt": q.created_at.isoformat(),
            "status": "completed",  # Quizzes are generated synchronously for now
        }
        for q in quizzes
    ]


@router.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(
    quiz_id: str,
    current_user=Depends(get_current_user_clerk),
    db: Session = Depends(get_db),
):
    """Get a specific quiz by ID."""
    from app.models.database import Job, Quiz
    from app.models.database import QuizQuestion as QuizQuestionDB
    from app.models.schemas import QuizQuestion

    # Fetch quiz and verify ownership
    quiz = (
        db.query(Quiz)
        .join(Job)
        .filter(Quiz.quiz_id == quiz_id)
        .filter(Job.user_id == current_user.user_id)
        .first()
    )

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Fetch questions
    questions_db = (
        db.query(QuizQuestionDB)
        .filter(QuizQuestionDB.quiz_id == quiz_id)
        .order_by(QuizQuestionDB.id)  # Use auto-increment id for stable ordering
        .all()
    )

    # Convert to Pydantic models
    questions = []
    for i, q in enumerate(questions_db):
        questions.append(
            QuizQuestion(
                id=i + 1,
                type=q.question_type,
                question=q.question_text,
                options=q.options,
                correctAnswer=q.correct_answer_index,
                explanation=q.explanation,
                difficulty=quiz.difficulty,
            )
        )

    return QuizResponse(
        job_id=quiz.job_id,
        questions=questions,
    )
