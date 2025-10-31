"""unit tests for segment extractor agent."""

from unittest.mock import MagicMock, patch

import pytest

from agents.segment_extractor import (
    create_clips,
    extract_segments,
    find_nearest_silence,
    optimize_segment_boundaries,
    select_segments,
)


class TestSegmentExtractor:
    """test suite for segment extractor agent."""

    def test_find_nearest_silence_closest(self):
        """test finding closest silence region."""
        # create mock silence regions
        mock_region1 = MagicMock()
        mock_region1.region_id = "region-1"
        mock_region1.start_time = 10.0
        mock_region1.end_time = 11.0
        mock_region1.duration = 1.0

        mock_region2 = MagicMock()
        mock_region2.region_id = "region-2"
        mock_region2.start_time = 20.0
        mock_region2.end_time = 21.5
        mock_region2.duration = 1.5

        silence_regions = [mock_region1, mock_region2]

        # test finding silence near 12.0 (closest to region1.end_time = 11.0)
        optimal_time, silence_info = find_nearest_silence(
            12.0, silence_regions, window=5.0, prefer="closest"
        )

        assert optimal_time == 11.0
        assert silence_info is not None
        assert silence_info["region_id"] == "region-1"
        assert silence_info["position"] == "end"
        assert silence_info["distance"] == 1.0

    def test_find_nearest_silence_prefer_before(self):
        """test finding silence before target time."""
        mock_region = MagicMock()
        mock_region.region_id = "region-1"
        mock_region.start_time = 10.0
        mock_region.end_time = 11.0
        mock_region.duration = 1.0

        silence_regions = [mock_region]

        # target 15.0, prefer before (should find end at 11.0)
        optimal_time, silence_info = find_nearest_silence(
            15.0, silence_regions, window=5.0, prefer="before"
        )

        assert optimal_time == 11.0
        assert silence_info["time"] <= 15.0

    def test_find_nearest_silence_prefer_after(self):
        """test finding silence after target time."""
        mock_region = MagicMock()
        mock_region.region_id = "region-1"
        mock_region.start_time = 20.0
        mock_region.end_time = 21.0
        mock_region.duration = 1.0

        silence_regions = [mock_region]

        # target 15.0, prefer after (should find start at 20.0)
        optimal_time, silence_info = find_nearest_silence(
            15.0, silence_regions, window=10.0, prefer="after"
        )

        assert optimal_time == 20.0
        assert silence_info["time"] >= 15.0

    def test_find_nearest_silence_no_silence_within_window(self):
        """test when no silence found within window."""
        mock_region = MagicMock()
        mock_region.start_time = 100.0
        mock_region.end_time = 101.0

        silence_regions = [mock_region]

        # target 10.0, window 5.0 (silence at 100.0 is too far)
        optimal_time, silence_info = find_nearest_silence(10.0, silence_regions, window=5.0)

        assert optimal_time is None
        assert silence_info is None

    def test_find_nearest_silence_empty_list(self):
        """test with empty silence regions list."""
        optimal_time, silence_info = find_nearest_silence(100.0, [], window=5.0)

        assert optimal_time is None
        assert silence_info is None

    def test_optimize_segment_boundaries_with_silence(self):
        """test boundary optimization with available silence."""
        # create mock segment
        mock_segment = MagicMock()
        mock_segment.segment_id = "seg-1"
        mock_segment.start_time = 100.0
        mock_segment.end_time = 250.0

        # create mock silence regions
        mock_silence1 = MagicMock()
        mock_silence1.region_id = "silence-1"
        mock_silence1.start_time = 98.0
        mock_silence1.end_time = 99.0
        mock_silence1.duration = 1.0

        mock_silence2 = MagicMock()
        mock_silence2.region_id = "silence-2"
        mock_silence2.start_time = 252.0
        mock_silence2.end_time = 253.5
        mock_silence2.duration = 1.5

        silence_regions = [mock_silence1, mock_silence2]

        # optimize boundaries
        optimal_start, optimal_end, metadata = optimize_segment_boundaries(
            mock_segment, silence_regions
        )

        # should adjust start to 99.0 (end of silence1)
        # and end to 252.0 (start of silence2)
        assert optimal_start == 99.0
        assert optimal_end == 252.0

        # check metadata
        assert metadata["optimization"]["start_adjusted"] is True
        assert metadata["optimization"]["end_adjusted"] is True
        assert metadata["original_boundaries"]["start_time"] == 100.0
        assert metadata["original_boundaries"]["end_time"] == 250.0

    def test_optimize_segment_boundaries_no_silence(self):
        """test boundary optimization with no nearby silence."""
        mock_segment = MagicMock()
        mock_segment.segment_id = "seg-1"
        mock_segment.start_time = 100.0
        mock_segment.end_time = 250.0

        # no silence regions
        silence_regions = []

        optimal_start, optimal_end, metadata = optimize_segment_boundaries(
            mock_segment, silence_regions
        )

        # should keep original boundaries
        assert optimal_start == 100.0
        assert optimal_end == 250.0
        assert metadata["optimization"]["start_adjusted"] is False
        assert metadata["optimization"]["end_adjusted"] is False

    def test_optimize_segment_boundaries_very_short_segment(self):
        """test boundary optimization with very short segment."""
        # very short segment where optimization might not find suitable boundaries
        mock_segment = MagicMock()
        mock_segment.segment_id = "seg-1"
        mock_segment.start_time = 100.0
        mock_segment.end_time = 103.0  # only 3 seconds

        # silence nearby but optimization stays reasonable
        mock_silence = MagicMock()
        mock_silence.region_id = "silence-1"
        mock_silence.start_time = 102.0
        mock_silence.end_time = 103.0
        mock_silence.duration = 1.0

        silence_regions = [mock_silence]

        optimal_start, optimal_end, metadata = optimize_segment_boundaries(
            mock_segment, silence_regions
        )

        # should produce valid boundaries (end > start)
        assert optimal_end > optimal_start
        # verify metadata exists
        assert "optimization" in metadata
        assert "original_boundaries" in metadata

    @patch("agents.segment_extractor.DatabaseService")
    def test_select_segments_top_5(self, mock_db_service_class):
        """test selecting top 5 segments by importance score."""
        # create mock database service
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service

        # create 10 mock content segments with varying scores and durations
        mock_segments = []
        for i in range(10):
            segment = MagicMock()
            segment.segment_id = f"seg-{i}"
            segment.start_time = i * 100.0
            segment.end_time = i * 100.0 + 150.0
            segment.duration = 150.0  # all valid duration (2.5 minutes)
            segment.importance_score = 0.9 - (i * 0.05)  # decreasing scores
            segment.topic = f"Topic {i}"
            mock_segments.append(segment)

        mock_db_service.content_segments.get_by_job_id.return_value = mock_segments

        # select segments
        selected = select_segments("test-job-123", mock_db_service)

        # should return top 5
        assert len(selected) == 5

        # should be ordered by importance score descending
        assert selected[0].importance_score == 0.9
        assert selected[1].importance_score == 0.85
        assert selected[4].importance_score == 0.7

    @patch("agents.segment_extractor.DatabaseService")
    def test_select_segments_duration_filtering(self, mock_db_service_class):
        """test that segments outside duration range are filtered out."""
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service

        # create segments with various durations
        mock_segments = []

        # too short (1 minute)
        seg1 = MagicMock()
        seg1.duration = 60.0
        seg1.importance_score = 0.95
        mock_segments.append(seg1)

        # valid (3 minutes)
        seg2 = MagicMock()
        seg2.duration = 180.0
        seg2.importance_score = 0.90
        seg2.start_time = 0.0
        seg2.end_time = 180.0
        seg2.topic = "Valid Topic"
        mock_segments.append(seg2)

        # too long (10 minutes)
        seg3 = MagicMock()
        seg3.duration = 600.0
        seg3.importance_score = 0.85
        mock_segments.append(seg3)

        # valid (4 minutes)
        seg4 = MagicMock()
        seg4.duration = 240.0
        seg4.importance_score = 0.80
        seg4.start_time = 200.0
        seg4.end_time = 440.0
        seg4.topic = "Another Valid Topic"
        mock_segments.append(seg4)

        mock_db_service.content_segments.get_by_job_id.return_value = mock_segments

        # select segments
        selected = select_segments("test-job-123", mock_db_service)

        # should only return the 2 valid segments
        assert len(selected) == 2
        assert all(105 <= s.duration <= 330 for s in selected)

    @patch("agents.segment_extractor.DatabaseService")
    def test_select_segments_no_segments(self, mock_db_service_class):
        """test when no content segments exist."""
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service

        mock_db_service.content_segments.get_by_job_id.return_value = []

        selected = select_segments("test-job-123", mock_db_service)

        assert selected == []

    @patch("agents.segment_extractor.DatabaseService")
    def test_create_clips(self, mock_db_service_class):
        """test clip creation with optimization."""
        mock_db_service = MagicMock()

        # create mock segments
        mock_segment1 = MagicMock()
        mock_segment1.segment_id = "seg-1"
        mock_segment1.start_time = 100.0
        mock_segment1.end_time = 250.0
        mock_segment1.topic = "Python Basics"
        mock_segment1.importance_score = 0.95

        mock_segment2 = MagicMock()
        mock_segment2.segment_id = "seg-2"
        mock_segment2.start_time = 300.0
        mock_segment2.end_time = 450.0
        mock_segment2.topic = "Advanced Concepts"
        mock_segment2.importance_score = 0.90

        selected_segments = [mock_segment1, mock_segment2]

        # create mock silence
        mock_silence = MagicMock()
        mock_silence.region_id = "silence-1"
        mock_silence.start_time = 99.0
        mock_silence.end_time = 100.0
        mock_silence.duration = 1.0

        silence_regions = [mock_silence]

        # mock clip creation
        mock_clip1 = MagicMock()
        mock_clip1.clip_id = "clip-1"
        mock_clip1.title = "Python Basics"
        mock_clip1.topic = "Python Basics"
        mock_clip1.start_time = 100.0
        mock_clip1.end_time = 250.0
        mock_clip1.duration = 150.0
        mock_clip1.importance_score = 0.95
        mock_clip1.clip_order = 1
        mock_clip1.extra_metadata = {}

        mock_db_service.clips.create.return_value = mock_clip1

        # create clips
        clips = create_clips(selected_segments, silence_regions, "test-job-123", mock_db_service)

        # verify clips were created
        assert len(clips) == 2
        assert mock_db_service.clips.create.call_count == 2

        # verify first call arguments
        first_call = mock_db_service.clips.create.call_args_list[0]
        assert first_call[1]["job_id"] == "test-job-123"
        assert first_call[1]["content_segment_id"] == "seg-1"
        assert first_call[1]["title"] == "Python Basics"
        assert first_call[1]["clip_order"] == 1

    @patch("agents.segment_extractor.DatabaseService")
    @patch("agents.segment_extractor.get_db_session")
    def test_extract_segments_success(self, mock_db_session, mock_db_service_class):
        """test successful segment extraction."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service

        # create mock content segments
        mock_segment = MagicMock()
        mock_segment.segment_id = "seg-1"
        mock_segment.start_time = 100.0
        mock_segment.end_time = 250.0
        mock_segment.duration = 150.0
        mock_segment.topic = "Test Topic"
        mock_segment.importance_score = 0.95

        mock_db_service.content_segments.get_by_job_id.return_value = [mock_segment]

        # create mock silence regions
        mock_silence = MagicMock()
        mock_silence.region_id = "silence-1"
        mock_silence.start_time = 99.0
        mock_silence.end_time = 100.0
        mock_silence.duration = 1.0

        mock_db_service.silence_regions.get_by_job_id.return_value = [mock_silence]

        # create mock clip
        mock_clip = MagicMock()
        mock_clip.clip_id = "clip-1"
        mock_clip.title = "Test Topic"
        mock_clip.topic = "Test Topic"
        mock_clip.start_time = 100.0
        mock_clip.end_time = 250.0
        mock_clip.duration = 150.0
        mock_clip.importance_score = 0.95
        mock_clip.clip_order = 1
        mock_clip.extra_metadata = {
            "optimization": {"start_adjusted": False, "end_adjusted": False}
        }

        mock_db_service.clips.create.return_value = mock_clip

        # call extract_segments
        result = extract_segments({}, {}, {}, "test-job-123")

        # verify result
        assert result["status"] == "completed"
        assert result["job_id"] == "test-job-123"
        assert result["segments_created"] == 1
        assert result["segments_analyzed"] == 1
        assert len(result["selected_segments"]) == 1

        # verify database operations
        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()

    @patch("agents.segment_extractor.DatabaseService")
    @patch("agents.segment_extractor.get_db_session")
    def test_extract_segments_no_valid_segments(self, mock_db_session, mock_db_service_class):
        """test extraction when no valid segments exist."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service

        # no segments found
        mock_db_service.content_segments.get_by_job_id.return_value = []

        # call extract_segments
        result = extract_segments({}, {}, {}, "test-job-123")

        # verify result
        assert result["status"] == "completed"
        assert result["segments_created"] == 0
        assert result["segments_analyzed"] == 0
        assert "no segments met duration" in result["message"].lower()

        # verify session was still closed
        mock_session.close.assert_called_once()

    @patch("agents.segment_extractor.DatabaseService")
    @patch("agents.segment_extractor.get_db_session")
    def test_extract_segments_database_error(self, mock_db_session, mock_db_service_class):
        """test handling of database errors."""
        # mock database session
        mock_session = MagicMock()
        mock_db_session.return_value = mock_session

        # mock database service that raises error
        mock_db_service = MagicMock()
        mock_db_service_class.return_value = mock_db_service
        mock_db_service.content_segments.get_by_job_id.side_effect = Exception(
            "Database connection failed"
        )

        # call extract_segments and expect exception
        with pytest.raises(Exception) as exc_info:
            extract_segments({}, {}, {}, "test-job-123")

        assert "Database connection failed" in str(exc_info.value)

        # verify rollback was called
        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
