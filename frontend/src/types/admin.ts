import { JobStatus, UserRole } from './api';

// System Metrics Types

export interface SystemMetrics {
  users: {
    total: number;
    active_30d: number;
    admin_count: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  storage: {
    total_bytes: number;
    video_bytes: number;
    clip_bytes: number;
  };
  activity: {
    jobs_last_24h: number;
    jobs_last_7d: number;
    jobs_last_30d: number;
  };
}

// Admin Jobs Types

export interface AdminJobResponse {
  job_id: string;
  status: JobStatus;
  filename: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  user: {
    user_id: string;
    email: string;
    name?: string;
  };
}

export interface AdminJobListResponse {
  jobs: AdminJobResponse[];
  total: number;
  limit: number;
  offset: number;
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
  job_count: number;
  created_at: string;
  last_active_at?: string;
}

export interface AdminUserListResponse {
  users: AdminUserResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface AdminUsersQueryParams {
  search?: string;
  limit?: number;
  offset?: number;
}

// Processing Logs Types

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ProcessingLog {
  log_id: string;
  job_id: string;
  agent_name: string;
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ProcessingLogResponse {
  logs: ProcessingLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProcessingLogsQueryParams {
  job_id?: string;
  agent_name?: string;
  level?: LogLevel;
  limit?: number;
  offset?: number;
}
