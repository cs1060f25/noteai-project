"""Pydantic schemas for admin API endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field

# Admin Job Schemas


class AdminJobUser(BaseModel):
    """User information included in admin job responses."""

    user_id: str = Field(..., description="User identifier")
    email: str = Field(..., description="User email")
    name: str | None = Field(None, description="User display name")


class AdminJobResponse(BaseModel):
    """Job response with user information for admin endpoints."""

    job_id: str = Field(..., description="Unique job identifier")
    user: AdminJobUser = Field(..., description="Job owner information")
    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    status: str = Field(..., description="Current job status")
    current_stage: str | None = Field(None, description="Current processing stage")
    progress_percent: float | None = Field(None, description="Progress percentage")
    error_message: str | None = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Job creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    completed_at: datetime | None = Field(None, description="Completion timestamp")


class AdminJobListResponse(BaseModel):
    """Paginated list of jobs for admin endpoints."""

    jobs: list[AdminJobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., description="Total number of jobs")


# Admin User Schemas


class AdminUserResponse(BaseModel):
    """User response with statistics for admin endpoints."""

    user_id: str = Field(..., description="User identifier")
    email: str = Field(..., description="User email")
    name: str | None = Field(None, description="User display name")
    role: str = Field(..., description="User role (user, admin)")
    is_active: bool = Field(..., description="Whether user is active")
    job_count: int = Field(..., description="Total jobs created by user")
    created_at: datetime = Field(..., description="User creation timestamp")
    last_login_at: datetime | None = Field(None, description="Last login timestamp")


class AdminUserListResponse(BaseModel):
    """Paginated list of users for admin endpoints."""

    users: list[AdminUserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")


# System Metrics Schemas


class JobStatusCounts(BaseModel):
    """Job counts by status."""

    pending: int = Field(0, description="Number of pending jobs")
    queued: int = Field(0, description="Number of queued jobs")
    running: int = Field(0, description="Number of running jobs")
    completed: int = Field(0, description="Number of completed jobs")
    failed: int = Field(0, description="Number of failed jobs")


class SystemMetricsResponse(BaseModel):
    """System-wide metrics for admin dashboard."""

    total_users: int = Field(..., description="Total number of users")
    active_users_30d: int = Field(..., description="Active users in last 30 days")
    total_jobs: int = Field(..., description="Total number of jobs")
    jobs_by_status: JobStatusCounts = Field(..., description="Job counts by status")
    total_storage_bytes: int = Field(..., description="Total storage used in bytes")
    jobs_last_24h: int = Field(..., description="Jobs created in last 24 hours")
    jobs_last_7d: int = Field(..., description="Jobs created in last 7 days")
    jobs_last_30d: int = Field(..., description="Jobs created in last 30 days")


# Processing Log Schemas


class ProcessingLogResponse(BaseModel):
    """Processing log entry for admin endpoints."""

    log_id: str = Field(..., description="Log identifier")
    job_id: str = Field(..., description="Job identifier")
    stage: str = Field(..., description="Processing stage")
    agent_name: str | None = Field(None, description="Agent name")
    status: str = Field(..., description="Log status (started, completed, failed)")
    duration_seconds: float | None = Field(None, description="Duration in seconds")
    error_message: str | None = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Log creation timestamp")


class ProcessingLogListResponse(BaseModel):
    """Paginated list of processing logs."""

    logs: list[ProcessingLogResponse] = Field(..., description="List of processing logs")
    total: int = Field(..., description="Total number of logs")
