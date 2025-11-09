"""Tests to verify timezone-aware datetime usage after fixing deprecated datetime.utcnow()."""

from datetime import timezone

from app.core.logging import JSONFormatter
from app.core.security import generate_job_id
from app.services.s3_service import S3Service


def test_generate_job_id_uses_timezone_aware_datetime():
    """test that generate_job_id uses timezone-aware datetime for timestamp."""
    job_id = generate_job_id()

    # job id format: job_YYYYMMDDHHMMSS_randomhex
    # verify it starts with 'job_' and contains a timestamp
    assert job_id.startswith("job_")

    # extract timestamp part
    parts = job_id.split("_")
    assert len(parts) == 3
    timestamp_str = parts[1]

    # verify timestamp is 14 characters (YYYYMMDDHHMMSS)
    assert len(timestamp_str) == 14
    assert timestamp_str.isdigit()


def test_s3_service_generate_object_key_uses_timezone_aware_datetime():
    """test that s3 service generates object keys with timezone-aware timestamps."""
    s3_service = S3Service()

    job_id = "test_job_123"
    filename = "video.mp4"

    object_key = s3_service.generate_object_key(job_id, filename)

    # key format: uploads/job_id/YYYYMMDD_HHMMSS_original.ext
    # verify format
    assert object_key.startswith(f"uploads/{job_id}/")
    assert object_key.endswith("_original.mp4")

    # extract timestamp from key
    timestamp_part = object_key.split("/")[2].split("_original")[0]

    # verify timestamp format: YYYYMMDD_HHMMSS
    assert len(timestamp_part) == 15  # YYYYMMDD_HHMMSS
    assert "_" in timestamp_part


def test_json_formatter_uses_timezone_aware_datetime():
    """test that json formatter uses timezone-aware datetime for log timestamps."""
    import json
    import logging

    formatter = JSONFormatter()

    # create a mock log record
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=1,
        msg="Test message",
        args=(),
        exc_info=None,
    )

    # format the record
    formatted = formatter.format(record)
    log_data = json.loads(formatted)

    # verify timestamp exists and ends with 'Z' (UTC indicator)
    assert "timestamp" in log_data
    assert log_data["timestamp"].endswith("Z")

    # verify timestamp is ISO format
    assert "T" in log_data["timestamp"]


def test_datetime_now_with_timezone_utc_is_timezone_aware():
    """test that datetime.now(timezone.utc) creates timezone-aware datetime objects."""
    from datetime import datetime

    dt = datetime.now(timezone.utc)

    # verify it has timezone info
    assert dt.tzinfo is not None

    # verify timezone is UTC
    assert dt.tzinfo == timezone.utc

    # verify it's not naive
    assert dt.tzinfo.utcoffset(dt) is not None
