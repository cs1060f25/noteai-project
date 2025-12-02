
import os
import sys
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.getcwd())

# Mock dependencies before importing content_analyzer
sys.modules["cv2"] = MagicMock()
sys.modules["google"] = MagicMock()
sys.modules["google.generativeai"] = MagicMock()
sys.modules["sqlalchemy"] = MagicMock()
sys.modules["sqlalchemy.orm"] = MagicMock()
sys.modules["app.core.logging"] = MagicMock()
sys.modules["app.core.settings"] = MagicMock()
sys.modules["app.services.db_service"] = MagicMock()

import cv2  # noqa: E402

from agents.content_analyzer import analyze_content  # noqa: E402


def test_analyze_content_with_video():
    # Mock dependencies
    with patch("agents.content_analyzer.get_db_session") as _mock_get_db, \
         patch("agents.content_analyzer.DatabaseService") as mock_db_service, \
         patch("agents.content_analyzer.genai") as mock_genai, \
         patch("agents.content_analyzer.settings") as mock_settings:

        # Setup mocks
        mock_settings.gemini_api_key = "fake_key"
        mock_settings.gemini_model = "gemini-pro-vision"

        # Mock DB service
        mock_service_instance = mock_db_service.return_value

        # Mock transcripts
        mock_transcript = MagicMock()
        mock_transcript.start_time = 0.0
        mock_transcript.end_time = 10.0
        mock_transcript.text = "This is a test transcript."
        mock_service_instance.transcripts.get_by_job_id.return_value = [mock_transcript]

        # Mock other DB calls
        mock_service_instance.layout_analysis.get_by_job_id.return_value = None
        mock_service_instance.slide_content.get_by_job_id.return_value = None

        # Mock Gemini model
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        mock_response = MagicMock()
        mock_response.text = '{"segments": []}'
        mock_model.generate_content.return_value = mock_response

        # Mock cv2 behavior
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.get.side_effect = lambda prop: 30.0 if prop == cv2.CAP_PROP_FPS else 300.0 # 10 seconds
        mock_cap.read.return_value = (True, MagicMock()) # Return success and a dummy frame
        cv2.VideoCapture.return_value = mock_cap

        # Mock cv2.cvtColor
        cv2.cvtColor.return_value = MagicMock() # Dummy RGB frame

        # Mock PIL Image
        with patch("agents.content_analyzer.Image") as mock_image:
            mock_image.fromarray.return_value = "mock_pil_image"

            # Path to test video
            video_path = "test_video.mp4"

            print(f"Testing analyze_content with video: {video_path}")

            # Call analyze_content
            try:
                analyze_content(
                    _transcript_data={},
                    job_id="test_job",
                    api_key="fake_key",
                    video_path=video_path
                )

                # Verify generate_content was called
                assert mock_model.generate_content.called

                # Check arguments
                args, _ = mock_model.generate_content.call_args
                content_parts = args[0]

                # Check if images are present in content parts
                image_count = sum(1 for part in content_parts if part == "mock_pil_image")
                print(f"Gemini called with {len(content_parts)} parts, including {image_count} images")

                if image_count > 0:
                    print("SUCCESS: Images were passed to Gemini!")
                else:
                    print("FAILURE: No images passed to Gemini.")

            except Exception as e:
                print(f"Test failed with exception: {e}")
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    test_analyze_content_with_video()
