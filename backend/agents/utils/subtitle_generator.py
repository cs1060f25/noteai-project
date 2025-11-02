"""Subtitle generation utilities."""

from datetime import timedelta
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)


class SubtitleGenerator:
    """Generate subtitle files from transcript data."""

    def __init__(self) -> None:
        """Initialize subtitle generator."""
        pass

    def generate_webvtt(
        self,
        transcript_segments: list[dict],
        output_path: Path,
        offset: float = 0.0,
    ) -> None:
        """Generate WebVTT subtitle file.

        Args:
            transcript_segments: List of transcript segments with start_time, end_time, text
            output_path: Output .vtt file path
            offset: Time offset to apply to all timestamps in seconds
        """
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")

            for i, segment in enumerate(transcript_segments):
                start = segment["start_time"] + offset
                end = segment["end_time"] + offset
                text = segment["text"].strip()

                # format timestamps
                start_time = self._format_webvtt_timestamp(start)
                end_time = self._format_webvtt_timestamp(end)

                # write cue
                f.write(f"{i + 1}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")

        logger.info(
            "WebVTT subtitle generated",
            extra={
                "output": str(output_path),
                "segment_count": len(transcript_segments),
            },
        )

    def generate_srt(
        self,
        transcript_segments: list[dict],
        output_path: Path,
        offset: float = 0.0,
    ) -> None:
        """Generate SRT subtitle file.

        Args:
            transcript_segments: List of transcript segments with start_time, end_time, text
            output_path: Output .srt file path
            offset: Time offset to apply to all timestamps in seconds
        """
        with open(output_path, "w", encoding="utf-8") as f:
            for i, segment in enumerate(transcript_segments):
                start = segment["start_time"] + offset
                end = segment["end_time"] + offset
                text = segment["text"].strip()

                # format timestamps
                start_time = self._format_srt_timestamp(start)
                end_time = self._format_srt_timestamp(end)

                # write subtitle
                f.write(f"{i + 1}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")

        logger.info(
            "SRT subtitle generated",
            extra={
                "output": str(output_path),
                "segment_count": len(transcript_segments),
            },
        )

    def _format_webvtt_timestamp(self, seconds: float) -> str:
        """Format timestamp for WebVTT format (HH:MM:SS.mmm).

        Args:
            seconds: Time in seconds

        Returns:
            Formatted timestamp string
        """
        td = timedelta(seconds=seconds)
        hours = int(td.total_seconds() // 3600)
        minutes = int((td.total_seconds() % 3600) // 60)
        secs = td.total_seconds() % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    def _format_srt_timestamp(self, seconds: float) -> str:
        """Format timestamp for SRT format (HH:MM:SS,mmm).

        Args:
            seconds: Time in seconds

        Returns:
            Formatted timestamp string
        """
        td = timedelta(seconds=seconds)
        hours = int(td.total_seconds() // 3600)
        minutes = int((td.total_seconds() % 3600) // 60)
        secs = int(td.total_seconds() % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def merge_transcripts_for_segment(
        self,
        all_transcripts: list[dict],
        start_time: float,
        end_time: float,
    ) -> list[dict]:
        """Extract and adjust transcripts for a specific segment.

        Args:
            all_transcripts: Full list of transcript segments
            start_time: Segment start time
            end_time: Segment end time

        Returns:
            List of transcript segments within the time range, with adjusted timestamps
        """
        segment_transcripts = []

        for transcript in all_transcripts:
            t_start = transcript["start_time"]
            t_end = transcript["end_time"]

            # check if transcript overlaps with segment
            if t_end < start_time or t_start > end_time:
                continue

            # adjust timestamps relative to segment start
            adjusted_transcript = {
                "start_time": max(0, t_start - start_time),
                "end_time": min(end_time - start_time, t_end - start_time),
                "text": transcript["text"],
            }

            segment_transcripts.append(adjusted_transcript)

        return segment_transcripts
