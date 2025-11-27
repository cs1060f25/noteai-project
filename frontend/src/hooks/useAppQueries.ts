import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { UserResponse } from '@/types/api';

import {
  getSystemMetrics,
  getAllJobs,
  getAllUsers,
  getProcessingLogs,
} from '../services/adminService';
import { getDashboardData } from '../services/dashboardService';
import { getResults } from '../services/resultsService';
import {
  getJobs,
  getJobStatus,
  uploadVideo,
  uploadFromYouTube,
  deleteJob,
} from '../services/uploadService';
import { userService } from '../services/userService';

import type {
  AdminJobsQueryParams,
  AdminUsersQueryParams,
  ProcessingLogsQueryParams,
} from '../types/admin';
import type { ProcessingConfig } from '../types/api';

// Query Keys
export const QUERY_KEYS = {
  user: ['user'],
  jobs: ['jobs'],
  jobDetails: (jobId: string) => ['jobs', jobId],
  storageStats: ['storageStats'],
  adminMetrics: ['admin', 'metrics'],
  adminJobs: ['admin', 'jobs'],
  adminUsers: ['admin', 'users'],
  adminLogs: ['admin', 'logs'],
} as const;

// Hooks

export const useUser = () => {
  return useQuery({
    queryKey: QUERY_KEYS.user,
    queryFn: () => userService.getCurrentUser(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useJobs = (limit = 50, offset = 0) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.jobs, limit, offset],
    queryFn: () => getJobs(limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useJobDetails = (jobId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.jobDetails(jobId),
    queryFn: () => getJobStatus(jobId),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!jobId,
  });
};

export const useJobResults = (jobId: string) => {
  return useQuery({
    queryKey: ['jobResults', jobId],
    queryFn: () => getResults(jobId),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!jobId,
  });
};

export const useStorageStats = () => {
  return useQuery({
    queryKey: QUERY_KEYS.storageStats,
    queryFn: async () => {
      const data = await getDashboardData();
      return data.stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    staleTime: 2 * 60 * 1000, // 2 minutes (for job list)
  });
};

// Mutations

export const useUploadJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file?: File;
      youtubeUrl?: string;
      onProgress?: (progress: number) => void;
      processingConfig?: ProcessingConfig;
    }) => {
      if (params.file) {
        return uploadVideo(params.file, params.onProgress, params.processingConfig);
      } else if (params.youtubeUrl) {
        return uploadFromYouTube(params.youtubeUrl, params.onProgress, params.processingConfig);
      }
      throw new Error('Either file or youtubeUrl must be provided');
    },
    onSuccess: () => {
      // Invalidate jobs list to show new upload
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs });
      // Also invalidate stats as they might have changed
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats });
    },
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.storageStats });
    },
  });
};

export const useApiKeyStatus = () => {
  return useQuery({
    queryKey: ['apiKeyStatus'],
    queryFn: () => userService.getApiKeyStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UserResponse>) => userService.updateCurrentUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.user });
    },
  });
};

export const useStoreApiKey = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (apiKey: string) => userService.storeApiKey(apiKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeyStatus'] });
    },
  });
};

// Admin Hooks

export const useAdminMetrics = () => {
  return useQuery({
    queryKey: QUERY_KEYS.adminMetrics,
    queryFn: () => getSystemMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdminJobs = (params?: AdminJobsQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.adminJobs, params],
    queryFn: () => getAllJobs(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAdminUsers = (params?: AdminUsersQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.adminUsers, params],
    queryFn: () => getAllUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdminLogs = (params?: ProcessingLogsQueryParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.adminLogs, params],
    queryFn: () => getProcessingLogs(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};
