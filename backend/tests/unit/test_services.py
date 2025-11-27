from unittest.mock import patch

import pytest

from app.services.validation_service import FileValidator, ValidationError


class TestFileValidator:
    @pytest.fixture
    def validator(self):
        with patch("app.services.validation_service.settings") as mock_settings:
            mock_settings.max_upload_size_mb = 100
            mock_settings.get_upload_extensions.return_value = {".mp4", ".mov", ".avi"}
            return FileValidator()

    def test_validate_filename_valid(self, validator):
        validator.validate_filename("test.mp4")
        validator.validate_filename("my_video.mov")

    def test_validate_filename_invalid_chars(self, validator):
        with pytest.raises(ValidationError) as exc:
            validator.validate_filename("test/video.mp4")
        assert "invalid characters" in str(exc.value)

    def test_validate_filename_invalid_extension(self, validator):
        with pytest.raises(ValidationError) as exc:
            validator.validate_filename("test.txt")
        assert "File type .txt not allowed" in str(exc.value)

    def test_validate_file_size_valid(self, validator):
        validator.validate_file_size(1024)
        validator.validate_file_size(100 * 1024 * 1024)

    def test_validate_file_size_invalid(self, validator):
        with pytest.raises(ValidationError) as exc:
            validator.validate_file_size(0)
        assert "greater than 0" in str(exc.value)

        with pytest.raises(ValidationError) as exc:
            validator.validate_file_size(101 * 1024 * 1024)
        assert "exceeds maximum allowed size" in str(exc.value)

    def test_validate_content_type_valid(self, validator):
        validator.validate_content_type("video/mp4")
        validator.validate_content_type("video/quicktime")

    def test_validate_content_type_invalid(self, validator):
        with pytest.raises(ValidationError) as exc:
            validator.validate_content_type("text/plain")
        assert "not allowed" in str(exc.value)

    def test_validate_upload_request(self, validator):
        validator.validate_upload_request(
            filename="test.mp4", file_size=1024, content_type="video/mp4"
        )
