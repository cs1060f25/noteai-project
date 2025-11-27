from datetime import datetime

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    ClipMetadata,
    ContentSegmentResponse,
    JobProgress,
    JobResponse,
    JobStatus,
    LayoutAnalysisResponse,
    ProcessingConfig,
    ProcessingMode,
    ProcessingStage,
    QuizQuestion,
    ResolutionOption,
    SilenceRegionResponse,
    TranscriptSegment,
    UploadRequest,
    UserResponse,
)


class TestProcessingConfig:
    def test_default_values(self):
        config = ProcessingConfig()
        assert config.resolution == ResolutionOption.FULL_HD_1080P
        assert config.processing_mode == ProcessingMode.VISION
        assert config.rate_limit_mode is True
        assert config.prompt is None

    def test_custom_values(self):
        config = ProcessingConfig(
            resolution=ResolutionOption.UHD_4K,
            processing_mode=ProcessingMode.AUDIO,
            rate_limit_mode=False,
            prompt="Test prompt"
        )
        assert config.resolution == ResolutionOption.UHD_4K
        assert config.processing_mode == ProcessingMode.AUDIO
        assert config.rate_limit_mode is False
        assert config.prompt == "Test prompt"

    def test_invalid_resolution(self):
        with pytest.raises(ValidationError):
            ProcessingConfig(resolution="8k")

class TestUploadRequest:
    def test_valid_request(self):
        req = UploadRequest(
            filename="test.mp4",
            file_size=1024,
            content_type="video/mp4"
        )
        assert req.filename == "test.mp4"
        assert req.file_size == 1024
        assert req.content_type == "video/mp4"
        assert req.processing_config is None

    def test_invalid_file_size(self):
        with pytest.raises(ValidationError):
            UploadRequest(
                filename="test.mp4",
                file_size=0,
                content_type="video/mp4"
            )

    def test_filename_length(self):
        with pytest.raises(ValidationError):
            UploadRequest(
                filename="",
                file_size=1024,
                content_type="video/mp4"
            )

class TestJobModels:
    def test_job_progress_validation(self):
        progress = JobProgress(
            stage=ProcessingStage.UPLOADING,
            percent=50.0,
            message="Uploading..."
        )
        assert progress.percent == 50.0

        with pytest.raises(ValidationError):
            JobProgress(
                stage=ProcessingStage.UPLOADING,
                percent=101.0, # Invalid percent
                message="Uploading..."
            )

    def test_job_response(self):
        job = JobResponse(
            job_id="123",
            status=JobStatus.PENDING,
            filename="test.mp4",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        assert job.job_id == "123"
        assert job.status == JobStatus.PENDING

class TestResultModels:
    def test_clip_metadata(self):
        clip = ClipMetadata(
            clip_id="c1",
            title="Clip 1",
            start_time=0.0,
            end_time=10.0,
            duration=10.0,
            s3_key="clips/c1.mp4"
        )
        assert clip.duration == 10.0

        with pytest.raises(ValidationError):
            ClipMetadata(
                clip_id="c1",
                title="Clip 1",
                start_time=-1.0, # Invalid time
                end_time=10.0,
                duration=10.0,
                s3_key="clips/c1.mp4"
            )

    def test_transcript_segment(self):
        segment = TranscriptSegment(
            start_time=0.0,
            end_time=5.0,
            text="Hello world"
        )
        assert segment.text == "Hello world"

class TestAgentOutputModels:
    def test_silence_region(self):
        region = SilenceRegionResponse(
            region_id="r1",
            start_time=0.0,
            end_time=2.0,
            duration=2.0,
            silence_type="audio_silence",
            created_at=datetime.utcnow()
        )
        assert region.duration == 2.0

    def test_layout_analysis(self):
        layout = LayoutAnalysisResponse(
            layout_id="l1",
            job_id="j1",
            screen_region={"x": 0, "y": 0, "width": 100, "height": 100},
            camera_region={"x": 100, "y": 0, "width": 50, "height": 50},
            split_ratio=0.5,
            layout_type="side_by_side",
            confidence_score=0.9,
            created_at=datetime.utcnow()
        )
        assert layout.confidence_score == 0.9

    def test_content_segment(self):
        segment = ContentSegmentResponse(
            segment_id="s1",
            start_time=0.0,
            end_time=10.0,
            duration=10.0,
            topic="Intro",
            importance_score=0.8,
            segment_order=1,
            created_at=datetime.utcnow()
        )
        assert segment.importance_score == 0.8

class TestQuizModels:
    def test_quiz_question(self):
        q = QuizQuestion(
            id=1,
            type="multiple-choice",
            question="What is 2+2?",
            options=["3", "4", "5"],
            correctAnswer=1,
            explanation="2+2=4",
            difficulty="easy"
        )
        assert q.correctAnswer == 1

class TestUserModels:
    def test_user_response(self):
        user = UserResponse(
            user_id="u1",
            email="test@example.com",
            email_notifications=True,
            processing_notifications=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        assert user.email == "test@example.com"
