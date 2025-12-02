"""Unit tests for video compiler subtitle generation.

This test suite verifies that video clips are generated with proper subtitle files
containing transcript data synchronized to the clip's time range.
"""

from unittest.mock import MagicMock, patch

import pytest

from agents.video_compiler import VideoCompiler
from app.models.database import Clip, Transcript


class TestVideoCompilerSubtitles:
    """Test suite for subtitle generation in video compilation."""

    @pytest.fixture
    def mock_db(self):
        """Create mock database session."""
        db = MagicMock()
        return db

    @pytest.fixture
    def sample_transcripts(self):
        """Create sample transcript data for a 20-second video."""
        return [
            Transcript(
                segment_id="seg_1",
                job_id="test_job_123",
                start_time=0.0,
                end_time=5.2,
                text="Hello and welcome to this lecture",
            ),
            Transcript(
                segment_id="seg_2",
                job_id="test_job_123",
                start_time=5.2,
                end_time=12.5,
                text="Today we will discuss neural networks",
            ),
            Transcript(
                segment_id="seg_3",
                job_id="test_job_123",
                start_time=12.5,
                end_time=18.0,
                text="Starting with the basics of backpropagation",
            ),
        ]

    @pytest.fixture
    def sample_clip(self):
        """Create sample clip that spans first two transcript segments."""
        return Clip(
            id=1,
            clip_id="clip_abc123",
            job_id="test_job_123",
            start_time=0.0,
            end_time=12.5,
            duration=12.5,
            title="Introduction to Neural Networks",
            topic="Neural Networks Introduction",
            clip_order=1,
        )

    @pytest.mark.xfail(reason="Bug: subtitle_s3_key is None")
    @patch("agents.video_compiler.boto3.client")
    @patch("agents.video_compiler.FFmpegHelper")
    def test_subtitle_s3_key_is_none_bug(
        self,
        mock_ffmpeg_class,
        mock_boto3_client,
        mock_db,
        sample_clip,
        sample_transcripts,
        tmp_path,
    ):
        """Test that demonstrates the BUG: subtitle_s3_key is always None.

        This test verifies the current broken behavior where clips are compiled
        without subtitle files, even when transcript data exists.

        Expected to FAIL after bug is fixed.
        """
        # Setup mocks
        mock_ffmpeg = MagicMock()
        mock_ffmpeg_class.return_value = mock_ffmpeg

        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3

        compiler = VideoCompiler(db=mock_db)

        video_info = {"duration": 20.0, "width": 1920, "height": 1080}

        # Mock video file
        video_path = tmp_path / "test_video.mp4"
        video_path.touch()

        # Mock database query for transcripts (simulating available data)
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = sample_transcripts[:2]  # Only transcripts within clip range
        mock_db.query.return_value = mock_query

        # Create dummy output file that _process_clip expects
        final_clip_path = tmp_path / "final_clip_abc123.mp4"
        final_clip_path.touch()

        # Execute
        result = compiler._process_clip(
            job_id="test_job_123",
            clip=sample_clip,
            original_video_path=video_path,
            temp_path=tmp_path,
            video_info=video_info,
        )

        # Assert: BUG - subtitle_s3_key is None despite transcripts existing
        assert result is not None
        assert result["subtitle_s3_key"] is None, (
            "BUG DETECTED: subtitle_s3_key should be populated with S3 key, "
            "but is None even though transcripts exist for this clip"
        )

    @patch("agents.video_compiler.boto3.client")
    @patch("agents.video_compiler.FFmpegHelper")
    def test_subtitle_file_should_be_generated(
        self,
        mock_ffmpeg_class,
        mock_boto3_client,
        mock_db,
        sample_clip,
        sample_transcripts,
        tmp_path,
    ):
        """Test that subtitle file SHOULD be generated and uploaded to S3.

        This test verifies the EXPECTED behavior after the bug is fixed.

        Expected to PASS after bug is fixed.
        Currently FAILS because subtitle generation is not implemented.
        """
        # Setup mocks
        mock_ffmpeg = MagicMock()
        mock_ffmpeg_class.return_value = mock_ffmpeg

        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3

        compiler = VideoCompiler(db=mock_db)

        video_info = {"duration": 20.0, "width": 1920, "height": 1080}
        video_path = tmp_path / "test_video.mp4"
        video_path.touch()

        # Mock database query for transcripts
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = sample_transcripts[:2]
        mock_db.query.return_value = mock_query

        # Create dummy output file that _process_clip expects
        final_clip_path = tmp_path / "final_clip_abc123.mp4"
        final_clip_path.touch()

        # Execute
        with patch("os.path.getsize", return_value=1024):
            result = compiler._process_clip(
                job_id="test_job_123",
                clip=sample_clip,
                original_video_path=video_path,
                temp_path=tmp_path,
                video_info=video_info,
            )

        # Assert: EXPECTED behavior (will fail until bug is fixed)
        assert result is not None, "Clip processing should return metadata"

        # Subtitle S3 key should be populated
        assert result["subtitle_s3_key"] is not None, (
            "subtitle_s3_key should not be None when transcripts exist"
        )
        assert result["subtitle_s3_key"].startswith("subtitles/"), (
            "subtitle_s3_key should start with 'subtitles/'"
        )
        assert result["subtitle_s3_key"].endswith(".vtt"), (
            "subtitle file should be WebVTT format (.vtt)"
        )

        # Verify S3 upload was called with subtitle file
        upload_calls = list(mock_s3.upload_file.call_args_list)
        subtitle_uploads = [call for call in upload_calls if "subtitles/" in str(call)]

        assert len(subtitle_uploads) > 0, "S3 upload should be called for subtitle file"

    @patch("agents.video_compiler.boto3.client")
    @patch("agents.video_compiler.FFmpegHelper")
    def test_overlapping_transcripts_should_be_included(
        self, mock_ffmpeg_class, mock_boto3_client, mock_db, tmp_path
    ):
        """Test that transcripts partially overlapping the clip are included and clamped."""
        # Setup mocks
        mock_ffmpeg = MagicMock()
        mock_ffmpeg_class.return_value = mock_ffmpeg
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3

        compiler = VideoCompiler(db=mock_db)

        # Clip: 10.0s - 20.0s (Duration 10s)
        clip = MagicMock(
            clip_id="clip1",
            start_time=10.0,
            end_time=20.0,
            title="Test Clip",
            topic="Test Topic",
            clip_order=1,
            duration=10.0,
            extra_metadata={},
        )

        # Mock transcripts:
        # 1. Starts before, ends inside (5.0 - 12.0) -> Should be 0.0 - 2.0 relative
        # 2. Starts inside, ends inside (12.0 - 18.0) -> Should be 2.0 - 8.0 relative
        # 3. Starts inside, ends after (18.0 - 25.0) -> Should be 8.0 - 10.0 relative
        t1 = MagicMock(start_time=5.0, end_time=12.0, text="Start overlap")
        t2 = MagicMock(start_time=12.0, end_time=18.0, text="Inside")
        t3 = MagicMock(start_time=18.0, end_time=25.0, text="End overlap")

        # Mock DB query to return these transcripts
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = [t1, t2, t3]
        mock_db.query.return_value = mock_query

        video_path = tmp_path / "video.mp4"
        video_path.touch()

        # Execute
        with patch("os.path.getsize", return_value=1024):
            result = compiler._process_clip(
                job_id="test_job",
                clip=clip,
                original_video_path=video_path,
                temp_path=tmp_path,
                video_info={"duration": 100.0, "width": 1920, "height": 1080},
            )

        # Verify content written to VTT
        # We need to find the VTT file path from the result
        subtitle_key = result["subtitle_s3_key"]
        assert subtitle_key is not None

        # Since we can't easily inspect the temp file content after it's gone (temp_dir cleanup),
        # we can check if the upload was called with a file that contained the right content.
        # OR, we can mock `generate_vtt_from_transcripts` to verify it was called with clamped values.
        # But we want to test the integration.

        # Actually, `_process_clip` uses `temp_path` passed in.
        # In the test, `tmp_path` is a pytest fixture, so it persists for the test duration.
        subtitle_path = tmp_path / f"subtitle_{clip.clip_id}.vtt"
        assert subtitle_path.exists()

        content = subtitle_path.read_text(encoding="utf-8")

        assert "Start overlap" in content
        assert "Inside" in content
        assert "End overlap" in content

        # Check timestamps (approximate string matching)
        # t1: 0.0 - 2.0
        assert "00:00:00.000 --> 00:00:02.000" in content
        # t2: 2.0 - 8.0
        assert "00:00:02.000 --> 00:00:08.000" in content
        # t3: 8.0 - 10.0
        assert "00:00:08.000 --> 00:00:10.000" in content

    def test_subtitle_content_format(self, sample_transcripts):
        """Test that generated subtitle file follows WebVTT format.

        This test verifies the subtitle file content structure once the
        generation utility is implemented.

        Currently FAILS because subtitle helper doesn't exist yet.
        """
        pytest.skip("Subtitle generation utility not yet implemented - will be added in Phase 1")

    @patch("agents.video_compiler.boto3.client")
    @patch("agents.video_compiler.FFmpegHelper")
    def test_clip_without_transcripts_should_not_fail(
        self, mock_ffmpeg_class, mock_boto3_client, mock_db, sample_clip, tmp_path
    ):
        """Test that clips without transcripts compile successfully without subtitles.

        Edge case: When no transcript data exists for a clip's time range,
        the compilation should still succeed with subtitle_s3_key = None.
        """
        # Setup mocks
        mock_ffmpeg = MagicMock()
        mock_ffmpeg_class.return_value = mock_ffmpeg

        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3

        compiler = VideoCompiler(db=mock_db)

        video_info = {"duration": 20.0, "width": 1920, "height": 1080}
        video_path = tmp_path / "test_video.mp4"
        video_path.touch()

        # Mock database query returning NO transcripts
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.all.return_value = []  # No transcripts
        mock_db.query.return_value = mock_query

        # Create dummy output file that _process_clip expects
        final_clip_path = tmp_path / "final_clip_abc123.mp4"
        final_clip_path.touch()

        # Execute
        with patch("os.path.getsize", return_value=1024):
            result = compiler._process_clip(
                job_id="test_job_123",
                clip=sample_clip,
                original_video_path=video_path,
                temp_path=tmp_path,
                video_info=video_info,
            )

        # Assert: Should succeed without subtitles
        assert result is not None, "Clip should process successfully even without transcripts"
        assert result["subtitle_s3_key"] is None, (
            "subtitle_s3_key should be None when no transcripts exist"
        )

    def test_timestamp_adjustment_for_clip_start(self):
        """Test that transcript timestamps are adjusted relative to clip start time.

        When a clip starts at 5.0 seconds, the subtitle timestamps should be
        adjusted so the clip starts at 00:00:00.000.

        Example:
        - Transcript at 5.2s-8.0s in original video
        - Should become 0.2s-3.0s in clip subtitle file

        Currently FAILS because timestamp adjustment not implemented.
        """
        pytest.skip("Timestamp adjustment logic not yet implemented - will be added in Phase 1")

    def test_subtitle_upload_with_correct_content_type(self):
        """Test that subtitle file is uploaded with correct MIME type.

        WebVTT files should be uploaded with content-type 'text/vtt'.

        Currently FAILS because subtitle upload not implemented.
        """
        pytest.skip("Subtitle upload not yet implemented - will be added in Phase 2")


