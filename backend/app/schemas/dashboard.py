"""pydantic schemas for dashboard api endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class DashboardStatsResponse(BaseModel):
    """user dashboard statistics."""

    total_videos: int = Field(..., description="Total number of videos uploaded")
    processing: int = Field(..., description="Number of videos currently processing")
    completed: int = Field(..., description="Number of completed videos")
    failed: int = Field(..., description="Number of failed videos")
    total_clips: int = Field(..., description="Total number of clips generated")
    total_storage_bytes: int = Field(..., description="Total storage used in bytes")
    videos_last_24h: int = Field(..., description="Videos uploaded in last 24 hours")
    videos_last_7d: int = Field(..., description="Videos uploaded in last 7 days")
    videos_last_30d: int = Field(..., description="Videos uploaded in last 30 days")


class RecentVideoResponse(BaseModel):
    """recent video information for dashboard."""

    job_id: str = Field(..., description="Job identifier")
    filename: str = Field(..., description="Original filename")
    status: str = Field(..., description="Current job status")
    clips_count: int = Field(0, description="Number of clips generated")
    duration: float | None = Field(None, description="Video duration in seconds")
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    current_stage: str | None = Field(None, description="Current processing stage")
    progress_percent: float | None = Field(None, description="Progress percentage")


class DashboardDataResponse(BaseModel):
    """complete dashboard data including stats and recent videos."""

    stats: DashboardStatsResponse = Field(..., description="Dashboard statistics")
    recent_videos: list[RecentVideoResponse] = Field(..., description="Recent videos (max 5)")
