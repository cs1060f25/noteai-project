"""YouTube video download service using yt-dlp."""

import re
import tempfile
from pathlib import Path
from typing import Any, Callable, ClassVar

import yt_dlp
from yt_dlp.utils import DownloadError

from app.core.logging import get_logger
from app.services.s3_service import s3_service

logger = get_logger(__name__)


class YouTubeServiceError(Exception):
    """Base exception for YouTube service errors."""

    pass


class InvalidURLError(YouTubeServiceError):
    """Exception raised for invalid YouTube URLs."""

    pass


class DownloadFailedError(YouTubeServiceError):
    """Exception raised when video download fails."""

    pass


class YouTubeService:
    """Service for downloading videos from YouTube."""

    # YouTube URL patterns
    YOUTUBE_PATTERNS: ClassVar[list[str]] = [
        r"(https?://)?(www\.)?youtube\.com/watch\?v=[\w-]+",
        r"(https?://)?(www\.)?youtu\.be/[\w-]+",
        r"(https?://)?(www\.)?youtube\.com/embed/[\w-]+",
        r"(https?://)?(www\.)?youtube\.com/v/[\w-]+",
        r"(https?://)?(www\.)?youtube\.com/shorts/[\w-]+",
    ]

    def __init__(self):
        """Initialize YouTube service."""
        pass

    def validate_youtube_url(self, url: str) -> bool:
        """Validate if the URL is a valid YouTube URL.

        Args:
            url: URL to validate

        Returns:
            True if valid YouTube URL, False otherwise
        """
        if not url or not isinstance(url, str):
            return False

        url = url.strip()
        return any(re.match(pattern, url, re.IGNORECASE) for pattern in self.YOUTUBE_PATTERNS)

    def extract_video_info(self, url: str) -> dict[str, Any]:
        """Extract video information without downloading.

        Args:
            url: YouTube video URL

        Returns:
            Dictionary with video metadata

        Raises:
            InvalidURLError: If URL is invalid
            DownloadFailedError: If info extraction fails
        """
        if not self.validate_youtube_url(url):
            raise InvalidURLError(f"Invalid YouTube URL: {url}")

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

                return {
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                    "uploader": info.get("uploader", "Unknown"),
                    "upload_date": info.get("upload_date"),
                    "description": info.get("description", ""),
                    "thumbnail": info.get("thumbnail"),
                    "video_id": info.get("id"),
                    "ext": info.get("ext", "mp4"),
                    "filesize": info.get("filesize") or info.get("filesize_approx", 0),
                }

        except DownloadError as e:
            logger.error(
                "Failed to extract video info",
                exc_info=e,
                extra={"url": url},
            )
            raise DownloadFailedError(f"Failed to get video information: {e!s}") from e
        except Exception as e:
            logger.error(
                "Unexpected error extracting video info",
                exc_info=e,
                extra={"url": url},
            )
            raise DownloadFailedError(f"Unexpected error: {e!s}") from e

    def download_and_upload_to_s3(
        self,
        url: str,
        job_id: str,
        progress_callback: Callable[[float], None] | None = None,
    ) -> tuple[str, dict[str, Any]]:
        """Download YouTube video and upload to S3.

        Args:
            url: YouTube video URL
            job_id: Job identifier
            progress_callback: Optional callback function for progress updates

        Returns:
            Tuple of (s3_key, video_info)

        Raises:
            InvalidURLError: If URL is invalid
            DownloadFailedError: If download fails
        """
        if not self.validate_youtube_url(url):
            raise InvalidURLError(f"Invalid YouTube URL: {url}")

        # Extract video info first
        video_info = self.extract_video_info(url)

        # Create temporary directory for download
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            output_template = str(temp_path / "%(id)s.%(ext)s")

            def progress_hook(d):
                """Progress hook for yt-dlp."""
                if progress_callback and d["status"] == "downloading":
                    try:
                        downloaded = d.get("downloaded_bytes", 0)
                        total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                        if total > 0:
                            percent = (downloaded / total) * 100
                            progress_callback(percent)
                    except Exception:
                        pass

            ydl_opts = {
                # Download 720p max for processing efficiency
                # Format priority: 720p mp4 > 720p any > best under 720p > best available
                "format": (
                    "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/"
                    "bestvideo[height<=720]+bestaudio/"
                    "best[height<=720]/"
                    "best"
                ),
                "outtmpl": output_template,
                "quiet": False,
                "no_warnings": False,
                "progress_hooks": [progress_hook] if progress_callback else [],
                "merge_output_format": "mp4",
                # Limit file size to 1GB (720p should never exceed this)
                "max_filesize": 1024 * 1024 * 1024,
            }

            try:
                logger.info(
                    "Starting YouTube video download",
                    extra={"url": url, "job_id": job_id},
                )

                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    video_id = info.get("id")
                    ext = info.get("ext", "mp4")

                # Find the downloaded file
                downloaded_file = temp_path / f"{video_id}.{ext}"
                if not downloaded_file.exists():
                    # Try to find any video file in temp directory
                    video_files = list(temp_path.glob("*.mp4")) + list(temp_path.glob("*.mkv"))
                    if video_files:
                        downloaded_file = video_files[0]
                    else:
                        raise DownloadFailedError("Downloaded file not found")

                logger.info(
                    "YouTube video downloaded successfully",
                    extra={
                        "job_id": job_id,
                        "file_size": downloaded_file.stat().st_size,
                    },
                )

                # Generate S3 key
                filename = f"{video_info['title'][:50]}_{video_id}.{ext}"
                # Sanitize filename
                filename = re.sub(r'[<>:"/\\|?*]', "_", filename)
                s3_key = s3_service.generate_object_key(job_id=job_id, filename=filename)

                # Upload to S3
                logger.info(
                    "Uploading YouTube video to S3",
                    extra={"job_id": job_id, "s3_key": s3_key},
                )

                s3_service.upload_file(
                    file_path=str(downloaded_file),
                    object_key=s3_key,
                    content_type="video/mp4",
                )

                logger.info(
                    "YouTube video uploaded to S3 successfully",
                    extra={"job_id": job_id, "s3_key": s3_key},
                )

                # Update video info with actual file size
                video_info["filesize"] = downloaded_file.stat().st_size
                video_info["filename"] = filename

                return s3_key, video_info

            except DownloadError as e:
                logger.error(
                    "Failed to download YouTube video",
                    exc_info=e,
                    extra={"url": url, "job_id": job_id},
                )
                raise DownloadFailedError(f"Failed to download video: {e!s}") from e
            except Exception as e:
                logger.error(
                    "Unexpected error during YouTube download",
                    exc_info=e,
                    extra={"url": url, "job_id": job_id},
                )
                raise DownloadFailedError(f"Unexpected error: {e!s}") from e


# Singleton instance
youtube_service = YouTubeService()
