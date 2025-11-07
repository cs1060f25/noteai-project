import axios from 'axios';

import { apiClient } from '../lib/clerk-api';

import type {
  AdminJobListResponse,
  AdminJobsQueryParams,
  AdminUserListResponse,
  AdminUsersQueryParams,
  ProcessingLogResponse,
  ProcessingLogsQueryParams,
  SystemMetrics,
} from '../types/admin';

export class AdminError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AdminError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Fetch system-wide metrics including user counts, job statistics, storage usage, and activity
 */
export const getSystemMetrics = async (): Promise<SystemMetrics> => {
  try {
    const response = await apiClient.get<SystemMetrics>('/admin/metrics');
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AdminError(apiError.message, apiError.code, error.response.status);
    }
    throw new AdminError('Failed to fetch system metrics', 'METRICS_FETCH_FAILED');
  }
};

/**
 * Fetch all jobs across all users with optional filtering
 */
export const getAllJobs = async (params?: AdminJobsQueryParams): Promise<AdminJobListResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.user_id) {
      queryParams.append('user_id', params.user_id);
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/admin/jobs?${queryString}` : '/admin/jobs';

    const response = await apiClient.get<AdminJobListResponse>(url);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AdminError(apiError.message, apiError.code, error.response.status);
    }
    throw new AdminError('Failed to fetch jobs', 'JOBS_FETCH_FAILED');
  }
};

/**
 * Fetch all users with optional search and pagination
 */
export const getAllUsers = async (
  params?: AdminUsersQueryParams
): Promise<AdminUserListResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

    const response = await apiClient.get<AdminUserListResponse>(url);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AdminError(apiError.message, apiError.code, error.response.status);
    }
    throw new AdminError('Failed to fetch users', 'USERS_FETCH_FAILED');
  }
};

/**
 * Fetch processing logs with optional filtering
 */
export const getProcessingLogs = async (
  params?: ProcessingLogsQueryParams
): Promise<ProcessingLogResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (params?.job_id) {
      queryParams.append('job_id', params.job_id);
    }
    if (params?.agent_name) {
      queryParams.append('agent_name', params.agent_name);
    }
    if (params?.level) {
      queryParams.append('level', params.level);
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/admin/processing-logs?${queryString}` : '/admin/processing-logs';

    const response = await apiClient.get<ProcessingLogResponse>(url);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AdminError(apiError.message, apiError.code, error.response.status);
    }
    throw new AdminError('Failed to fetch processing logs', 'LOGS_FETCH_FAILED');
  }
};
