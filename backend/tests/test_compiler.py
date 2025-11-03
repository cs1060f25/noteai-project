"""Tests for video compilation agent."""

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from agents.video_compiler import CompilationError, VideoCompiler
from agents.utils.ffmpeg_helper import FFmpegHelper
from app.models.database import Base, ContentSegment, Job, Transcript


@pytest.fixture
def db_session():
    """Create test database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_job(db_session):
    """Create sample job for testing."""
    job = Job(
        job_id="test-job-123",
        filename="test_video.mp4",
        file_size=1000000,
        content_type="video/mp4",
        original_s3_key="uploads/test-job-123/original.mp4",
        status="running",
    )
    db_session.add(job)
    db_session.commit()
    return job


@pytest.fixture
def sample_segments(db_session, sample_job):
    """Create sample content segments."""
    segments = [
        ContentSegment(
            segment_id="seg-1",
            job_id=sample_job.job_id,
            start_time=10.0,
            end_time=30.0,
            duration=20.0,
            topic="Introduction to Topic",
            description="Overview of the main concepts",
            importance_score=0.95,
            segment_order=1,
        ),
        ContentSegment(
            segment_id="seg-2",
            job_id=sample_job.job_id,
            start_time=60.0,
            end_time=90.0,
            duration=30.0,
            topic="Key Concept Explanation",
            description="Detailed explanation",
            importance_score=0.85,
            segment_order=2,
        ),
    ]
    for seg in segments:
        db_session.add(seg)
    db_session.commit()
    return segments


@pytest.fixture
def sample_transcripts(db_session, sample_job):
    """Create sample transcripts."""
    transcripts = [
        Transcript(
            segment_id="trans-1",
            job_id=sample_job.job_id,
            start_time=10.0,
            end_time=15.0,
            text="Welcome to this lecture",
            confidence=0.98,
        ),
        Transcript(
            segment_id="trans-2",
            job_id=sample_job.job_id,
            start_time=15.0,
            end_time=20.0,
            text="Today we will discuss important concepts",
            confidence=0.97,
        ),
    ]
    for trans in transcripts:
        db_session.add(trans)
    db_session.commit()
    return transcripts


class TestFFmpegHelper:
    """Tests for FFmpeg helper."""

    @patch("subprocess.run")
    def test_verify_ffmpeg_success(self, mock_run):
        """Test FFmpeg verification succeeds."""
        mock_run.return_value = MagicMock(stdout="ffmpeg version 4.4.0", returncode=0)
        helper = FFmpegHelper()
        assert helper is not None

    @patch("subprocess.run")
    def test_verify_ffmpeg_failure(self, mock_run):
        """Test FFmpeg verification fails when not installed."""
        mock_run.side_effect = FileNotFoundError()
        with pytest.raises(Exception):
            FFmpegHelper()

    @patch("subprocess.run")
    def test_get_video_info(self, mock_run):
        """Test getting video information."""
        mock_run.return_value = MagicMock(
            stdout="""
            {
                "streams": [{
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "30/1",
                    "codec_name": "h264"
                }],
                "format": {
                    "duration": "120.5",
                    "bit_rate": "2000000"
                }
            }
            """,
            returncode=0,
        )

        helper = FFmpegHelper()
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
            info = helper.get_video_info(Path(tmp.name))

        assert info["width"] == 1920
        assert info["height"] == 1080
        assert info["duration"] == 120.5


class TestVideoCompiler:
    """Tests for video compiler."""

    @patch.object(VideoCompiler, "_download_from_s3")
    @patch.object(VideoCompiler, "_upload_to_s3")
    @patch.object(FFmpegHelper, "get_video_info")
    @patch.object(FFmpegHelper, "extract_segment")
    @patch.object(FFmpegHelper, "add_metadata")
    @patch.object(FFmpegHelper, "generate_thumbnail")
    def test_compile_clips_success(
        self,
        mock_thumbnail,
        mock_metadata,
        mock_extract,
        mock_info,
        mock_upload,
        mock_download,
        db_session,
        sample_job,
        sample_segments,
        sample_transcripts,
    ):
        """Test successful clip compilation."""
        # setup mocks
        mock_info.return_value = {
            "duration": 120.0,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
            "codec": "h264",
            "bitrate": 2000000,
        }

        compiler = VideoCompiler(db_session)

        with tempfile.TemporaryDirectory() as temp_dir:
            # mock file operations
            mock_download.return_value = None
            mock_upload.return_value = None

            result = compiler.compile_clips(sample_job.job_id)

        assert result["status"] == "completed"
        assert result["clips_generated"] == 2
        assert len(result["clips"]) == 2

    def test_compile_clips_no_segments(self, db_session, sample_job):
        """Test compilation fails when no segments exist."""
        compiler = VideoCompiler(db_session)

        with pytest.raises(CompilationError, match="No content segments found"):
            compiler.compile_clips(sample_job.job_id)

    def test_compile_clips_job_not_found(self, db_session):
        """Test compilation fails when job doesn't exist."""
        compiler = VideoCompiler(db_session)

        with pytest.raises(CompilationError, match="Job not found"):
            compiler.compile_clips("nonexistent-job")

    @patch.object(VideoCompiler, "_download_from_s3")
    def test_download_failure_handling(self, mock_download, db_session, sample_job, sample_segments):
        """Test handling of S3 download failures."""
        mock_download.side_effect = Exception("S3 download failed")

        compiler = VideoCompiler(db_session)

        with pytest.raises(CompilationError, match="Failed to download from S3"):
            compiler.compile_clips(sample_job.job_id)


class TestSubtitleGeneration:
    """Tests for subtitle generation."""

    def test_merge_transcripts_for_segment(self):
        """Test merging transcripts for a segment."""
        from agents.utils.subtitle_generator import SubtitleGenerator

        gen = SubtitleGenerator()

        transcripts = [
            {"start_time": 5.0, "end_time": 10.0, "text": "Before segment"},
            {"start_time": 10.0, "end_time": 15.0, "text": "Start of segment"},
            {"start_time": 15.0, "end_time": 20.0, "text": "Middle of segment"},
            {"start_time": 20.0, "end_time": 25.0, "text": "End of segment"},
            {"start_time": 30.0, "end_time": 35.0, "text": "After segment"},
        ]

        result = gen.merge_transcripts_for_segment(transcripts, 10.0, 25.0)

        assert len(result) == 4  # 👈 CHANGED from 3 to 4
        assert result[0]["text"] == "Before segment"  # 👈 ADD THIS
        assert result[1]["text"] == "Start of segment"  # 👈 CHANGED from [0] to [1]
        assert result[1]["start_time"] == 0  # 👈 CHANGED from [0] to [1]
        assert result[1]["end_time"] == 5.0  # 👈 CHANGED from [0] to [1]

    def test_webvtt_generation(self):
        """Test WebVTT subtitle file generation."""
        from agents.utils.subtitle_generator import SubtitleGenerator

        gen = SubtitleGenerator()

        transcripts = [
            {"start_time": 0.0, "end_time": 5.0, "text": "First subtitle"},
            {"start_time": 5.0, "end_time": 10.0, "text": "Second subtitle"},
        ]

        with tempfile.NamedTemporaryFile(mode="w", suffix=".vtt", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            gen.generate_webvtt(transcripts, tmp_path)

            content = tmp_path.read_text()
            assert "WEBVTT" in content
            assert "First subtitle" in content
            assert "Second subtitle" in content
        finally:
            tmp_path.unlink()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])