"""Subtitle generation utilities for video clips.

This module provides functions to generate WebVTT subtitle files from transcript data,
with proper timestamp formatting and text handling.
"""

from pathlib import Path


def format_vtt_timestamp(seconds: float) -> str:
    """Convert seconds to WebVTT timestamp format (HH:MM:SS.mmm).

    Args:
        seconds: Time in seconds (can be fractional)

    Returns:
        Formatted timestamp string in WebVTT format

    Examples:
        >>> format_vtt_timestamp(0.0)
        '00:00:00.000'
        >>> format_vtt_timestamp(65.5)
        '00:01:05.500'
        >>> format_vtt_timestamp(3665.123)
        '01:01:05.123'
    """
    # Handle negative timestamps (shouldn't happen, but be defensive)
    seconds = max(0.0, seconds)

    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def adjust_transcript_timestamps(
    transcripts: list, clip_start_time: float, clip_duration: float
) -> list[dict[str, float | str]]:
    """Adjust transcript timestamps to be relative to clip start time.

    When a clip is extracted from a longer video, its timestamps should start at 00:00:00.000
    even if the clip starts at a later point in the original video.

    Args:
        transcripts: List of Transcript objects from database
        clip_start_time: Start time of the clip in the original video (seconds)

    Returns:
        List of dictionaries with adjusted timestamps and text:
        [{"start_time": float, "end_time": float, "text": str}, ...]

    Example:
        If clip starts at 5.0s in original video:
        - Original transcript: 5.2s - 8.0s
        - Adjusted for clip: 0.2s - 3.0s
    """
    adjusted_segments = []

    for transcript in transcripts:
        adjusted_segments.append(
            {
                "start_time": max(0.0, transcript.start_time - clip_start_time),
                "end_time": min(clip_duration, max(0.0, transcript.end_time - clip_start_time)),
                "text": transcript.text,
            }
        )

    return adjusted_segments


def escape_vtt_text(text: str) -> str:
    """Escape special characters for WebVTT format.

    WebVTT has specific rules for special characters. While most characters
    are fine, we need to handle some edge cases.

    Args:
        text: Raw transcript text

    Returns:
        Text safe for inclusion in WebVTT file

    Note:
        WebVTT is generally permissive with text content. The main concerns are:
        - Ampersands should be used carefully
        - Line breaks within cue text should be preserved
        - No special escaping needed for most characters
    """
    # WebVTT doesn't require extensive escaping like HTML
    # Main concern is preserving the text as-is while avoiding format issues

    # Strip leading/trailing whitespace per cue first
    text = text.strip()

    # Replace any potential format-breaking sequences
    # Remove or replace "-->" which is the cue separator
    text = text.replace("-->", "→")

    # Ensure no WEBVTT keyword appears in text (extremely rare)
    if text.upper().startswith("WEBVTT"):
        text = f" {text}"  # Add leading space to avoid confusion

    return text


def generate_vtt_file(segments: list[dict[str, float | str]], output_path: Path) -> None:
    """Generate a WebVTT subtitle file from transcript segments.

    Creates a properly formatted WebVTT file that can be used with HTML5 video players.

    Args:
        segments: List of segment dictionaries, each containing:
            - start_time: float (seconds)
            - end_time: float (seconds)
            - text: str (subtitle text)
        output_path: Path where the .vtt file will be written

    Raises:
        OSError: If file cannot be written
        ValueError: If segments are invalid

    WebVTT Format:
        WEBVTT

        00:00:00.000 --> 00:00:05.200
        First subtitle text

        00:00:05.200 --> 00:00:12.500
        Second subtitle text
    """
    if not segments:
        # Create empty but valid WebVTT file
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
        return

    # Validate segments
    for i, seg in enumerate(segments):
        if "start_time" not in seg or "end_time" not in seg or "text" not in seg:
            raise ValueError(f"Segment {i} missing required fields (start_time, end_time, text)")

        if seg["end_time"] <= seg["start_time"]:
            raise ValueError(
                f"Segment {i} has invalid time range: {seg['start_time']}s - {seg['end_time']}s"
            )

    # Generate WebVTT file
    with open(output_path, "w", encoding="utf-8") as f:
        # WebVTT header
        f.write("WEBVTT\n\n")

        # Write each subtitle cue
        for i, segment in enumerate(segments):
            start = format_vtt_timestamp(segment["start_time"])
            end = format_vtt_timestamp(segment["end_time"])
            text = escape_vtt_text(str(segment["text"]))

            # Optional: Add cue identifier (helps with debugging)
            f.write(f"{i + 1}\n")

            # Cue timings
            f.write(f"{start} --> {end}\n")

            # Cue text
            f.write(f"{text}\n\n")


def generate_vtt_from_transcripts(
    transcripts: list, clip_start_time: float, clip_end_time: float, output_path: Path
) -> bool:
    """High-level function to generate VTT file from database transcripts.

    Combines timestamp adjustment and file generation into a single convenient function.

    Args:
        transcripts: List of Transcript objects from database
        clip_start_time: Start time of clip in original video (seconds)
        clip_end_time: End time of clip in original video (seconds)
        output_path: Path where the .vtt file will be written

    Returns:
        True if subtitle file was successfully generated, False if no transcripts

    Raises:
        OSError: If file cannot be written
        ValueError: If timestamps are invalid
    """
    if not transcripts:
        return False

    # Adjust timestamps to be relative to clip start
    clip_duration = clip_end_time - clip_start_time
    adjusted_segments = adjust_transcript_timestamps(transcripts, clip_start_time, clip_duration)

    # Filter out any segments that are completely outside the clip range
    # (shouldn't happen if database query is correct, but be defensive)
    clip_duration = clip_end_time - clip_start_time
    valid_segments = [
        seg
        for seg in adjusted_segments
        if seg["start_time"] < clip_duration and seg["end_time"] > 0
    ]

    if not valid_segments:
        return False

    # Generate the VTT file
    generate_vtt_file(valid_segments, output_path)
    return True
