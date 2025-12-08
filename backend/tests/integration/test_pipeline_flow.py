import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

import agents.quiz_agent
import agents.summary_agent
from app.models.database import (
    Clip,
    ContentSegment,
    Job,
    ProcessingLog,
    Quiz,
    QuizQuestion,
    Summary,
    Transcript,
)
from app.models.user import User
from pipeline.tasks import process_video_optimized


@pytest.fixture
def mock_pipeline_services(db, tmp_path):
    """
    Mock Agent entry points and external services.
    Agents are mocked to perform their DB side effects (creating artifacts)
    so the pipeline flow can be verified.
    """
    # Create real dummy media files for FFmpeg operations
    import subprocess

    dummy_video = tmp_path / "test_video.mp4"
    dummy_audio = tmp_path / "test_audio.wav"

    # Create a 1-second black video with silent audio using FFmpeg
    subprocess.run(
        [
            "ffmpeg",
            "-f",
            "lavfi",
            "-i",
            "color=black:s=1280x720:d=1",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo:d=1",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-y",
            str(dummy_video),
        ],
        check=True,
        capture_output=True,
    )

    # Create a 1-second silent audio file
    subprocess.run(
        [
            "ffmpeg",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo:d=1",
            "-c:a",
            "pcm_s16le",
            "-y",
            str(dummy_audio),
        ],
        check=True,
        capture_output=True,
    )

    # Patch functions where they are USED in pipeline.tasks
    with (
        patch("pipeline.tasks.s3_service") as mock_s3,
        patch("pipeline.tasks.download_video_from_s3_to_temp") as mock_download_video,
        patch("pipeline.tasks.download_audio_from_s3_to_temp") as mock_download_audio,
        patch("pipeline.tasks.generate_transcript") as mock_transcript,
        patch("pipeline.tasks.detect_silence") as mock_silence,
        patch("pipeline.tasks.analyze_content") as mock_content,
        patch("pipeline.tasks.extract_segments") as mock_segments,
        patch("pipeline.tasks.compile_clips") as mock_compile,
        patch("agents.quiz_agent.generate_quiz") as mock_quiz,
        patch("agents.summary_agent.generate_summary") as mock_summary,
    ):
        # 1. S3 & Downloads - return paths to real dummy files
        mock_s3.object_exists.return_value = True
        mock_s3.generate_presigned_url.return_value = "http://mock-s3/video.mp4"
        mock_download_video.return_value = str(dummy_video)
        mock_download_audio.return_value = str(dummy_audio)

        # 2. Transcript Agent
        def side_effect_transcript(job_id, **kwargs):
            t1 = Transcript(
                segment_id=f"seg_{uuid.uuid4()}",
                job_id=job_id,
                start_time=0.0,
                end_time=10.0,
                text="Welcome to AI.",
            )
            db.add(t1)
            db.commit()
            return {
                "job_id": job_id,
                "status": "completed",
                "total_segments": 1,
                "total_transcript_duration": 10.0,
                "average_confidence": 0.9,
                "language": "en",
                "processing_time_seconds": 1.0,
            }

        mock_transcript.side_effect = side_effect_transcript

        # 3. Silence Detector
        def side_effect_silence(s3_key, job_id, **kwargs):
            return {
                "job_id": job_id,
                "status": "completed",
                "silence_regions": [],
                "processing_time_seconds": 0.5,
            }

        mock_silence.side_effect = side_effect_silence

        # 4. Content Analyzer
        def side_effect_content(_transcript_data, job_id, **kwargs):
            cs = ContentSegment(
                segment_id=f"cs_{uuid.uuid4()}",
                job_id=job_id,
                start_time=0.0,
                end_time=10.0,
                duration=10.0,
                topic="Intro",
                description="Intro to AI",
                importance_score=0.9,
                segment_order=1,
            )
            db.add(cs)
            db.commit()
            return {
                "job_id": job_id,
                "status": "completed",
                "segments_created": 1,
                "segments_filtered": 0,
                "total_segments_analyzed": 1,
                "processing_time_seconds": 1.0,
                "model_used": "gemini-1.5-flash",
            }

        mock_content.side_effect = side_effect_content

        # 5. Quiz Agent
        def side_effect_quiz(job_id, db, **kwargs):
            quiz_id = f"quiz_{uuid.uuid4()}"
            quiz = Quiz(
                quiz_id=quiz_id,
                job_id=job_id,
                title="Test Quiz",
                difficulty="medium",
                total_questions=1,
            )
            db.add(quiz)

            q = QuizQuestion(
                question_id=f"q_{uuid.uuid4()}",
                quiz_id=quiz_id,
                question_text="What is AI?",
                question_type="multiple-choice",
                options=["Magic", "Math"],
                correct_answer_index=1,
                question_order=1,
            )
            db.add(q)
            db.commit()
            return MagicMock(questions=[q])

        mock_quiz.side_effect = side_effect_quiz

        # 6. Summary Agent
        def side_effect_summary(job_id, **kwargs):
            summary = Summary(
                summary_id=f"sum_{uuid.uuid4()}",
                job_id=job_id,
                summary_text="AI is math.",
                key_takeaways=["Math is hard"],
                topics_covered=["AI"],
                word_count=10,
            )
            db.add(summary)
            db.commit()
            return {"summary_text": "AI is math."}

        mock_summary.side_effect = side_effect_summary

        # 7. Segment Extractor (Clips)
        def side_effect_segments(_content_data, _silence_data, _transcript_data, job_id, **kwargs):
            clip = Clip(
                clip_id=f"clip_{uuid.uuid4()}",
                job_id=job_id,
                title="Intro Clip",
                topic="Intro",
                importance_score=0.9,
                start_time=0.0,
                end_time=10.0,
                duration=10.0,
                clip_order=1,
                s3_key="clips/clip1.mp4",
            )
            db.add(clip)
            db.commit()
            return {
                "job_id": job_id,
                "status": "completed",
                "selected_segments": [{"clip_id": clip.clip_id}],
                "segments_analyzed": 1,
                "segments_created": 1,
                "silence_regions_available": 0,
                "processing_time_seconds": 1.0,
            }

        mock_segments.side_effect = side_effect_segments

        # 8. Video Compiler
        mock_compile.return_value = ["clips/clip1.mp4"]

        yield {"transcript": mock_transcript, "quiz": mock_quiz, "summary": mock_summary}


