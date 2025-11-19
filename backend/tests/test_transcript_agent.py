"""unit tests for transcript agent."""

from unittest.mock import MagicMock, Mock, patch

import pytest

from agents.transcript_agent import (
    transcribe_with_gemini,
    validate_gemini_config,
)


class TestTranscriptAgent:
    """test suite for transcript agent."""

    @patch("agents.transcript_agent.genai")
    @patch("agents.transcript_agent.settings")
    def test_validate_gemini_config_success(self, mock_settings, mock_genai):
        """test successful configuration with settings key."""
        mock_settings.gemini_api_key = "test-key"

        validate_gemini_config()

        mock_genai.configure.assert_called_once_with(api_key="test-key")

    @patch("agents.transcript_agent.genai")
    @patch("agents.transcript_agent.settings")
    def test_validate_gemini_config_with_passed_key(self, mock_settings, mock_genai):
        """test configuration with passed api key."""
        mock_settings.gemini_api_key = "settings-key"

        validate_gemini_config(api_key="passed-key")

        mock_genai.configure.assert_called_once_with(api_key="passed-key")

    @patch("agents.transcript_agent.settings")
    def test_validate_gemini_config_missing_key(self, mock_settings):
        """test error when no api key is available."""
        mock_settings.gemini_api_key = None

        with pytest.raises(ValueError) as exc_info:
            validate_gemini_config()

        assert "GEMINI_API_KEY not configured" in str(exc_info.value)

    @patch("agents.transcript_agent.genai")
    @patch("agents.transcript_agent.AudioSegment")
    def test_transcribe_with_gemini_uses_api_key(self, mock_audio_segment, mock_genai):
        """test that transcribe_with_gemini uses the passed api key."""
        # mock audio segment
        mock_audio = MagicMock()
        mock_audio.__len__.return_value = 10000  # 10 seconds
        mock_audio_segment.from_file.return_value = mock_audio

        # mock gemini response
        mock_model = MagicMock()
        mock_response = Mock()
        mock_response.text = "Test transcription."
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # mock upload_file
        mock_file = Mock()
        mock_file.name = "test_file"
        mock_genai.upload_file.return_value = mock_file

        # call function
        transcribe_with_gemini("test.mp3", "job-123", api_key="user-key")

        # verify configuration
        mock_genai.configure.assert_called_once_with(api_key="user-key")
