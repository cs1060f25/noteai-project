#!/usr/bin/env python3
"""Check video file information and audio tracks.

This script helps diagnose video files before running silence detection.

Usage:
    python scripts/check_video_info.py /path/to/video.mp4
"""

import subprocess
import sys
from pathlib import Path


def check_video_with_ffprobe(video_path: str) -> dict:
    """check video file information using ffprobe.

    Args:
        video_path: path to video file

    Returns:
        dict with video information
    """
    try:
        # run ffprobe to get detailed stream information
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "stream=codec_type,codec_name,channels,sample_rate,duration",
                "-of",
                "default=noprint_wrappers=1",
                video_path,
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        info = {
            "has_video": False,
            "has_audio": False,
            "audio_codec": None,
            "video_codec": None,
            "audio_channels": None,
            "audio_sample_rate": None,
        }

        # parse output
        lines = result.stdout.strip().split("\n")
        current_stream = {}

        for line in lines:
            if "=" in line:
                key, value = line.split("=", 1)
                current_stream[key] = value
            elif line == "":
                # process completed stream
                if current_stream.get("codec_type") == "video":
                    info["has_video"] = True
                    info["video_codec"] = current_stream.get("codec_name")
                elif current_stream.get("codec_type") == "audio":
                    info["has_audio"] = True
                    info["audio_codec"] = current_stream.get("codec_name")
                    info["audio_channels"] = current_stream.get("channels")
                    info["audio_sample_rate"] = current_stream.get("sample_rate")
                current_stream = {}

        # process last stream
        if current_stream.get("codec_type") == "video":
            info["has_video"] = True
            info["video_codec"] = current_stream.get("codec_name")
        elif current_stream.get("codec_type") == "audio":
            info["has_audio"] = True
            info["audio_codec"] = current_stream.get("codec_name")
            info["audio_channels"] = current_stream.get("channels")
            info["audio_sample_rate"] = current_stream.get("sample_rate")

        return info

    except subprocess.CalledProcessError as e:
        print(f"❌ Error running ffprobe: {e.stderr}")
        return None
    except FileNotFoundError:
        print("❌ ffprobe not found. Please install ffmpeg:")
        print("   brew install ffmpeg")
        return None


def check_video_file(video_path: str):
    """check video file and display information.

    Args:
        video_path: path to video file
    """
    print(f"\n{'=' * 60}")
    print("Video File Diagnostics")
    print(f"{'=' * 60}")

    # check if file exists
    path = Path(video_path)
    if not path.exists():
        print(f"❌ File not found: {video_path}")
        return

    print(f"File: {path.absolute()}")
    print(f"Size: {path.stat().st_size / (1024 * 1024):.2f} MB")
    print(f"{'=' * 60}\n")

    # get video information
    info = check_video_with_ffprobe(str(path.absolute()))

    if info is None:
        return

    # display results
    print("Stream Information:")
    print(f"{'=' * 60}")

    # video stream
    if info["has_video"]:
        print(f"✅ Video Track: Present")
        print(f"   Codec: {info['video_codec']}")
    else:
        print("❌ Video Track: Not found")

    # audio stream
    if info["has_audio"]:
        print(f"✅ Audio Track: Present")
        print(f"   Codec: {info['audio_codec']}")
        if info["audio_channels"]:
            print(f"   Channels: {info['audio_channels']}")
        if info["audio_sample_rate"]:
            print(f"   Sample Rate: {info['audio_sample_rate']} Hz")
    else:
        print("❌ Audio Track: Not found")

    print(f"{'=' * 60}\n")

    # recommendations
    print("Recommendations:")
    print(f"{'=' * 60}")

    if not info["has_audio"]:
        print("⚠️  This video has NO audio track!")
        print("    Silence detection requires an audio track.")
        print("\n    Solutions:")
        print("    1. Use a different video file with audio")
        print("    2. Add an audio track to this video:")
        print(f"       ffmpeg -i {video_path} -f lavfi -i anullsrc -c:v copy -c:a aac -shortest output.mp4")
    elif not info["has_video"]:
        print("⚠️  This file has NO video track!")
        print("    This appears to be an audio-only file.")
    else:
        print("✅ This video file is compatible with silence detection!")
        print(f"\n    You can run:")
        print(f"    uv run python scripts/test_silence_detector_manual.py {video_path}")

    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/check_video_info.py /path/to/video.mp4")
        print("\nExample:")
        print("  python scripts/check_video_info.py ~/Downloads/lecture.mp4")
        sys.exit(1)

    video_path = sys.argv[1]
    check_video_file(video_path)
