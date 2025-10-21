#!/usr/bin/env python3
"""Manual test script for silence detector with local video file.

This script allows you to test the silence detector without S3 by providing
a local video file path.

Usage:
    python scripts/test_silence_detector_manual.py /path/to/video.mp4
"""

import sys
from pathlib import Path

# add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.silence_detector import analyze_audio_silence, store_silence_regions


def test_silence_detector_local(video_path: str, job_id: str = "manual-test-001"):
    """test silence detector with a local video file.

    Args:
        video_path: path to local video file
        job_id: job identifier for testing
    """
    print(f"\n{'='*60}")
    print(f"Testing Silence Detector")
    print(f"{'='*60}")
    print(f"Video file: {video_path}")
    print(f"Job ID: {job_id}")
    print(f"{'='*60}\n")

    # check if file exists
    if not Path(video_path).exists():
        print(f"❌ Error: Video file not found: {video_path}")
        return

    # step 1: analyze audio for silence
    print("Step 1: Analyzing audio for silence...")
    try:
        silence_regions = analyze_audio_silence(video_path, job_id)
        print(f"✅ Analysis complete! Found {len(silence_regions)} silence regions\n")
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        return

    # step 2: display results
    print("Step 2: Silence regions detected:")
    print(f"{'='*60}")

    if not silence_regions:
        print("No silence regions detected in this video.")
    else:
        total_silence = sum(r["duration"] for r in silence_regions)

        for i, region in enumerate(silence_regions, 1):
            print(f"\nRegion {i}:")
            print(f"  Start time: {region['start_time']:.2f}s")
            print(f"  End time: {region['end_time']:.2f}s")
            print(f"  Duration: {region['duration']:.2f}s")
            print(f"  Type: {region['silence_type']}")
            print(f"  Threshold: {region['amplitude_threshold']} dBFS")

        print(f"\n{'='*60}")
        print(f"Total silence duration: {total_silence:.2f}s")
        print(f"Total regions: {len(silence_regions)}")
        print(f"{'='*60}\n")

    # step 3: optionally store in database
    store_choice = input("Do you want to store these results in the database? (y/n): ")

    if store_choice.lower() == "y":
        print("\nStep 3: Storing silence regions in database...")
        try:
            store_silence_regions(silence_regions, job_id)
            print(f"✅ Successfully stored {len(silence_regions)} regions in database!")
        except Exception as e:
            print(f"❌ Failed to store in database: {e}")
    else:
        print("\nSkipping database storage.")

    print(f"\n{'='*60}")
    print("Test completed!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_silence_detector_manual.py /path/to/video.mp4")
        print("\nExample:")
        print("  python scripts/test_silence_detector_manual.py ~/Downloads/lecture.mp4")
        sys.exit(1)

    video_path = sys.argv[1]
    test_silence_detector_local(video_path)
