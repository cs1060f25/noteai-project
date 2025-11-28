"""unit tests for content analyzer agent."""

from unittest.mock import MagicMock, Mock, patch

import pytest

from agents.content_analyzer import (
    analyze_content,
    build_analysis_prompt,
    format_transcript_for_gemini,
    parse_gemini_response,
    store_content_segments,
    validate_and_enrich_segments,
)


class TestContentAnalyzer:
    """test suite for content analyzer agent."""

    def test_format_transcript_for_gemini(self):
        """test transcript formatting with timestamps."""
        # create mock transcripts
        mock_transcripts = [
            MagicMock(start_time=0.0, end_time=5.2, text="Hello and welcome"),
            MagicMock(start_time=5.2, end_time=12.5, text="Today we'll cover neural networks"),
        ]

        result = format_transcript_for_gemini(mock_transcripts)

        assert "[0.0s - 5.2s]" in result
        assert "Hello and welcome" in result
        assert "[5.2s - 12.5s]" in result
        assert "neural networks" in result

    def test_format_transcript_empty_list(self):
        """test formatting with empty transcript list."""
        result = format_transcript_for_gemini([])
        assert result == ""

    def test_build_analysis_prompt(self):
        """test prompt building with transcript text."""
        transcript_text = "[0.0s - 5.0s]: Test lecture content"

        prompt = build_analysis_prompt(transcript_text)

        assert "educational lecture transcript" in prompt.lower()
        assert transcript_text in prompt
        assert "importance_score" in prompt
        assert "JSON" in prompt

    def test_parse_gemini_response_clean_json(self):
        """test parsing clean JSON response."""
        response_text = '{"segments": [{"topic": "Test", "importance_score": 0.8}]}'

        result = parse_gemini_response(response_text)

        assert "segments" in result
        assert len(result["segments"]) == 1
        assert result["segments"][0]["topic"] == "Test"

    def test_parse_gemini_response_with_markdown(self):
        """test parsing JSON wrapped in markdown code blocks."""
        response_text = '```json\n{"segments": [{"topic": "Test"}]}\n```'

        result = parse_gemini_response(response_text)

        assert "segments" in result
        assert len(result["segments"]) == 1

    def test_parse_gemini_response_invalid_json(self):
        """test handling of invalid JSON."""
        response_text = "this is not valid JSON"

        with pytest.raises(ValueError) as exc_info:
            parse_gemini_response(response_text)

        assert "Invalid JSON" in str(exc_info.value)

    def test_validate_and_enrich_segments(self):
        """test segment validation and enrichment."""
        raw_segments = [
            {
                "start_time": 0.0,
                "end_time": 120.0,
                "topic": "Introduction",
                "description": "Overview",
                "importance_score": 0.8,
                "keywords": ["intro", "overview"],
                "concepts": ["basics"],
            },
            {
                "start_time": 120.0,
                "end_time": 240.0,
                "topic": "Low Quality",
                "importance_score": 0.2,  # Below 0.3 threshold
            },
        ]

        result = validate_and_enrich_segments(raw_segments, "test-job-123")

        # should filter out low importance segment
        assert len(result) == 1

        # check enrichment
        segment = result[0]
        assert "segment_id" in segment
        assert "job_id" in segment
        assert segment["job_id"] == "test-job-123"
        assert "duration" in segment
        assert segment["duration"] == 120.0
        assert "segment_order" in segment
        assert segment["segment_order"] == 1

    def test_validate_and_enrich_segments_missing_fields(self):
        """test enrichment adds missing fields."""
        raw_segments = [
            {
                "start_time": 0.0,
                "end_time": 100.0,
                "topic": "Test Topic",
                "importance_score": 0.7,
                # missing description, keywords, concepts
            }
        ]

        result = validate_and_enrich_segments(raw_segments, "test-job-123")

        assert len(result) == 1
        segment = result[0]
        assert "description" in segment
        assert isinstance(segment["keywords"], list)
        assert isinstance(segment["concepts"], list)

    @patch("agents.content_analyzer.DatabaseService")
    @patch("agents.content_analyzer.get_db_session")
    def test_store_content_segments(self, mock_db_session, mock_db_service_class):
        """test storing segments in database."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service
        mock_service = MagicMock()
        mock_db_service_class.return_value = mock_service

        # test data
        segments = [
            {
                "segment_id": "seg-1",
                "job_id": "job-123",
                "start_time": 0.0,
                "end_time": 120.0,
                "duration": 120.0,
                "topic": "Test Topic",
                "importance_score": 0.8,
                "segment_order": 1,
            }
        ]

        # call function
        store_content_segments(segments, "job-123")

        # verify bulk_create was called
        mock_service.content_segments.bulk_create.assert_called_once_with(segments)

        # verify commit was called
        mock_session.commit.assert_called_once()

        # verify close was called
        mock_session.close.assert_called_once()

    def test_store_content_segments_empty_list(self):
        """test storing empty segments list."""
        # function returns early with empty list, doesn't use database
        # this is expected behavior - just verify it doesn't raise
        store_content_segments([], "job-123")

    @patch("agents.content_analyzer.genai")
    @patch("agents.content_analyzer.DatabaseService")
    @patch("agents.content_analyzer.get_db_session")
    @patch("agents.content_analyzer.settings")
    def test_analyze_content_success(
        self, mock_settings, mock_db_session, mock_db_service_class, mock_genai
    ):
        """test successful content analysis."""
        # mock settings
        mock_settings.gemini_api_key = "test-api-key"
        mock_settings.gemini_model = "gemini-2.5-flash-lite"

        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service
        mock_service = MagicMock()
        mock_db_service_class.return_value = mock_service

        # mock transcripts
        mock_transcript = MagicMock()
        mock_transcript.start_time = 0.0
        mock_transcript.end_time = 120.0
        mock_transcript.text = "Test lecture content"

        mock_service.transcripts.get_by_job_id.return_value = [mock_transcript]
        mock_service.layout_analysis.get_by_job_id.return_value = None

        # mock Gemini API response
        mock_model = MagicMock()
        mock_response = Mock()
        mock_response.text = """```json
        {
            "segments": [
                {
                    "start_time": 0.0,
                    "end_time": 120.0,
                    "topic": "Test Topic",
                    "description": "Test description",
                    "importance_score": 0.8,
                    "keywords": ["test", "topic"],
                    "concepts": ["testing"]
                }
            ]
        }
        ```"""
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # call analyze_content
        result = analyze_content({}, "test-job-123", api_key="test-api-key")

        # verify result
        assert result["status"] == "completed"
        assert result["job_id"] == "test-job-123"
        assert result["segments_created"] == 1
        assert "processing_time_seconds" in result
        assert result["model_used"] == "gemini-2.5-flash-lite"

        # verify Gemini was configured
        mock_genai.configure.assert_called_once_with(api_key="test-api-key")

        # verify model was created
        mock_genai.GenerativeModel.assert_called_once_with("gemini-2.5-flash-lite")

    @patch("agents.content_analyzer.genai")
    @patch("agents.content_analyzer.DatabaseService")
    @patch("agents.content_analyzer.get_db_session")
    @patch("agents.content_analyzer.settings")
    def test_analyze_content_with_passed_api_key(
        self, mock_settings, mock_db_session, mock_db_service_class, mock_genai
    ):
        """test that passed API key is used over settings."""
        # mock settings with a different key
        mock_settings.gemini_api_key = "settings-api-key"
        mock_settings.gemini_model = "gemini-2.5-flash-lite"

        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session
        mock_service = MagicMock()
        mock_db_service_class.return_value = mock_service

        # mock transcripts
        mock_transcript = MagicMock()
        mock_transcript.start_time = 0.0
        mock_transcript.end_time = 120.0
        mock_transcript.text = "Test content"
        mock_service.transcripts.get_by_job_id.return_value = [mock_transcript]
        mock_service.layout_analysis.get_by_job_id.return_value = None

        # mock Gemini response
        mock_model = MagicMock()
        mock_response = Mock()
        mock_response.text = '{"segments": [{"topic": "Test", "importance_score": 0.8}]}'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # call analyze_content with specific key
        analyze_content({}, "test-job-123", api_key="user-provided-key")

        # verify Gemini was configured with user key
        mock_genai.configure.assert_called_once_with(api_key="user-provided-key")

    @patch("agents.content_analyzer.get_db_session")
    @patch("agents.content_analyzer.settings")
    def test_analyze_content_missing_api_key(self, mock_settings, mock_db_session):
        """test error when API key is missing."""
        mock_settings.gemini_api_key = None

        # Mock db session to avoid create_engine errors
        mock_db_session.return_value = MagicMock()

        with pytest.raises(ValueError) as exc_info:
            analyze_content({}, "test-job-123", api_key=None)

        assert "Gemini API key is missing" in str(exc_info.value)

    @patch("agents.content_analyzer.DatabaseService")
    @patch("agents.content_analyzer.get_db_session")
    @patch("agents.content_analyzer.settings")
    def test_analyze_content_no_transcripts(
        self, mock_settings, mock_db_session, mock_db_service_class
    ):
        """test error when no transcripts found."""
        mock_settings.gemini_api_key = "test-api-key"

        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service with no transcripts
        mock_service = MagicMock()
        mock_db_service_class.return_value = mock_service
        mock_service.transcripts.get_by_job_id.return_value = []
        mock_service.layout_analysis.get_by_job_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            analyze_content({}, "test-job-123")

        assert "No transcripts found" in str(exc_info.value)
        assert "Transcript agent must complete" in str(exc_info.value)

    @patch("agents.content_analyzer.genai")
    @patch("agents.content_analyzer.DatabaseService")
    @patch("agents.content_analyzer.get_db_session")
    @patch("agents.content_analyzer.settings")
    def test_analyze_content_filters_low_importance(
        self, mock_settings, mock_db_session, mock_db_service_class, mock_genai
    ):
        """test that segments with importance < 0.3 are filtered."""
        mock_settings.gemini_api_key = "test-api-key"
        mock_settings.gemini_model = "gemini-2.5-flash-lite"

        # mock database
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session
        mock_service = MagicMock()
        mock_db_service_class.return_value = mock_service

        # mock transcript
        mock_transcript = MagicMock()
        mock_transcript.start_time = 0.0
        mock_transcript.end_time = 120.0
        mock_transcript.text = "Test content"
        mock_service.transcripts.get_by_job_id.return_value = [mock_transcript]
        mock_service.layout_analysis.get_by_job_id.return_value = None

        # mock Gemini response with mixed importance scores
        mock_model = MagicMock()
        mock_response = Mock()
        mock_response.text = """
        {
            "segments": [
                {"start_time": 0.0, "end_time": 60.0, "topic": "High", "importance_score": 0.8},
                {"start_time": 60.0, "end_time": 120.0, "topic": "Low", "importance_score": 0.2}
            ]
        }
        """
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        result = analyze_content({}, "test-job-123")

        # should filter out the low importance segment
        assert result["segments_created"] == 1
        assert result["segments_filtered"] == 1
        assert result["total_segments_analyzed"] == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
