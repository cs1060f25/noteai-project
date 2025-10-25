"""s3 service for managing video storage and pre-signed urls."""

from datetime import datetime, timezone

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


class S3Service:
    """service for interacting with aws s3."""

    def __init__(self) -> None:
        """initialize s3 client."""
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
            config=Config(signature_version="s3v4"),
        )
        self.bucket_name = settings.s3_bucket_name

    def generate_presigned_url(
        self,
        object_key: str,
        expiration: int | None = None,
    ) -> str:
        """generate a pre-signed url for downloading an s3 object."""
        if expiration is None:
            expiration = settings.s3_presigned_url_expiry

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expiration,
            )
            logger.info(
                "Generated pre-signed URL",
                extra={
                    "object_key": object_key,
                    "expiration": expiration,
                },
            )
            return url
        except ClientError as e:
            logger.error(
                "Failed to generate pre-signed URL",
                exc_info=e,
                extra={"object_key": object_key},
            )
            raise

    def generate_presigned_upload_url(
        self,
        object_key: str,
        content_type: str,
        expiration: int | None = None,
    ) -> dict[str, str]:
        """generate a pre-signed url for uploading to s3."""
        if expiration is None:
            expiration = settings.s3_presigned_url_expiry

        try:
            url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket_name,
                    "Key": object_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expiration,
            )
            logger.info(
                "Generated pre-signed upload URL",
                extra={
                    "object_key": object_key,
                    "content_type": content_type,
                    "expiration": expiration,
                },
            )
            return {"url": url, "fields": {}}
        except ClientError as e:
            logger.error(
                "Failed to generate pre-signed upload URL",
                exc_info=e,
                extra={"object_key": object_key},
            )
            raise

    def generate_object_key(
        self,
        job_id: str,
        filename: str,
        prefix: str = "uploads",
    ) -> str:
        """generate a unique s3 object key for a file."""
        extension = ""
        if "." in filename:
            extension = filename.rsplit(".", 1)[-1].lower()

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        object_key = f"{prefix}/{job_id}/{timestamp}_original.{extension}"

        logger.info(
            "Generated S3 object key",
            extra={"job_id": job_id, "object_key": object_key},
        )
        return object_key

    def generate_clip_key(
        self,
        job_id: str,
        clip_id: str,
        extension: str = "mp4",
    ) -> str:
        """generate s3 object key for a generated clip."""
        return f"clips/{job_id}/{clip_id}.{extension}"

    def generate_thumbnail_key(
        self,
        job_id: str,
        clip_id: str,
        extension: str = "jpg",
    ) -> str:
        """generate s3 object key for a clip thumbnail."""
        return f"thumbnails/{job_id}/{clip_id}.{extension}"

    def generate_subtitle_key(
        self,
        job_id: str,
        clip_id: str,
        extension: str = "vtt",
    ) -> str:
        """generate s3 object key for subtitles."""
        return f"subtitles/{job_id}/{clip_id}.{extension}"

    def check_object_exists(self, object_key: str) -> bool:
        """check if an object exists in s3."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            logger.error(
                "Error checking object existence",
                exc_info=e,
                extra={"object_key": object_key},
            )
            raise

    def delete_object(self, object_key: str) -> bool:
        """delete an object from s3."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_key)
            logger.info("Deleted S3 object", extra={"object_key": object_key})
            return True
        except ClientError as e:
            logger.error(
                "Failed to delete S3 object",
                exc_info=e,
                extra={"object_key": object_key},
            )
            return False

    def get_cloudfront_url(self, object_key: str) -> str | None:
        """get cloudfront url for an object if configured."""
        if settings.cloudfront_domain:
            return f"https://{settings.cloudfront_domain}/{object_key}"
        return None

    def get_public_url(self, object_key: str) -> str:
        """get public s3 url for an object (or cloudfront if configured)."""
        cloudfront_url = self.get_cloudfront_url(object_key)
        if cloudfront_url:
            return cloudfront_url

        return f"https://{self.bucket_name}.s3.{settings.aws_region}.amazonaws.com/{object_key}"


s3_service = S3Service()
