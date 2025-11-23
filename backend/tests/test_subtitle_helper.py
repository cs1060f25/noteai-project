"""Unit tests for subtitle generation helper utilities."""

import pytest

from agents.utils.subtitle_helper import (
    adjust_transcript_timestamps,
    escape_vtt_text,
    format_vtt_timestamp,
    generate_vtt_file,
    generate_vtt_from_transcripts,
)


class TestFormatVTTTimestamp:
    """Test timestamp formatting for WebVTT format."""

    def test_zero_seconds(self):
        """Test formatting of 0.0 seconds."""
        assert format_vtt_timestamp(0.0) == "00:00:00.000"

    def test_subsecond_precision(self):
        """Test millisecond precision."""
        assert format_vtt_timestamp(0.123) == "00:00:00.123"
        assert format_vtt_timestamp(0.999) == "00:00:00.999"

    def test_seconds_only(self):
        """Test formatting with only seconds."""
        assert format_vtt_timestamp(5.0) == "00:00:05.000"
        assert format_vtt_timestamp(59.5) == "00:00:59.500"

    def test_minutes_and_seconds(self):
        """Test formatting with minutes."""
        assert format_vtt_timestamp(65.5) == "00:01:05.500"
        assert format_vtt_timestamp(125.250) == "00:02:05.250"

    def test_hours_minutes_seconds(self):
        """Test formatting with hours."""
        assert format_vtt_timestamp(3665.123) == "01:01:05.123"
        assert format_vtt_timestamp(7200.0) == "02:00:00.000"

    def test_negative_time_clamped_to_zero(self):
        """Test that negative times are clamped to 0."""
        assert format_vtt_timestamp(-5.0) == "00:00:00.000"
        assert format_vtt_timestamp(-0.001) == "00:00:00.000"

    def test_large_values(self):
        """Test formatting of very large time values."""
        # 10 hours
        assert format_vtt_timestamp(36000.0) == "10:00:00.000"
        # 99 hours (edge case)
        assert format_vtt_timestamp(356400.0) == "99:00:00.000"


class TestAdjustTranscriptTimestamps:
    """Test timestamp adjustment for clip extraction."""

    def test_basic_adjustment(self):
        """Test simple timestamp adjustment."""

        class MockTranscript:
            def __init__(self, start, end, text):
                self.start_time = start
                self.end_time = end
                self.text = text

        transcripts = [
            MockTranscript(5.0, 8.0, "First segment"),
            MockTranscript(8.0, 12.0, "Second segment"),
        ]

        result = adjust_transcript_timestamps(transcripts, clip_start_time=5.0)

        assert len(result) == 2
        assert result[0]["start_time"] == 0.0
        assert result[0]["end_time"] == 3.0
        assert result[0]["text"] == "First segment"

        assert result[1]["start_time"] == 3.0
        assert result[1]["end_time"] == 7.0
        assert result[1]["text"] == "Second segment"

    def test_zero_clip_start(self):
        """Test when clip starts at beginning of video."""

        class MockTranscript:
            def __init__(self, start, end, text):
                self.start_time = start
                self.end_time = end
                self.text = text

        transcripts = [MockTranscript(0.0, 5.0, "Start of video")]

        result = adjust_transcript_timestamps(transcripts, clip_start_time=0.0)

        assert result[0]["start_time"] == 0.0
        assert result[0]["end_time"] == 5.0

    def test_negative_timestamps_clamped(self):
        """Test that negative adjusted times are clamped to 0."""

        class MockTranscript:
            def __init__(self, start, end, text):
                self.start_time = start
                self.end_time = end
                self.text = text

        # This could happen if database query isn't perfect
        transcripts = [MockTranscript(4.5, 7.0, "Overlapping segment")]

        result = adjust_transcript_timestamps(transcripts, clip_start_time=5.0)

        # Start should be clamped to 0 (was -0.5)
        assert result[0]["start_time"] == 0.0
        assert result[0]["end_time"] == 2.0


class TestEscapeVTTText:
    """Test text escaping for WebVTT format."""

    def test_normal_text_unchanged(self):
        """Test that normal text passes through unchanged."""
        assert escape_vtt_text("Hello world") == "Hello world"
        assert escape_vtt_text("Testing 123!") == "Testing 123!"

    def test_arrow_separator_escaped(self):
        """Test that cue separator is replaced."""
        assert escape_vtt_text("A --> B") == "A → B"
        assert escape_vtt_text("Input-->Output") == "Input→Output"

    def test_webvtt_keyword_escaped(self):
        """Test that WEBVTT keyword gets leading space."""
        assert escape_vtt_text("WEBVTT") == " WEBVTT"
        assert escape_vtt_text("webvtt") == " webvtt"

    def test_whitespace_trimmed(self):
        """Test that leading/trailing whitespace is removed."""
        assert escape_vtt_text("  Hello  ") == "Hello"
        assert escape_vtt_text("\n\tTest\n") == "Test"

    def test_special_characters_preserved(self):
        """Test that other special characters are preserved."""
        assert escape_vtt_text("C++ & Java") == "C++ & Java"
        assert escape_vtt_text("'quotes' and \"quotes\"") == "'quotes' and \"quotes\""


