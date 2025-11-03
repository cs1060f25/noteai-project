#!/usr/bin/env python3
"""Manual test script for transcription agent with local video file.

This script allows you to test the transcription agent without S3 by providing
a local video file path.

Usage:
    python scripts/test_transcript_agent_manual.py /path/to/video.mp4 [--skip-silence]

Options:
    --skip-silence: Skip silence detection and transcribe entire video
"""

import sys
from pathlib import Path

# add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pydub import AudioSegment

from agents.silence_detector import analyze_audio_silence, store_silence_regions
from agents.transcript_agent import (
    extract_and_segment_audio,
    remap_timestamps_to_original,
    store_transcript_segments,
    transcribe_with_google_speech,
    validate_google_cloud_config,
)


def test_transcription_with_silence_removal(
    video_path: str, job_id: str = "manual-test-transcript-001"
):
    """test transcription agent with silence removal.

    Args:
        video_path: path to local video file
        job_id: job identifier for testing
    """
    print(f"\n{'='*60}")
    print("Testing Transcription Agent (with silence removal)")
    print(f"{'='*60}")
    print(f"Video file: {video_path}")
    print(f"Job ID: {job_id}")
    print(f"{'='*60}\n")

    # check if file exists
    if not Path(video_path).exists():
        print(f"❌ Error: Video file not found: {video_path}")
        return

    # validate google cloud config
    print("Step 0: Validating Google Cloud configuration...")
    try:
        validate_google_cloud_config()
        print("✅ Google Cloud credentials are configured\n")
    except Exception as e:
        print(f"❌ Google Cloud configuration failed: {e}")
        return

    # get video duration
    print("Step 1: Getting video duration...")
    try:
        audio = AudioSegment.from_file(video_path)
        video_duration = len(audio) / 1000.0  # convert ms to seconds
        print(f"✅ Video duration: {video_duration:.2f}s\n")
    except Exception as e:
        print(f"❌ Failed to get video duration: {e}")
        return

    # step 2: run silence detection
    print("Step 2: Detecting silence regions...")
    try:
        silence_regions = analyze_audio_silence(video_path, job_id)
        print(f"✅ Found {len(silence_regions)} silence regions\n")

        if silence_regions:
            total_silence = sum(r["duration"] for r in silence_regions)
            print(f"   Total silence: {total_silence:.2f}s")
            print(f"   Silence percentage: {(total_silence/video_duration*100):.1f}%\n")

        # optionally store silence regions
        try:
            store_choice = input("Store silence regions in database? (y/n): ").lower()
        except EOFError:
            store_choice = "n"

        if store_choice == "y":
            store_silence_regions(silence_regions, job_id)
            print("✅ Silence regions stored\n")

    except Exception as e:
        print(f"❌ Silence detection failed: {e}")
        return

    # step 3: calculate non-silent intervals (without database)
    print("Step 3: Calculating non-silent intervals...")
    try:
        # manually calculate non-silent intervals
        non_silent_intervals = []
        current_time = 0.0

        # sort silence regions
        sorted_regions = sorted(silence_regions, key=lambda r: r["start_time"])

        for region in sorted_regions:
            if current_time < region["start_time"]:
                non_silent_intervals.append(
                    {
                        "start_time": current_time,
                        "end_time": region["start_time"],
                    }
                )
            current_time = max(current_time, region["end_time"])

        # add remaining time
        if current_time < video_duration:
            non_silent_intervals.append({"start_time": current_time, "end_time": video_duration})

        print(f"✅ Found {len(non_silent_intervals)} non-silent intervals\n")

        if not non_silent_intervals:
            print("❌ No non-silent audio to transcribe!")
            return

    except Exception as e:
        print(f"❌ Failed to calculate intervals: {e}")
        return

    # step 4: extract and segment audio
    print("Step 4: Extracting and segmenting audio...")
    try:
        audio_path, timestamp_mapping = extract_and_segment_audio(
            video_path, non_silent_intervals, job_id
        )
        print("✅ Audio extracted and segmented")
        print(f"   Audio file: {audio_path}")
        print(f"   Timestamp mappings: {len(timestamp_mapping)}\n")
    except Exception as e:
        print(f"❌ Audio extraction failed: {e}")
        return

    # step 5: transcribe with whisper
    print("Step 5: Transcribing with Google Cloud Speech-to-Text...")
    print("   (This may take a while...)\n")
    try:
        transcription_result = transcribe_with_google_speech(audio_path, job_id)
        segments = transcription_result.get("segments", [])
        print("✅ Transcription complete!")
        print(f"   Language: {transcription_result.get('language', 'unknown')}")
        print(f"   Segments: {len(segments)}")
        print(f"   Duration: {transcription_result.get('duration', 0):.2f}s\n")
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return

    # step 6: remap timestamps
    print("Step 6: Remapping timestamps to original video time...")
    try:
        remapped_segments = remap_timestamps_to_original(segments, timestamp_mapping, job_id)
        print(f"✅ Timestamps remapped: {len(remapped_segments)} segments\n")
    except Exception as e:
        print(f"❌ Timestamp remapping failed: {e}")
        return

    # step 7: display results
    print("Step 7: Transcription results:")
    print(f"{'='*60}")

    if not remapped_segments:
        print("No transcription segments generated.")
    else:
        for i, segment in enumerate(remapped_segments[:10], 1):  # show first 10
            print(f"\nSegment {i}:")
            print(f"  Time: {segment['start_time']:.2f}s - {segment['end_time']:.2f}s")
            print(f"  Text: {segment['text']}")
            if segment.get("confidence"):
                print(f"  Confidence: {segment['confidence']:.3f}")

        if len(remapped_segments) > 10:
            print(f"\n... and {len(remapped_segments) - 10} more segments")

        print(f"\n{'='*60}")
        print(f"Total segments: {len(remapped_segments)}")

        # calculate average confidence
        confidences = [s["confidence"] for s in remapped_segments if s.get("confidence")]
        if confidences:
            avg_conf = sum(confidences) / len(confidences)
            print(f"Average confidence: {avg_conf:.3f}")

        print(f"{'='*60}\n")

    # step 8: optionally store in database
    try:
        store_choice = input("Store transcript segments in database? (y/n): ").lower()
    except EOFError:
        store_choice = "n"

    if store_choice == "y":
        print("\nStep 8: Storing transcript segments in database...")
        try:
            store_transcript_segments(remapped_segments, job_id)
            print(f"✅ Successfully stored {len(remapped_segments)} segments!")
        except Exception as e:
            print(f"❌ Failed to store in database: {e}")
    else:
        print("\nSkipping database storage.")

    print(f"\n{'='*60}")
    print("Test completed successfully!")
    print(f"{'='*60}\n")


