"""file validation service for upload security and integrity."""

import mimetypes
from pathlib import Path

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)

VIDEO_MIME_TYPES = {
    "video/mp4",
    "video/quicktime",  # .mov
    "video/x-msvideo",  # .avi
    "video/x-matroska",  # .mkv
    "video/webm",
    "video/mpeg",
    "video/x-ms-wmv",
}


class ValidationError(Exception):
    """custom validation error with user-friendly messages."""

    def __init__(self, message: str, field: str | None = None):
        """initialize validation error."""
        self.message = message
        self.field = field
        super().__init__(message)


class FileValidator:
    """validator for file uploads."""

    def __init__(self):
        """initialize file validator with settings."""
        self.max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
        self.allowed_extensions = settings.get_upload_extensions()
        self.allowed_mime_types = VIDEO_MIME_TYPES

    def validate_filename(self, filename: str) -> None:
        """validate filename format and extension."""
        if not filename:
            raise ValidationError("Filename cannot be empty", field="filename")

        if len(filename) > 255:
            raise ValidationError("Filename too long (max 255 characters)", field="filename")

        dangerous_chars = ["\\", "/", ":", "*", "?", '"', "<", ">", "|", "\x00"]
        if any(char in filename for char in dangerous_chars):
            raise ValidationError("Filename contains invalid characters", field="filename")

        extension = Path(filename).suffix.lower()
        if not extension:
            raise ValidationError("File must have an extension", field="filename")

        if extension not in self.allowed_extensions:
            raise ValidationError(
                f"File type {extension} not allowed. "
                f"Allowed types: {', '.join(self.allowed_extensions)}",
                field="filename",
            )

        logger.debug("Filename validated", extra={"file_name": filename})

    def validate_file_size(self, file_size: int) -> None:
        """validate file size is within limits."""
        if file_size <= 0:
            raise ValidationError("File size must be greater than 0", field="file_size")

        if file_size > self.max_size_bytes:
            max_mb = self.max_size_bytes / (1024 * 1024)
            actual_mb = file_size / (1024 * 1024)
            raise ValidationError(
                f"File size {actual_mb:.2f}MB exceeds maximum allowed " f"size of {max_mb:.0f}MB",
                field="file_size",
            )

        logger.debug("File size validated", extra={"file_size": file_size})

    def validate_content_type(self, content_type: str) -> None:
        """validate mime content type."""
        if not content_type:
            raise ValidationError("Content type is required", field="content_type")

        base_content_type = content_type.split(";")[0].strip().lower()

        if base_content_type not in self.allowed_mime_types:
            raise ValidationError(
                f"Content type '{base_content_type}' not allowed. " f"Must be a video file.",
                field="content_type",
            )

        logger.debug("Content type validated", extra={"content_type": base_content_type})

    def validate_extension_matches_content_type(self, filename: str, content_type: str) -> None:
        """validate that file extension matches content type."""
        base_content_type = content_type.split(";")[0].strip().lower()

        expected_mime_type = mimetypes.guess_type(filename)[0]

        if expected_mime_type and expected_mime_type.lower() != base_content_type:
            logger.warning(
                "Content type mismatch",
                extra={
                    "file_name": filename,
                    "declared_type": base_content_type,
                    "expected_type": expected_mime_type,
                },
            )
            # note: this is a warning, not an error, as mime type detection can be inconsistent

    def validate_upload_request(self, filename: str, file_size: int, content_type: str) -> None:
        """validate complete upload request."""
        self.validate_filename(filename)
        self.validate_file_size(file_size)
        self.validate_content_type(content_type)
        self.validate_extension_matches_content_type(filename, content_type)

        logger.info(
            "Upload request validated",
            extra={
                "file_name": filename,
                "file_size_bytes": file_size,
                "content_type": content_type,
            },
        )


file_validator = FileValidator()