class TestGenerateVTTFile:
    """Test VTT file generation."""

    def test_empty_segments_creates_valid_file(self, tmp_path):
        """Test that empty segments create a valid empty VTT file."""
        output_path = tmp_path / "empty.vtt"

        generate_vtt_file([], output_path)

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")
        assert content == "WEBVTT\n\n"

    def test_single_segment(self, tmp_path):
        """Test generating VTT with a single segment."""
        output_path = tmp_path / "single.vtt"

        segments = [{"start_time": 0.0, "end_time": 5.0, "text": "Hello world"}]

        generate_vtt_file(segments, output_path)

        assert output_path.exists()
        content = output_path.read_text(encoding="utf-8")

        assert "WEBVTT" in content
        assert "00:00:00.000 --> 00:00:05.000" in content
        assert "Hello world" in content

    def test_multiple_segments(self, tmp_path):
        """Test generating VTT with multiple segments."""
        output_path = tmp_path / "multiple.vtt"

        segments = [
            {"start_time": 0.0, "end_time": 5.2, "text": "First subtitle"},
            {"start_time": 5.2, "end_time": 10.5, "text": "Second subtitle"},
            {"start_time": 10.5, "end_time": 15.0, "text": "Third subtitle"},
        ]

        generate_vtt_file(segments, output_path)

        content = output_path.read_text(encoding="utf-8")

        # Check header
        assert content.startswith("WEBVTT\n\n")

        # Check all segments present
        assert "First subtitle" in content
        assert "Second subtitle" in content
        assert "Third subtitle" in content

        # Check timing format
        assert "00:00:00.000 --> 00:00:05.200" in content
        assert "00:00:05.200 --> 00:00:10.500" in content

    def test_invalid_segment_raises_error(self, tmp_path):
        """Test that invalid segments raise ValueError."""
        output_path = tmp_path / "invalid.vtt"

        # Missing 'text' field
        segments = [{"start_time": 0.0, "end_time": 5.0}]

        with pytest.raises(ValueError, match="missing required fields"):
            generate_vtt_file(segments, output_path)

    def test_invalid_time_range_raises_error(self, tmp_path):
        """Test that end_time <= start_time raises ValueError."""
        output_path = tmp_path / "bad_times.vtt"

        segments = [
            {"start_time": 5.0, "end_time": 3.0, "text": "Invalid"}  # end before start
        ]

        with pytest.raises(ValueError, match="invalid time range"):
            generate_vtt_file(segments, output_path)

    def test_cue_identifiers_added(self, tmp_path):
        """Test that cue identifiers are added for debugging."""
        output_path = tmp_path / "with_ids.vtt"

        segments = [
            {"start_time": 0.0, "end_time": 2.0, "text": "First"},
            {"start_time": 2.0, "end_time": 4.0, "text": "Second"},
        ]

        generate_vtt_file(segments, output_path)

        content = output_path.read_text(encoding="utf-8")

        # Check for cue identifiers (1, 2, etc.)
        lines = content.split("\n")
        assert "1" in lines
        assert "2" in lines


class TestGenerateVTTFromTranscripts:
    """Test high-level VTT generation from database transcripts."""

    def test_successful_generation(self, tmp_path):
        """Test successful VTT generation from transcripts."""

        class MockTranscript:
            def __init__(self, start, end, text):
                self.start_time = start
                self.end_time = end
                self.text = text

        transcripts = [
            MockTranscript(5.0, 8.0, "Introduction"),
            MockTranscript(8.0, 12.0, "Main content"),
        ]

        output_path = tmp_path / "test.vtt"

        result = generate_vtt_from_transcripts(
            transcripts, clip_start_time=5.0, clip_end_time=12.0, output_path=output_path
        )

        assert result is True
        assert output_path.exists()

        content = output_path.read_text(encoding="utf-8")
        assert "WEBVTT" in content
        assert "Introduction" in content
        assert "Main content" in content

    def test_no_transcripts_returns_false(self, tmp_path):
        """Test that empty transcript list returns False."""
        output_path = tmp_path / "empty.vtt"

        result = generate_vtt_from_transcripts(
            [], clip_start_time=0.0, clip_end_time=10.0, output_path=output_path
        )

        assert result is False

    def test_filters_out_of_range_segments(self, tmp_path):
        """Test that segments outside clip range are filtered."""

        class MockTranscript:
            def __init__(self, start, end, text):
                self.start_time = start
                self.end_time = end
                self.text = text

        # Clip is 10-20 seconds, but transcripts include 5-8s (before clip)
        transcripts = [
            MockTranscript(5.0, 8.0, "Before clip"),  # Should be filtered
            MockTranscript(12.0, 15.0, "In clip"),  # Should be included
        ]

        output_path = tmp_path / "filtered.vtt"

        result = generate_vtt_from_transcripts(
            transcripts, clip_start_time=10.0, clip_end_time=20.0, output_path=output_path
        )

        # Should still succeed with the one valid segment
        assert result is True

        content = output_path.read_text(encoding="utf-8")
        assert "In clip" in content
