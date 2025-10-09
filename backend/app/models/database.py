"""Database models."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class Job(Base):
    """Job database model."""

    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(100), unique=True, index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    s3_key = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, index=True)
    error_message = Column(Text, nullable=True)

    # Progress tracking
    current_stage = Column(String(50), nullable=True)
    progress_percent = Column(Float, default=0.0)
    progress_message = Column(String(500), nullable=True)
    eta_seconds = Column(Integer, nullable=True)

    # Metadata
    metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the job
        """
        return {
            "job_id": self.job_id,
            "filename": self.filename,
            "file_size": self.file_size,
            "status": self.status,
            "error_message": self.error_message,
            "current_stage": self.current_stage,
            "progress_percent": self.progress_percent,
            "progress_message": self.progress_message,
            "eta_seconds": self.eta_seconds,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class Clip(Base):
    """Generated clip database model."""

    __tablename__ = "clips"

    id = Column(Integer, primary_key=True, index=True)
    clip_id = Column(String(100), unique=True, index=True, nullable=False)
    job_id = Column(String(100), index=True, nullable=False)

    title = Column(String(500), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)

    s3_key = Column(String(500), nullable=False)
    thumbnail_s3_key = Column(String(500), nullable=True)

    # Metadata
    metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, Any]:
        """Convert model to dictionary.

        Returns:
            Dictionary representation of the clip
        """
        return {
            "clip_id": self.clip_id,
            "job_id": self.job_id,
            "title": self.title,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "s3_key": self.s3_key,
            "thumbnail_s3_key": self.thumbnail_s3_key,
            "metadata": self.metadata,
            "created_at": self.created_at,
        }
