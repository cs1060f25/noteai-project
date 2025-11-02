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

            return {
                "duration": float(probe_data.get("format", {}).get("duration", 0)),
                "width": int(video_stream.get("width", 0)),
                "height": int(video_stream.get("height", 0)),
                "fps": eval(video_stream.get("r_frame_rate", "30/1")),  # converts "30/1" to 30.0
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
            result = subprocess.run(
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
    ) -> None:
        """Concatenate video segments with audio/video cross-fades.

        Args:
            segments: List of segment file paths
            output_path: Path for the merged output
            transition_duration: Transition duration in seconds
            resolution: (width, height) of the output
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

            # dynamically compute offsets based on real clip durations
            offset = 0.0
            for i in range(1, len(segments)):
                # get duration of previous segment
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
                filter_parts.append(
                    f"[{a_last}][a{i}]acrossfade=d={transition_duration}[{a_out}]"
                )

                v_last, a_last = v_out, a_out

            filter_complex = ";".join(filter_parts)

            # --- complete ffmpeg command ---
            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", f"[{v_last}]",
                "-map", f"[{a_last}]",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-preset", "medium",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                "-movflags", "+faststart",
                str(output_path),
            ])

            # run ffmpeg
            result = subprocess.run(
                cmd, capture_output=True, text=True, check=True, timeout=1800
            )
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
            result = subprocess.run(
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
            result = subprocess.run(
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
                    "ffmpeg", "-y", "-i", input_path,
                    "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                    "-c:v", "libvpx-vp9",
                    "-b:v", "0",
                    "-crf", str(crf),
                    "-row-mt", "1",
                    "-pix_fmt", "yuv420p",
                    "-speed", "2",
                    "-threads", str(threads),
                    "-c:a", "libopus",
                    "-b:a", "96k",
                    "-ac", "2",
                    output_path,
                ]
            else:
                # Default for MP4/MOV
                cmd = [
                    "ffmpeg", "-y", "-i", input_path,
                    "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
                    "-c:v", "libx264",
                    "-preset", "medium",
                    "-b:v", "4M",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-movflags", "+faststart",
                    output_path,
                ]

            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            return output_path

        except subprocess.CalledProcessError as e:
            print("FFmpeg transcoding failed")
            raise FFmpegError(f"Failed to transcode video: {e.stderr}") from e
