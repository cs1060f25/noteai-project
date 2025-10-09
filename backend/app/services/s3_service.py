"""S3 service for managing video storage and pre-signed URLs."""

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.logging import get_logger
from app.core.settings import settings

logger = get_logger(__name__)


class S3Service:
    """Service for interacting with AWS S3."""

    def __init__(self) -> None:
        """Initialize S3 client."""
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
        """Generate a pre-signed URL for downloading an S3 object.

        Args:
            object_key: The S3 object key (path within bucket)
            expiration: URL expiration time in seconds (default from settings)

        Returns:
            Pre-signed URL string

        Raises:
            ClientError: If URL generation fails
        """
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

    def check_object_exists(self, object_key: str) -> bool:
        """Check if an object exists in S3.

        Args:
            object_key: The S3 object key to check

        Returns:
            True if object exists, False otherwise
        """
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


# Global S3 service instance
s3_service = S3Service()
