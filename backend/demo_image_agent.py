"""Demonstration script for Image Agent visual content extraction.

This script demonstrates the Image Agent extracting text and visual elements
from video frames using Gemini Vision API, without running the full pipeline.

Usage:
    python demo_image_agent.py <path_to_video_file>

Example:
    python demo_image_agent.py test_lecture.mp4
"""

import sys
import time
from pathlib import Path

import cv2
import google.generativeai as genai
import numpy as np
from PIL import Image

from app.core.settings import settings


def extract_frame_at_timestamp(video_path: str, timestamp_seconds: float) -> np.ndarray | None:
    """Extract a single frame from video at specified timestamp.

    Args:
        video_path: Path to video file
        timestamp_seconds: Timestamp in seconds

    Returns:
        Frame as numpy array (BGR format), or None if failed
    """
    cap = cv2.VideoCapture(video_path)

    try:
        if not cap.isOpened():
            print(f"❌ Failed to open video: {video_path}")
            return None

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_number = int(timestamp_seconds * fps)

        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()

        if not ret:
            print(f"❌ Failed to read frame at {timestamp_seconds}s")
            return None

        return frame

    finally:
        cap.release()


def analyze_frame_with_gemini_demo(frame: np.ndarray) -> dict:
    """Analyze a frame using Gemini Vision API (demonstration version).

    Args:
        frame: Video frame (BGR format from OpenCV)

    Returns:
        Dictionary with extracted visual content
    """
    # Convert BGR (OpenCV) to RGB (PIL/Gemini)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Convert to PIL Image
    pil_image = Image.fromarray(rgb_frame)

    # Create Gemini Vision model
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Build prompt for slide content extraction
    prompt = """Analyze this educational video frame/slide and extract:

1. **Text Content**: All visible text (titles, bullet points, equations, labels)
2. **Visual Elements**: Types of diagrams, charts, or graphics present
3. **Key Concepts**: Main topics or concepts shown visually

Return your analysis in JSON format:
{
    "text_blocks": ["text1", "text2", ...],
    "visual_elements": ["diagram", "chart", "equation", ...],
    "key_concepts": ["concept1", "concept2", ...]
}

If the frame is mostly empty or contains no meaningful content, return empty arrays."""

    print("🤖 Calling Gemini Vision API...")
    response = model.generate_content([prompt, pil_image])

    # Parse response
    import json

    response_text = response.text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        # Fallback: return raw response as text
        parsed = {
            "text_blocks": [response_text] if response_text else [],
            "visual_elements": [],
            "key_concepts": [],
        }

    return parsed


def main():
    """Run Image Agent demonstration."""
    print("=" * 80)
    print("IMAGE AGENT DEMONSTRATION")
    print("=" * 80)
    print()

    # Check for video path argument
    if len(sys.argv) < 2:
        print("❌ Error: No video file specified")
        print()
        print("Usage: python demo_image_agent.py <path_to_video_file>")
        print()
        print("Example:")
        print("  python demo_image_agent.py test_lecture.mp4")
        sys.exit(1)

    video_path = sys.argv[1]

    # Validate video file exists
    if not Path(video_path).exists():
        print(f"❌ Error: Video file not found: {video_path}")
        sys.exit(1)

    print(f"📹 Video: {video_path}")
    print()

    # Check Gemini API key
    if not settings.gemini_api_key:
        print("❌ Error: GEMINI_API_KEY not configured")
        print("Please set the GEMINI_API_KEY environment variable")
        sys.exit(1)

    # Configure Gemini
    genai.configure(api_key=settings.gemini_api_key)
    print("✅ Gemini API configured")
    print()

    # Get video information
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps if fps > 0 else 0
    cap.release()

    print("📊 Video Information:")
    print(f"   Resolution: {width}x{height}")
    print(f"   FPS: {fps:.2f}")
    print(f"   Duration: {duration:.2f} seconds")
    print(f"   Total frames: {total_frames}")
    print()

    # Extract and analyze 3 sample frames
    sample_timestamps = [
        duration * 0.25,  # 25% into video
        duration * 0.5,  # 50% into video
        duration * 0.75,  # 75% into video
    ]

    print("🎯 Extracting and analyzing sample frames...")
    print()

    all_results = []

    for i, timestamp in enumerate(sample_timestamps, 1):
        print(f"Frame {i}/3 at {timestamp:.1f}s:")
        print("-" * 60)

        # Extract frame
        frame = extract_frame_at_timestamp(video_path, timestamp)
        if frame is None:
            continue

        print(f"✅ Frame extracted: {frame.shape[1]}x{frame.shape[0]} pixels")

        # Analyze with Gemini Vision
        start_time = time.time()
        result = analyze_frame_with_gemini_demo(frame)
        analysis_time = time.time() - start_time

        print(f"✅ Analysis completed in {analysis_time:.2f}s")
        print()

        # Display results
        print("📝 TEXT BLOCKS:")
        if result.get("text_blocks"):
            for text in result["text_blocks"]:
                print(f"   • {text}")
        else:
            print("   (none detected)")
        print()

        print("🎨 VISUAL ELEMENTS:")
        if result.get("visual_elements"):
            for element in result["visual_elements"]:
                print(f"   • {element}")
        else:
            print("   (none detected)")
        print()

        print("💡 KEY CONCEPTS:")
        if result.get("key_concepts"):
            for concept in result["key_concepts"]:
                print(f"   • {concept}")
        else:
            print("   (none detected)")
        print()

        all_results.append(
            {
                "timestamp": timestamp,
                "result": result,
            }
        )

    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print(f"✅ Analyzed {len(all_results)} frames from video")

    total_text_blocks = sum(len(r["result"].get("text_blocks", [])) for r in all_results)
    total_visual_elements = sum(len(r["result"].get("visual_elements", [])) for r in all_results)
    total_key_concepts = sum(len(r["result"].get("key_concepts", [])) for r in all_results)

    print(f"📊 Total text blocks extracted: {total_text_blocks}")
    print(f"🎨 Total visual elements detected: {total_visual_elements}")
    print(f"💡 Total key concepts identified: {total_key_concepts}")
    print()

    # Show unique elements
    all_visual_elements = []
    all_key_concepts = []

    for r in all_results:
        all_visual_elements.extend(r["result"].get("visual_elements", []))
        all_key_concepts.extend(r["result"].get("key_concepts", []))

    unique_visual_elements = list(set(all_visual_elements))
    unique_key_concepts = list(set(all_key_concepts))

    if unique_visual_elements:
        print("🎨 Unique visual elements across all frames:")
        for element in unique_visual_elements:
            print(f"   • {element}")
        print()

    if unique_key_concepts:
        print("💡 Unique key concepts across all frames:")
        for concept in unique_key_concepts:
            print(f"   • {concept}")
        print()

    print("✅ Image Agent demonstration complete!")
    print()


if __name__ == "__main__":
    main()