class TestSubtitleHelper:
    """Test suite for subtitle generation utility functions.

    These tests will verify the subtitle_helper.py module once created.
    """

    def test_format_vtt_timestamp(self):
        """Test conversion of seconds to WebVTT timestamp format.

        Examples:
        - 0.0 → "00:00:00.000"
        - 65.5 → "00:01:05.500"
        - 3665.123 → "01:01:05.123"
        """
        pytest.skip("subtitle_helper.format_vtt_timestamp not yet implemented")

    def test_generate_vtt_file_creates_valid_format(self):
        """Test that generated VTT file follows W3C WebVTT specification.

        Valid WebVTT format:
        WEBVTT

        00:00:00.000 --> 00:00:05.200
        First subtitle text

        00:00:05.200 --> 00:00:12.500
        Second subtitle text
        """
        pytest.skip("subtitle_helper.generate_vtt_file not yet implemented")

    def test_special_characters_in_transcript_are_escaped(self):
        """Test that special characters in transcript text are properly handled.

        Characters like <, >, &, ", ' should be handled correctly in VTT format.
        """
        pytest.skip("Character escaping not yet implemented")

    def test_adjust_transcript_timestamps(self):
        """Test timestamp adjustment relative to clip start."""
        pytest.skip("Timestamp adjustment not yet implemented")
