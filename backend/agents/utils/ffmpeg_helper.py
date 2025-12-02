"""FFmpeg wrapper for video processing operations."""

import json
import subprocess
from pathlib import Path
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class FFmpegError(Exception):
    """Exception raised for FFmpeg operation failures."""

    pass


class FFmpegHelper:
    """Helper class for FFmpeg video processing operations."""

    def __init__(self) -> None:
        """Initialize FFmpeg helper."""
        self._verify_ffmpeg()

    def _verify_ffmpeg(self) -> None:
        """Verify FFmpeg is installed and accessible."""
        try:
            result = subprocess.run(
                ["ffmpeg", "-version"],
                capture_output=True,
                text=True,
                check=True,
                timeout=5,
            )
            logger.info("FFmpeg verified", extra={"version": result.stdout.split("\n")[0]})
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
            logger.error("FFmpeg not found or not working", exc_info=e)
            raise FFmpegError("FFmpeg is not installed or not accessible") from e

    def get_media_duration(self, media_path: Path) -> float:
        """Get media duration using ffprobe (works for both audio and video files).

        Args:
            media_path: Path to media file (audio or video)

        Returns:
            Duration in seconds

        Raises:
            FFmpegError: If ffprobe fails or no duration found
        """
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "quiet",
                    "-print_format",
                    "json",
                    "-show_format",
                    str(media_path),
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=30,
            )

            probe_data = json.loads(result.stdout)
            duration = float(probe_data.get("format", {}).get("duration", 0))

            if duration <= 0:
                raise FFmpegError("Invalid or missing duration in media file")

            return duration

        except subprocess.CalledProcessError as e:
            logger.error(
                "FFprobe failed",
                exc_info=e,
                extra={"media_path": str(media_path), "stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to get media duration: {e.stderr}") from e
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error("Failed to parse ffprobe output", exc_info=e)
            raise FFmpegError("Failed to parse media duration") from e

    def get_video_info(self, video_path: Path) -> dict[str, Any]:
        """Get video metadata using ffprobe.
        Args:
            video_path: Path to video file
        Returns:
            Dictionary with video metadata
        Raises:
            FFmpegError: If ffprobe fails
        """
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "quiet",
                    "-print_format",
                    "json",
                    "-show_format",
                    "-show_streams",
                    str(video_path),
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=30,
            )

            probe_data = json.loads(result.stdout)

            # extract video stream info
            video_stream = next(
                (s for s in probe_data.get("streams", []) if s["codec_type"] == "video"),
                None,
            )

            if not video_stream:
                raise FFmpegError("No video stream found")

            # Helper to safely get start time from stream
            def get_stream_start(stream: dict) -> float:
                # Priority 1: explicit start_time
                if "start_time" in stream:
                    try:
                        return float(stream["start_time"])
                    except (ValueError, TypeError):
                        pass

                # Priority 2: start_pts * time_base
                if "start_pts" in stream and "time_base" in stream:
                    try:
                        pts = float(stream["start_pts"])
                        # time_base is usually "1/90000" string
                        num, den = map(int, stream["time_base"].split("/"))
                        if den != 0:
                            return pts * (num / den)
                    except (ValueError, TypeError, AttributeError):
                        pass

                # Priority 3: format start_time (container level)
                if "start_time" in probe_data.get("format", {}):
                    try:
                        return float(probe_data["format"]["start_time"])
                    except (ValueError, TypeError):
                        pass

                return 0.0

            # Get audio stream if available
            audio_stream = next(
                (s for s in probe_data.get("streams", []) if s["codec_type"] == "audio"),
                None,
            )

            return {
                "duration": float(probe_data.get("format", {}).get("duration", 0)),
                "start_time": float(probe_data.get("format", {}).get("start_time", 0)),
                "video_start_time": get_stream_start(video_stream),
                "audio_start_time": get_stream_start(audio_stream) if audio_stream else 0.0,
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                # converts "30/1" to 30.0
                "fps": eval(video_stream.get("r_frame_rate", "30/1")),
                "codec": video_stream.get("codec_name", "unknown"),
                "bitrate": int(probe_data.get("format", {}).get("bit_rate", 0)),
            }

        except subprocess.CalledProcessError as e:
            logger.error(
                "FFprobe failed",
                exc_info=e,
                extra={"video_path": str(video_path), "stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to get video info: {e.stderr}") from e
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error("Failed to parse ffprobe output", exc_info=e)
            raise FFmpegError("Failed to parse video metadata") from e

    def extract_segment(
        self,
        input_path: Path,
        output_path: Path,
        start_time: float,
        end_time: float,
        **kwargs: Any,
    ) -> None:
        """Extract a video segment.
        Args:
            input_path: Input video path
            output_path: Output video path
            start_time: Start time in seconds
            end_time: End time in seconds
            **kwargs: Additional FFmpeg options
        Raises:
            FFmpegError: If extraction fails
        """
        duration = end_time - start_time

        # build ffmpeg command
        cmd = [
            "ffmpeg",
            "-y",  # overwrite output
            "-ss",
            str(start_time),
            "-i",
            str(input_path),
            "-t",
            str(duration),
            "-c",
            "copy",  # copy codec (fast, no re-encoding)
            "-avoid_negative_ts",
            "make_zero",
            str(output_path),
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=300,
            )
            logger.info(
                "Segment extracted",
                extra={
                    "input": str(input_path),
                    "output": str(output_path),
                    "start": start_time,
                    "end": end_time,
                },
            )
        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg segment extraction failed",
                exc_info=e,
                extra={"cmd": " ".join(cmd), "stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to extract segment: {e.stderr}") from e

    def concatenate_with_transitions(
        self,
        segments: list[Path],
        output_path: Path,
        transition_duration: float = 0.5,
        resolution: tuple[int, int] = (1920, 1080),
        segment_durations: list[float] | None = None,
    ) -> None:
        """Concatenate video segments with audio/video cross-fades.
        Args:
            segments: List of segment file paths
            output_path: Path for the merged output
            transition_duration: Transition duration in seconds
            resolution: (width, height) of the output
            segment_durations: Optional list of pre-computed durations (avoids re-probing)
        Raises:
            FFmpegError: If concatenation fails
        """
        if not segments or len(segments) == 0:
            raise FFmpegError("No segments to concatenate")

        # if only one clip, just copy it
        if len(segments) == 1:
            import shutil

            shutil.copy2(segments[0], output_path)
            return

        width, height = resolution
        try:
            # build ffmpeg input list
            cmd = ["ffmpeg", "-y"]
            for seg in segments:
                cmd.extend(["-i", str(seg)])

            # --- build complex filter ---
            vf_filters = []
            af_filters = []

            # scale/prepare each stream
            for i in range(len(segments)):
                vf_filters.append(
                    f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                    f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{i}]"
                )
                af_filters.append(
                    f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a{i}]"
                )

            # chain crossfades
            filter_parts = vf_filters + af_filters
            v_last = "v0"
            a_last = "a0"

            # dynamically compute offsets based on clip durations
            offset = 0.0
            for i in range(1, len(segments)):
                # use pre-computed duration if available, otherwise probe
                if segment_durations and i - 1 < len(segment_durations):
                    seg_duration = segment_durations[i - 1]
                else:
                    seg_info = self.get_video_info(segments[i - 1])
                    seg_duration = float(seg_info.get("duration", 0)) or 0

                # update cumulative offset
                offset += seg_duration - transition_duration

                v_out = f"v{i}" if i < len(segments) - 1 else "vout"
                a_out = f"a{i}" if i < len(segments) - 1 else "aout"

                # apply transitions using accurate offset
                filter_parts.append(
                    f"[{v_last}][v{i}]xfade=transition=fade:duration={transition_duration}:offset={offset:.3f}[{v_out}]"
                )
                filter_parts.append(f"[{a_last}][a{i}]acrossfade=d={transition_duration}[{a_out}]")

                v_last, a_last = v_out, a_out

            filter_complex = ";".join(filter_parts)

            # --- complete ffmpeg command ---
            cmd.extend(
                [
                    "-filter_complex",
                    filter_complex,
                    "-map",
                    f"[{v_last}]",
                    "-map",
                    f"[{a_last}]",
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    "-preset",
                    "fast",  # changed from "medium" for faster encoding
                    "-crf",
                    "23",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-movflags",
                    "+faststart",
                    str(output_path),
                ]
            )

            # run ffmpeg
            subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=1800)
            logger.info(
                "Videos concatenated with transitions (audio+video)",
                extra={"output": str(output_path), "segments": len(segments)},
            )

        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg concatenation failed",
                exc_info=e,
                extra={"stderr": e.stderr, "cmd": " ".join(cmd)},
            )
            raise FFmpegError(f"Failed to concatenate with transitions: {e.stderr}") from e

    def _build_crossfade_filter(
        self,
        num_segments: int,
        transition_duration: float,
        resolution: tuple[int, int],
    ) -> str:
        """Build FFmpeg filter complex for crossfade transitions.
        Args:
            num_segments: Number of video segments
            transition_duration: Transition duration in seconds
            resolution: Output resolution (width, height)
        Returns:
            FFmpeg filter complex string
        """
        width, height = resolution

        # scale all inputs to same resolution
        filters = []
        for i in range(num_segments):
            filters.append(
                f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{i}]"
            )
            filters.append(
                f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a{i}]"
            )

        # crossfade between videos
        current_video = "v0"
        current_audio = "a0"

        for i in range(1, num_segments):
            next_label_v = f"vx{i}" if i < num_segments - 1 else "outv"
            next_label_a = f"ax{i}" if i < num_segments - 1 else "outa"

            filters.append(
                f"[{current_video}][v{i}]xfade=transition=fade:"
                f"duration={transition_duration}:offset=0[{next_label_v}]"
            )
            filters.append(
                f"[{current_audio}][a{i}]acrossfade=d={transition_duration}[{next_label_a}]"
            )

            current_video = next_label_v
            current_audio = next_label_a

        return ";".join(filters)

    def generate_thumbnail(
        self,
        video_path: Path,
        output_path: Path,
        timestamp: float | None = None,
        size: tuple[int, int] = (1280, 720),
    ) -> None:
        """Generate thumbnail from video.
        Args:
            video_path: Input video path
            output_path: Output thumbnail path
            timestamp: Time in seconds (None for middle frame)
            size: Thumbnail size (width, height)
        Raises:
            FFmpegError: If thumbnail generation fails
        """
        # if no timestamp provided, use middle of video
        if timestamp is None:
            info = self.get_video_info(video_path)
            timestamp = info["duration"] / 2

        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            str(timestamp),
            "-i",
            str(video_path),
            "-vframes",
            "1",
            "-vf",
            f"scale={size[0]}:{size[1]}:force_original_aspect_ratio=decrease",
            "-q:v",
            "2",
            str(output_path),
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30,
            )
            logger.info(
                "Thumbnail generated",
                extra={
                    "video": str(video_path),
                    "thumbnail": str(output_path),
                    "timestamp": timestamp,
                },
            )
        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg thumbnail generation failed",
                exc_info=e,
                extra={"stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to generate thumbnail: {e.stderr}") from e

    def add_metadata(
        self,
        video_path: Path,
        output_path: Path,
        metadata: dict[str, str],
    ) -> None:
        """Add metadata to video file.
        Args:
            video_path: Input video path
            output_path: Output video path
            metadata: Dictionary of metadata key-value pairs
        Raises:
            FFmpegError: If metadata addition fails
        """
        cmd = ["ffmpeg", "-y", "-i", str(video_path), "-c", "copy"]

        # add metadata
        for key, value in metadata.items():
            cmd.extend(["-metadata", f"{key}={value}"])

        cmd.append(str(output_path))

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=120,
            )
            logger.info(
                "Metadata added to video",
                extra={"video": str(video_path), "metadata": metadata},
            )
        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg metadata addition failed",
                exc_info=e,
                extra={"stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to add metadata: {e.stderr}") from e

    def detect_silence(
        self,
        video_path: Path,
        silence_threshold_db: float = -35.0,
        min_silence_duration: float = 0.5,
    ) -> list[dict[str, float]]:
        """Detect silence in audio track using FFmpeg silencedetect filter.

        This is significantly faster than pydub-based detection as it:
        - Streams audio without loading into memory
        - Uses native C implementation
        - Processes audio directly from video container

        Args:
            video_path: Path to video file
            silence_threshold_db: Silence threshold in dB (default: -35)
            min_silence_duration: Minimum silence duration in seconds (default: 0.5)

        Returns:
            List of silence regions with start_time, end_time, duration in seconds

        Raises:
            FFmpegError: If silence detection fails
        """
        try:
            # build ffmpeg command with silencedetect filter
            # af = audio filter
            # -f null = no output file, just process
            cmd = [
                "ffmpeg",
                "-i",
                str(video_path),
                "-af",
                f"silencedetect=noise={silence_threshold_db}dB:d={min_silence_duration}",
                "-f",
                "null",
                "-",
            ]

            logger.info(
                "Running FFmpeg silence detection",
                extra={
                    "video_path": str(video_path),
                    "threshold_db": silence_threshold_db,
                    "min_duration": min_silence_duration,
                },
            )

            # run ffmpeg and capture stderr (where silencedetect outputs)
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,  # silencedetect always returns non-zero
                timeout=300,
            )

            # parse silence detection output from stderr
            silence_regions = self._parse_silence_output(result.stderr)

            logger.info(
                "FFmpeg silence detection completed",
                extra={
                    "silence_regions_found": len(silence_regions),
                    "video_path": str(video_path),
                },
            )

            return silence_regions

        except subprocess.TimeoutExpired as e:
            logger.error(
                "FFmpeg silence detection timeout",
                exc_info=e,
                extra={"video_path": str(video_path)},
            )
            raise FFmpegError("Silence detection timed out") from e
        except Exception as e:
            logger.error(
                "FFmpeg silence detection failed",
                exc_info=e,
                extra={"video_path": str(video_path)},
            )
            raise FFmpegError(f"Failed to detect silence: {e!s}") from e

    def _parse_silence_output(self, stderr_output: str) -> list[dict[str, float]]:
        """Parse FFmpeg silencedetect filter output.

        FFmpeg outputs lines like:
        [silencedetect @ 0x...] silence_start: 1.23
        [silencedetect @ 0x...] silence_end: 5.67 | silence_duration: 4.44

        Args:
            stderr_output: FFmpeg stderr output containing silencedetect results

        Returns:
            List of silence regions with start_time, end_time, duration
        """
        import re

        silence_regions = []
        current_start = None

        # regex patterns for silence detection output
        start_pattern = re.compile(r"silence_start:\s*([\d.]+)")
        end_pattern = re.compile(r"silence_end:\s*([\d.]+)")

        for line in stderr_output.split("\n"):
            # check for silence start
            start_match = start_pattern.search(line)
            if start_match:
                current_start = float(start_match.group(1))
                continue

            # check for silence end
            end_match = end_pattern.search(line)
            if end_match and current_start is not None:
                end_time = float(end_match.group(1))
                duration = end_time - current_start

                silence_regions.append(
                    {
                        "start_time": current_start,
                        "end_time": end_time,
                        "duration": duration,
                    }
                )
                current_start = None

        return silence_regions

    def extract_and_process_segment(
        self,
        input_path: Path,
        output_path: Path,
        start_time: float,
        end_time: float,
        resolution: tuple[int, int] | None = None,
        metadata: dict[str, str] | None = None,
        watermark_path: Path | str | None = None,
    ) -> None:
        """Extract segment and optionally transcode/add metadata in a single FFmpeg pass.

        This combines extract_segment, transcode_to_resolution, and add_metadata
        into one operation for ~3x speed improvement.

        Args:
            input_path: Input video path
            output_path: Output video path
            start_time: Start time in seconds
            end_time: End time in seconds
            resolution: Target resolution (width, height). If None, uses copy codec.
            metadata: Optional metadata dict to embed
            watermark_path: Optional path to watermark image to overlay

        Raises:
            FFmpegError: If processing fails
        """
        duration = end_time - start_time

        # Output Seek strategy - the ONLY guaranteed frame-accurate method
        # Move -ss AFTER -i for output seeking (slower but guaranteed accurate)
        # This decodes from file start to seek point, ensuring exact frame alignment
        # Not affected by keyframe positions, container quirks, or metadata

        # Build filter chain for scaling if needed (no trim filters)
        if resolution:
            width, height = resolution
            # Only use filter for scaling
            filter_complex = (
                f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v]"
            )
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-ss",
                str(start_time),  # Output seek (after -i) for guaranteed accuracy
                "-t",
                str(duration),  # Extract exact duration
                "-filter_complex",
                filter_complex,
                "-map",
                "[v]",
                "-map",
                "0:a",  # Map original audio (no filter needed)
            ]
        else:
            # No scaling - simple copy with output seek
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-ss",
                str(start_time),  # Output seek (after -i) for guaranteed accuracy
                "-t",
                str(duration),  # Extract exact duration
                "-c",
                "copy",  # Fast copy when no processing needed
            ]

        # add metadata if provided
        if metadata:
            for key, value in metadata.items():
                cmd.extend(["-metadata", f"{key}={value}"])

        # transcode or copy (only if we haven't already set up filters with -filter_complex)
        if (resolution or watermark_path) and not resolution:
            # NOTE: If resolution is set, we already added -filter_complex above
            # Only process watermark here if NO resolution scaling was requested
            # Build filter chain
            filters = []

            # 1. Scaling (should not happen here if resolution was set above)
            # This block is for watermark-only case
            if watermark_path:
                # No scaling, use input stream directly
                filters.append("null[main]")
                main_stream = "[main]"

                # 2. Watermark (if requested)
                # Escape path for ffmpeg
                wm_path = str(watermark_path).replace("\\", "/").replace(":", "\\:")

                # Load watermark
                filters.append(f"movie={wm_path}[wm]")

                # Scale watermark relative to video (10% width)
                # [wm][main]scale2ref... outputs [wm_scaled][main_ref]
                filters.append(f"[wm]{main_stream}scale2ref=w=iw*0.1:h=-1[wm_scaled][main_ref]")

                # Overlay watermark (bottom-right with 10px padding)
                filters.append("[main_ref][wm_scaled]overlay=W-w-10:H-h-10")

            cmd.extend(
                [
                    "-vf",
                    ";".join(filters),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "23",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-movflags",
                    "+faststart",
                ]
            )
        elif not resolution and not watermark_path:
            # If using copy mode (no filters at all), we already set up the command above
            pass
        else:
            # Resolution was set, so -filter_complex is already in the command
            # Just add encoding parameters
            cmd.extend(
                [
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "23",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-movflags",
                    "+faststart",
                ]
            )

        cmd.append(str(output_path))

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=300,
            )
            logger.info(
                "Segment extracted and processed",
                extra={
                    "input": str(input_path),
                    "output": str(output_path),
                    "start": start_time,
                    "end": end_time,
                    "resolution": resolution,
                    "watermark": bool(watermark_path),
                },
            )
        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg segment processing failed",
                exc_info=e,
                extra={"stderr": e.stderr},
            )
            raise FFmpegError(f"Failed to process segment: {e.stderr}") from e

    def transcode_to_resolution(
        self,
        input_path: str,
        output_path: str,
        resolution: tuple[int, int] = (854, 480),
        crf: int = 32,
        threads: int = 4,
    ):
        width, height = resolution
        try:
            # Choose codecs based on output format
            output_path = str(output_path)
            input_path = str(input_path)
            if output_path.lower().endswith(".webm"):
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-i",
                    input_path,
                    "-vf",
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                    "-c:v",
                    "libvpx-vp9",
                    "-b:v",
                    "0",
                    "-crf",
                    str(crf),
                    "-row-mt",
                    "1",
                    "-pix_fmt",
                    "yuv420p",
                    "-speed",
                    "2",
                    "-threads",
                    str(threads),
                    "-c:a",
                    "libopus",
                    "-b:a",
                    "96k",
                    "-ac",
                    "2",
                    output_path,
                ]
            else:
                # Default for MP4/MOV - use fast preset for better performance
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-i",
                    input_path,
                    "-vf",
                    f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",  # changed from "medium" for 2x speed improvement
                    "-b:v",
                    "4M",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "192k",
                    "-movflags",
                    "+faststart",
                    output_path,
                ]

            subprocess.run(cmd, check=True, capture_output=True, text=True)
            return output_path

        except subprocess.CalledProcessError as e:
            logger.error("FFmpeg transcoding failed", exc_info=e, extra={"stderr": e.stderr})
            raise FFmpegError(f"Failed to transcode video: {e.stderr}") from e

    def process_podcast_audio(
        self,
        input_path: Path,
        output_path: Path,
        silence_regions: list[dict[str, float]] | None = None,
        metadata: dict[str, str] | None = None,
    ) -> None:
        """Process audio for podcast: remove silence, normalize, and encode to MP3.

        Args:
            input_path: Input video/audio path
            output_path: Output MP3 path
            silence_regions: List of silence regions to remove (start_time, end_time)
            metadata: ID3 tags to add

        Raises:
            FFmpegError: If processing fails
        """
        # 1. Build filter complex
        filters = []

        # Select audio stream
        # [0:a] is the input audio
        current_stream = "[0:a]"

        # Silence removal (if regions provided)
        if silence_regions and len(silence_regions) > 0:
            # We need to keep the NON-silent parts.
            # So if silence is 10-20, we keep 0-10 and 20-end.

            # Sort regions just in case
            sorted_regions = sorted(silence_regions, key=lambda x: x["start_time"])

            select_parts = []
            last_end = 0.0

            for region in sorted_regions:
                start = region["start_time"]
                end = region["end_time"]

                # Keep segment before silence if it has duration
                if start > last_end:
                    select_parts.append(f"between(t,{last_end},{start})")

                last_end = end

            # Add final segment (from last silence end to infinity)
            select_parts.append(f"gte(t,{last_end})")

            select_expr = "+".join(select_parts)

            # Use aselect filter to keep non-silent parts
            # asetpts=N/SR/TB resets timestamps to be continuous
            filters.append(f"{current_stream}aselect='{select_expr}',asetpts=N/SR/TB[selected]")
            current_stream = "[selected]"

        # Audio normalization (Loudness Normalization)
        # Target: -16 LUFS (standard for podcasts), True Peak -1.5 dBTP
        filters.append(f"{current_stream}loudnorm=I=-16:TP=-1.5:LRA=11[normalized]")
        current_stream = "[normalized]"

        # Build command
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-filter_complex",
            ";".join(filters),
            "-map",
            current_stream,
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            "-ar",
            "44100",
            "-ac",
            "2",
        ]

        # Add metadata
        if metadata:
            for key, value in metadata.items():
                cmd.extend(["-metadata", f"{key}={value}"])

        cmd.append(str(output_path))

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=600,  # 10 minutes max
            )
            logger.info(
                "Podcast audio processed",
                extra={
                    "input": str(input_path),
                    "output": str(output_path),
                    "silence_regions_removed": len(silence_regions) if silence_regions else 0,
                },
            )
        except subprocess.CalledProcessError as e:
            logger.error(
                "FFmpeg podcast processing failed",
                exc_info=e,
                extra={"stderr": e.stderr, "cmd": " ".join(cmd)},
            )
            raise FFmpegError(f"Failed to process podcast audio: {e.stderr}") from e