def test_transcription_without_silence(video_path: str, job_id: str = "manual-test-transcript-002"):
    """test transcription agent without silence removal.

    Args:
        video_path: path to local video file
        job_id: job identifier for testing
    """
    print(f"\n{'='*60}")
    print("Testing Transcription Agent (without silence removal)")
    print(f"{'='*60}")
    print(f"Video file: {video_path}")
    print(f"Job ID: {job_id}")
    print(f"{'='*60}\n")

    # check if file exists
    if not Path(video_path).exists():
        print(f"❌ Error: Video file not found: {video_path}")
        return

    # validate google cloud config
    print("Step 0: Validating Google Cloud configuration...")
    try:
        validate_google_cloud_config()
        print("✅ Google Cloud credentials are configured\n")
    except Exception as e:
        print(f"❌ Google Cloud configuration failed: {e}")
        return

    # get video duration
    print("Step 1: Getting video duration...")
    try:
        audio = AudioSegment.from_file(video_path)
        video_duration = len(audio) / 1000.0
        print(f"✅ Video duration: {video_duration:.2f}s\n")
    except Exception as e:
        print(f"❌ Failed to get video duration: {e}")
        return

    # create single interval for entire video
    non_silent_intervals = [{"start_time": 0.0, "end_time": video_duration}]
    print("Transcribing entire video (no silence removal)\n")

    # extract audio
    print("Step 2: Extracting audio...")
    try:
        audio_path, _timestamp_mapping = extract_and_segment_audio(
            video_path, non_silent_intervals, job_id
        )
        print(f"✅ Audio extracted: {audio_path}\n")
    except Exception as e:
        print(f"❌ Audio extraction failed: {e}")
        return

    # transcribe
    print("Step 3: Transcribing with Google Cloud Speech-to-Text...")
    print("   (This may take a while...)\n")
    try:
        transcription_result = transcribe_with_google_speech(audio_path, job_id)
        segments = transcription_result.get("segments", [])
        print("✅ Transcription complete!")
        print(f"   Language: {transcription_result.get('language', 'unknown')}")
        print(f"   Segments: {len(segments)}\n")
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return

    # since we have no silence removal, timestamps are already correct
    remapped_segments = [
        {
            "start_time": round(seg["start"], 2),
            "end_time": round(seg["end"], 2),
            "text": seg["text"].strip(),
            "confidence": seg.get("confidence"),
        }
        for seg in segments
    ]

    # display results
    print("Step 4: Transcription results:")
    print(f"{'='*60}")

    for i, segment in enumerate(remapped_segments[:10], 1):
        print(f"\nSegment {i}:")
        print(f"  Time: {segment['start_time']:.2f}s - {segment['end_time']:.2f}s")
        print(f"  Text: {segment['text']}")
        if segment.get("confidence"):
            print(f"  Confidence: {segment['confidence']:.3f}")

    if len(remapped_segments) > 10:
        print(f"\n... and {len(remapped_segments) - 10} more segments")

    print(f"\n{'='*60}")
    print(f"Total segments: {len(remapped_segments)}")
    print(f"{'='*60}\n")

    print(f"{'='*60}")
    print("Test completed successfully!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: python scripts/test_transcript_agent_manual.py /path/to/video.mp4 [--skip-silence]"
        )
        print("\nOptions:")
        print("  --skip-silence    Skip silence detection and transcribe entire video")
        print("\nExamples:")
        print("  python scripts/test_transcript_agent_manual.py ~/Downloads/lecture.mp4")
        print(
            "  python scripts/test_transcript_agent_manual.py ~/Downloads/lecture.mp4 --skip-silence"
        )
        sys.exit(1)

    video_path = sys.argv[1]
    skip_silence = "--skip-silence" in sys.argv

    if skip_silence:
        test_transcription_without_silence(video_path)
    else:
        test_transcription_with_silence_removal(video_path)