@pytest.fixture
def mock_shared_db_engine(db):
    """Patch create_engine in all modules to return the test DB engine."""
    engine = db.get_bind()

    modules_to_patch = [
        "pipeline.tasks",
        "agents.silence_detector",
        "agents.transcript_agent",
        "agents.content_analyzer",
        "agents.segment_extractor",
        "agents.layout_detector",
        "agents.image_agent",
        "agents.summary_agent",
    ]

    patches = []
    for module in modules_to_patch:
        p = patch(f"{module}.create_engine", return_value=engine)
        p.start()
        patches.append(p)

    yield

    for p in patches:
        p.stop()


def test_full_video_processing_flow(db: Session, mock_pipeline_services, mock_shared_db_engine):
    """
    Test the full video processing pipeline.

    This test runs the 'process_video_optimized' task synchronously.
    It mocks the Agent entry points to simulate their work (DB creation)
    without running their internal logic (external API calls).

    Since the pipeline task itself does not trigger Quiz/Summary generation (triggered via API),
    we manually call these agents here to verify the full flow expected by the user.
    """
    # 1. Setup Data
    user = User(
        user_id="test_user",
        email="test@example.com",
        clerk_user_id="mock_clerk_user_id",
        gemini_api_key_encrypted="encrypted_key",
        email_notifications=True,
        processing_notifications=True,
    )
    db.add(user)

    job = Job(
        job_id="job_integration_1",
        user_id="test_user",
        filename="test_lecture.mp4",
        file_size=1000,
        content_type="video/mp4",
        original_s3_key="uploads/test_lecture.mp4",
        status="queued",
        extra_metadata={"processing_config": {"processing_mode": "vision"}},
    )
    db.add(job)
    db.commit()

    # 2. Mock Decryption & Run
    with patch("app.core.security.decrypt_string", return_value="mock_api_key"):
        # Run the pipeline
        process_video_optimized(job_id="job_integration_1")

        # Manually trigger Quiz and Summary generation (simulating API calls)
        # These are mocked in mock_pipeline_services to write to DB
        agents.quiz_agent.generate_quiz(job_id="job_integration_1", db=db, api_key="mock_api_key")
        agents.summary_agent.generate_summary(job_id="job_integration_1", api_key="mock_api_key")

    # 3. Verify Database State
    db.refresh(job)

    # A. Job Status
    assert job.status == "completed"
    assert job.progress_percent == 100.0

    # B. Artifacts
    assert len(job.transcripts) == 1
    assert len(job.content_segments) == 1
    assert len(job.quizzes) == 1
    assert job.summary is not None
    assert len(job.clips) == 1

    # C. Processing Logs
    # Check that logs were created for stages
    logs = db.query(ProcessingLog).filter(ProcessingLog.job_id == job.job_id).all()
    stages = [log.stage for log in logs]
    assert "transcription" in stages
    assert "content_analysis" in stages
