import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from unittest.mock import MagicMock, patch

import pytest


class TestProgressUpdates:
    @patch("pipeline.tasks.get_user_api_key")
    @patch("pipeline.tasks.get_processing_config")
    @patch("pipeline.tasks.get_job_s3_key")
    @patch("pipeline.tasks.download_audio_from_s3_to_temp")
    @patch("pipeline.tasks.download_video_from_s3_to_temp")
    @patch("pipeline.tasks.detect_silence")
    @patch("pipeline.tasks.generate_transcript")
    @patch("pipeline.tasks.analyze_content")
    @patch("pipeline.tasks.extract_segments")
    @patch("pipeline.tasks.VideoCompiler")
    @patch("pipeline.tasks.get_task_db")
    @patch("pipeline.tasks.send_progress_sync")
    def test_audio_only_pipeline_progress_updates(
        self,
        mock_send_progress,
        mock_get_db,
        mock_compiler_class,
        mock_extract_segments,
        mock_analyze_content,
        mock_generate_transcript,
        mock_detect_silence,
        mock_download_video,
        mock_download_audio,
        mock_get_s3_key,
        mock_get_config,
        mock_get_api_key,
    ):
        # Setup mocks
        mock_get_api_key.return_value = "test_api_key"
        mock_get_config.return_value = {"processing_mode": "audio"}
        mock_get_s3_key.return_value = "test_key"
        mock_download_audio.return_value = "/tmp/audio.wav"
        mock_download_video.return_value = "/tmp/video.mp4"

        # Mock agent results
        mock_detect_silence.return_value = {"silence_count": 0}
        mock_generate_transcript.return_value = {"total_segments": 10}
        mock_analyze_content.return_value = {"segments_created": 5}
        mock_extract_segments.return_value = {"clips_created": 5}

        mock_compiler = MagicMock()
        mock_compiler.compile_clips.return_value = {"clips_compiled": 5}
        mock_compiler_class.return_value = mock_compiler

        # Mock DB
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        # Import the task

        # Create a mock task instance
        task_instance = MagicMock()
        task_instance.update_job_progress = MagicMock(
            side_effect=lambda *args, **kwargs: mock_send_progress(*args, **kwargs)
        )

        # We need to patch the module-level function process_audio_only_pipeline to use our mocks
        # But process_video_optimized calls process_audio_only_pipeline from the same module.
        # So we can just call process_audio_only_pipeline directly if we import it.

        from pipeline.tasks import process_audio_only_pipeline

        # We need to patch update_job_progress on the task instance passed to the function.
        # The function takes 'self' as first argument.

        # Call the pipeline
        process_audio_only_pipeline(task_instance, "test_job_id", {"processing_mode": "audio"})

        # Verify calls to send_progress_sync (via update_job_progress)

        # Check for SilenceDetector
        silence_calls = [
            call
            for call in task_instance.update_job_progress.call_args_list
            if call.kwargs.get("agent_name") == "SilenceDetector"
        ]
        assert len(silence_calls) > 0, "SilenceDetector agent name not found in progress updates"

        # Check for TranscriptAgent
        transcript_calls = [
            call
            for call in task_instance.update_job_progress.call_args_list
            if call.kwargs.get("agent_name") == "TranscriptAgent"
        ]
        assert len(transcript_calls) > 0, "TranscriptAgent agent name not found in progress updates"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
