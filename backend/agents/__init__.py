"""AI agents for video processing pipeline."""

# export placeholder functions using relative imports
from .content_analyzer import analyze_content
from .image_agent import extract_slide_content
from .layout_detector import detect_layout
from .segment_extractor import extract_segments
from .silence_detector import detect_silence
from .transcript_agent import generate_transcript
from .video_compiler import compile_clips

__all__ = [
    "analyze_content",
    "compile_clips",
    "detect_layout",
    "detect_silence",
    "extract_segments",
    "extract_slide_content",
    "generate_transcript",
]
