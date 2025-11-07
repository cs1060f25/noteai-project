import { JobStatus, UserRole } from './api';

// System Metrics Types

export interface JobStatusCounts {
  pending: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
}

export interface SystemMetrics {
  total_users: number;
  active_users_30d: number;
  total_jobs: number;
  jobs_by_status: JobStatusCounts;
  total_storage_bytes: number;
  jobs_last_24h: number;
  jobs_last_7d: number;
  jobs_last_30d: number;
}

// Admin Jobs Types

export interface AdminJobUser {
  user_id: string;
  email: string;
  name?: string;
}

export interface AdminJobResponse {
  job_id: string;
  user: AdminJobUser;
  filename: string;
  file_size: number;
  status: JobStatus;
  current_stage?: string;
  progress_percent?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AdminJobListResponse {
  jobs: AdminJobResponse[];
  total: number;
}

export interface AdminJobsQueryParams {
  limit?: number;
  offset?: number;
  status?: JobStatus;
  user_id?: string;
}

// Admin Users Types

export interface AdminUserResponse {
  user_id: string;
  email: string;
  name?: string;
  role: UserRole;
  is_active: boolean;
  job_count: number;
  created_at: string;
  last_login_at?: string;
}

export interface AdminUserListResponse {
  users: AdminUserResponse[];
  total: number;
}

export interface AdminUsersQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
}

// Processing Logs Types

export type ProcessingLogStatus = 'started' | 'completed' | 'failed';

export interface ProcessingLog {
  log_id: string;
  job_id: string;
  stage: string;
  agent_name?: string;
  status: ProcessingLogStatus;
  duration_seconds?: number;
  error_message?: string;
  created_at: string;
}

export interface ProcessingLogListResponse {
  logs: ProcessingLog[];
  total: number;
}

export interface ProcessingLogsQueryParams {
  job_id?: string;
  stage?: string;
  limit?: number;
  offset?: number;
}
