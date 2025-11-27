"""application settings and configuration."""

from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    app_name: str = "NoteAI"
    app_version: str = "0.1.0"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")

    # API
    api_v1_prefix: str = "/api/v1"
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="CORS allowed origins (comma-separated)",
    )
    max_upload_size_mb: int = Field(default=500, description="Max upload size in MB")
    upload_allowed_extensions: str = Field(
        default=".mp4,.mov,.avi,.mkv,.webm",
        description="Allowed video file extensions (comma-separated)",
    )

    # Database
    database_url: str = Field(
        default="sqlite:///./lecture_extractor.db",
        description="Database connection URL",
    )
    db_echo: bool = Field(default=False, description="Echo SQL statements")

    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")
    redis_password: str | None = Field(default=None, description="Redis password")

    # Celery
    celery_broker_url: str = Field(
        default="redis://localhost:6379/0",
        description="Celery broker URL",
    )
    celery_result_backend: str = Field(
        default="redis://localhost:6379/1",
        description="Celery result backend URL",
    )
    celery_task_time_limit: int = Field(
        default=3600,
        description="Task time limit in seconds",
    )
    celery_task_soft_time_limit: int = Field(
        default=3000,
        description="Task soft time limit in seconds",
    )

    # AWS S3
    aws_access_key_id: str | None = Field(default=None, description="AWS access key ID")
    aws_secret_access_key: str | None = Field(default=None, description="AWS secret access key")
    aws_region: str = Field(default="us-east-1", description="AWS region")
    s3_bucket_name: str = Field(default="lecture-highlights", description="S3 bucket name")
    s3_presigned_url_expiry: int = Field(
        default=3600,
        description="S3 pre-signed URL expiry in seconds",
    )
    cloudfront_domain: str | None = Field(
        default=None,
        description="CloudFront domain for serving videos",
    )

    # Video Processing
    video_compilation_max_workers: int = Field(
        default=2,
        description="Maximum parallel workers for video clip compilation (1-4)",
    )
    watermark_path: str = Field(
        default="backend/watermark/watermark.png",
        description="Path to watermark image",
    )

    # AI Services
    google_cloud_credentials_path: str | None = Field(
        default=None,
        description="Path to Google Cloud service account JSON key file (if not using default credentials)",
    )
    google_cloud_project_id: str | None = Field(
        default=None,
        description="Google Cloud project ID",
    )
    speech_to_text_language_code: str = Field(
        default="en-US",
        description="Language code for Speech-to-Text (e.g., en-US, es-ES)",
    )
    speech_to_text_model: str = Field(
        default="latest_long",
        description="Speech-to-Text model to use (latest_short, latest_long, video, phone_call)",
    )
    speech_to_text_enable_word_time_offsets: bool = Field(
        default=True,
        description="Enable word-level timestamps in transcription",
    )
    gemini_api_key: str | None = Field(default=None, description="Google Gemini API key")
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        description="Gemini model to use for content analysis",
    )
    whisper_model: str = Field(default="whisper-1", description="Whisper model to use")

    # Email - Resend
    resend_api_key: str | None = Field(default=None, description="Resend API key")
    resend_from_email: str = Field(
        default="NoteAI <onboarding@resend.dev>",
        description="Email address to send from",
    )

    # Security
    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        description="Secret key for encryption and signatures",
    )
    api_key_encryption_secret: str | None = Field(
        default=None,
        description="Secret key for API key encryption (32 url-safe base64-encoded bytes)",
    )

    # Authentication - Clerk
    clerk_publishable_key: str = Field(
        default="",
        description="Clerk Publishable Key",
    )
    clerk_secret_key: str = Field(
        default="",
        description="Clerk Secret Key",
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=60,
        description="Rate limit per minute per IP",
    )
    rate_limit_auth_login: str = Field(
        default="5/minute",
        description="Rate limit for login endpoint (format: '5/minute' or '10/hour')",
    )
    rate_limit_auth_refresh: str = Field(
        default="10/minute",
        description="Rate limit for token refresh endpoint",
    )
    rate_limit_upload: str = Field(
        default="3/minute;10/hour",
        description="Rate limit for upload endpoint (multiple limits separated by ;)",
    )
    rate_limit_job_status: str = Field(
        default="20/minute",
        description="Rate limit for job status polling endpoint",
    )
    rate_limit_results: str = Field(
        default="10/minute",
        description="Rate limit for results retrieval endpoint",
    )
    rate_limit_presigned_url: str = Field(
        default="15/minute",
        description="Rate limit for pre-signed URL generation endpoint",
    )
    rate_limit_jobs_list: str = Field(
        default="30/minute",
        description="Rate limit for jobs list endpoint",
    )

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """validate log level."""
        valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"Invalid log level: {v}. Must be one of {valid_levels}")
        return v_upper

    def get_allowed_origins(self) -> list[str]:
        """get allowed origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    def get_upload_extensions(self) -> list[str]:
        """get allowed file extensions as a list."""
        return [ext.strip() for ext in self.upload_allowed_extensions.split(",")]

    @property
    def is_production(self) -> bool:
        """check if running in production."""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """check if running in development."""
        return self.environment == "development"


# Global settings instance
settings = Settings()
