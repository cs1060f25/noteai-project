"""Podcast agent for generating AI-narrated podcasts."""

import json
import time
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types

from agents.utils.ffmpeg_helper import FFmpegHelper
from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


class PodcastAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.gemini_api_key
        if not self.api_key:
            raise ValueError("Gemini API key is required")

        self.client = genai.Client(api_key=self.api_key)
        self.ffmpeg = FFmpegHelper()

    def generate_script(
        self,
        transcript_text: str,
        visual_summary: str,
        num_speakers: int = 2,
        style: str = "Casual and engaging",
    ) -> list[dict[str, str]]:
        """Generate a podcast script from transcript and visual content."""

        logger.info("Generating podcast script")

        prompt = f"""
        You are an expert podcast producer. Create a script for a {style} podcast based on the following lecture content.

        TRANSCRIPT:
        {transcript_text[:50000]}  # Limit context to avoid token limits if needed

        VISUAL CONTENT SUMMARY:
        {visual_summary}

        INSTRUCTIONS:
        - Create a script for {num_speakers} speaker(s).
        - If 2 speakers: Speaker 1 is the Host (curious, guides conversation), Speaker 2 is the Expert (knowledgeable, explains concepts).
        - If 1 speaker: The Host narrates the content directly to the listener.
        - The script should be engaging, conversational, and educational.
        - Use the visual content to describe what was shown on slides when relevant.
        - CRITICAL: Keep the total length strictly under 1 minute (maximum 150-160 words).
        - Focus only on the absolute most important takeaway.
        - Output strictly valid JSON format: a list of objects with "speaker" and "text" keys.

        EXAMPLE OUTPUT:
        [
            {{"speaker": "Host", "text": "Welcome back to the show! Today we're diving into..."}},
            {{"speaker": "Expert", "text": "That's right. It's a fascinating topic because..."}}
        ]
        """

        try:
            response = self.client.models.generate_content(
                model=settings.gemini_model,  # Use configured model or specific one
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json"),
            )

            # Clean up response text (remove markdown code blocks if present)
            # Clean up response text (remove markdown code blocks if present)
            text = response.text.strip()

            # Find the JSON array
            start_idx = text.find("[")
            end_idx = text.rfind("]")

            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                text = text[start_idx : end_idx + 1]

            script = json.loads(text)
            return script

        except Exception as e:
            logger.error("Failed to generate podcast script", exc_info=e)
            raise

    def generate_audio(
        self, script: list[dict[str, str]], output_dir: Path, options: dict | None = None
    ) -> list[Path]:
        """Generate audio files for script using Gemini Multi-Speaker TTS."""

        logger.info("Generating audio from script with Multi-Speaker TTS")

        # Default voices
        voice1 = "Kore"
        voice2 = "Puck"

        if options:
            voice1 = options.get("voice1", "Kore")
            voice2 = options.get("voice2", "Puck")

        audio_files = []
        import wave

        # Helper to save WAV
        def save_wave(filename, pcm, channels=1, rate=24000, sample_width=2):
            with wave.open(str(filename), "wb") as wf:
                wf.setnchannels(channels)
                wf.setsampwidth(sample_width)
                wf.setframerate(rate)
                wf.writeframes(pcm)

        # Chunking strategy to avoid API limits
        # We'll group dialogue turns until we reach a certain character limit
        chunk_size = 3000  # Characters
        chunks = []
        current_chunk = []
        current_length = 0

        for segment in script:
            text = segment.get("text", "")
            speaker = segment.get("speaker", "Host")
            line = f"{speaker}: {text}"

            if current_length + len(line) > chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_length = 0

            current_chunk.append(segment)
            current_length += len(line)

        if current_chunk:
            chunks.append(current_chunk)

        logger.info(f"Split script into {len(chunks)} chunks for TTS")

        for idx, chunk in enumerate(chunks):
            # Format prompt for this chunk
            dialogue_text = ""
            for segment in chunk:
                speaker = segment.get("speaker", "Host")
                text = segment.get("text", "")
                dialogue_text += f"{speaker}: {text}\n"

            prompt = f"TTS the following conversation between Host and Expert:\n{dialogue_text}"

            filename = output_dir / f"chunk_{idx:03d}.wav"

            try:
                response = self.client.models.generate_content(
                    model="gemini-2.5-flash-preview-tts",  # User requested model
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_modalities=["AUDIO"],
                        speech_config=types.SpeechConfig(
                            multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                                speaker_voice_configs=[
                                    types.SpeakerVoiceConfig(
                                        speaker="Host",
                                        voice_config=types.VoiceConfig(
                                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                voice_name=voice1,
                                            )
                                        ),
                                    ),
                                    types.SpeakerVoiceConfig(
                                        speaker="Expert",
                                        voice_config=types.VoiceConfig(
                                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                voice_name=voice2,
                                            )
                                        ),
                                    ),
                                ]
                            )
                        ),
                    ),
                )

                # Extract audio data
                # User snippet: data = response.candidates[0].content.parts[0].inline_data.data
                if not response.candidates or not response.candidates[0].content.parts:
                    logger.warning(f"No audio content generated for chunk {idx}")
                    continue

                audio_data = response.candidates[0].content.parts[0].inline_data.data

                # Save to WAV
                save_wave(filename, audio_data)
                audio_files.append(filename)

                # Rate limit
                time.sleep(1.0)

            except Exception as e:
                logger.error(f"Failed to generate audio for chunk {idx}", exc_info=e)
                raise

        return audio_files

    def assemble_audio(self, audio_files: list[Path], output_path: Path) -> None:
        """Concatenate audio segments into final podcast."""
        logger.info("Assembling final podcast audio")

        if not audio_files:
            raise ValueError("No audio files to assemble")

        # Create a text file for ffmpeg concat demuxer
        list_file = output_path.parent / "concat_list.txt"
        with open(list_file, "w") as f:
            for audio_file in audio_files:
                # ffmpeg requires safe filenames or absolute paths
                f.write(f"file '{audio_file.absolute()}'\n")

        try:
            # ffmpeg -f concat -safe 0 -i list.txt -c:a libmp3lame -b:a 128k output.mp3
            cmd = [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c:a",
                "libmp3lame",
                "-b:a",
                "128k",
                str(output_path),
            ]

            import subprocess

            subprocess.run(cmd, check=True, capture_output=True, cwd=output_path.parent)

        except Exception as e:
            logger.error("Failed to assemble audio", exc_info=e)
            raise
        finally:
            # Cleanup list file
            if list_file.exists():
                list_file.unlink()
