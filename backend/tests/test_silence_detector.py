"""Unit tests for silence detector agent."""

import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from pydub import AudioSegment
from pydub.generators import Sine

from agents.silence_detector import (
    analyze_audio_silence,
    download_video_from_s3,
    store_silence_regions,
)


class TestSilenceDetector:
    """test suite for silence detector agent."""

    def test_analyze_audio_silence_with_real_audio(self):
        """test silence detection with generated audio containing silence."""
        # create a test audio file with silence
        # 1 second of sound, 1 second of silence, 1 second of sound
        sound = Sine(440).to_audio_segment(duration=1000)  # 1 second at 440Hz
        silence = AudioSegment.silent(duration=1000)  # 1 second of silence

        test_audio = sound + silence + sound

        # save to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_path = temp_file.name
            test_audio.export(temp_path, format="wav")

        try:
            # analyze the audio
            result = analyze_audio_silence(temp_path, "test-job-123")

            # verify results
            assert isinstance(result, list)
            # should detect at least one silence region in the middle
            assert len(result) >= 1

            # check structure of silence region
            if result:
                region = result[0]
                assert "start_time" in region
                assert "end_time" in region
                assert "duration" in region
                assert "silence_type" in region
                assert region["silence_type"] == "audio_silence"
                assert region["duration"] > 0

        finally:
            # cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    @patch("agents.silence_detector.s3_service.generate_presigned_url")
    @patch("agents.silence_detector.requests.get")
    def test_download_video_from_s3(self, mock_get, mock_presigned_url):
        """test s3 download functionality."""
        # mock s3 presigned url
        mock_presigned_url.return_value = "https://example.com/video.mp4"

        # mock http response
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b"fake video data"]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        # test download
        temp_path = download_video_from_s3("test/video.mp4", "test-job-123")

        try:
            # verify file was created
            assert os.path.exists(temp_path)
            assert temp_path.endswith(".mp4")

            # verify mocks were called correctly
            mock_presigned_url.assert_called_once_with("test/video.mp4")
            mock_get.assert_called_once()

        finally:
            # cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    @patch("agents.silence_detector.DatabaseService")
    @patch("agents.silence_detector.get_db_session")
    def test_store_silence_regions(self, mock_db_session, mock_db_service):
        """test storing silence regions in database."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service
        mock_service_instance = MagicMock()
        mock_db_service.return_value = mock_service_instance

        # test data
        silence_regions = [
            {
                "start_time": 1.0,
                "end_time": 2.0,
                "duration": 1.0,
                "silence_type": "audio_silence",
                "amplitude_threshold": -40,
            },
            {
                "start_time": 5.0,
                "end_time": 6.5,
                "duration": 1.5,
                "silence_type": "audio_silence",
                "amplitude_threshold": -40,
            },
        ]

        # call function
        store_silence_regions(silence_regions, "test-job-123")

        # verify bulk_create was called
        mock_service_instance.silence_regions.bulk_create.assert_called_once()

        # verify commit was called
        mock_session.commit.assert_called_once()

        # verify close was called
        mock_session.close.assert_called_once()

    @patch("agents.silence_detector.DatabaseService")
    @patch("agents.silence_detector.get_db_session")
    def test_store_silence_regions_empty_list(self, mock_db_session, mock_db_service):
        """test storing empty silence regions list."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # call with empty list
        store_silence_regions([], "test-job-123")

        # verify bulk_create was NOT called
        mock_db_service.assert_not_called()

        # verify session was not used
        mock_session.commit.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
