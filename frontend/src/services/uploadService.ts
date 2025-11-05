import axios from 'axios';

import { apiClient } from '../lib/clerk-api';

import type { JobListResponse, JobResponse, UploadRequest, UploadResponse } from '../types/api';

export class UploadError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const initiateUpload = async (file: File): Promise<UploadResponse> => {
  try {
    const request: UploadRequest = {
      filename: file.name,
      file_size: file.size,
      content_type: file.type,
    };

    const response = await apiClient.post<UploadResponse>('/upload', request);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new UploadError(apiError.message, apiError.code, error.response.status);
    }
    throw new UploadError('Failed to initiate upload', 'UPLOAD_INIT_FAILED');
  }
};

export const uploadToS3 = async (
  file: File,
  uploadUrl: string,
  uploadFields: Record<string, string>,
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    const hasFields = Object.keys(uploadFields).length > 0;

    if (hasFields) {
      const formData = new FormData();

      Object.entries(uploadFields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      formData.append('file', file);

      await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
    } else {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      });
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorDetails = error.response?.data ? `: ${JSON.stringify(error.response.data)}` : '';
      throw new UploadError(
        `Failed to upload file to S3${errorDetails}`,
        'S3_UPLOAD_FAILED',
        error.response?.status
      );
    }
    throw new UploadError('Failed to upload file to S3', 'S3_UPLOAD_FAILED');
  }
};

export const confirmUpload = async (jobId: string): Promise<void> => {
  try {
    await apiClient.post('/upload/confirm', { job_id: jobId });
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new UploadError(apiError.message, apiError.code, error.response.status);
    }
    throw new UploadError('Failed to confirm upload', 'CONFIRM_UPLOAD_FAILED');
  }
};

export const uploadVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ jobId: string; s3Key: string; uploadResponse: UploadResponse }> => {
  // step 1: initiate upload (5% progress)
  onProgress?.(5);
  const uploadResponse = await initiateUpload(file);

  // step 2: upload to s3 (10% - 95% progress)
  onProgress?.(10);
  await uploadToS3(file, uploadResponse.upload_url, uploadResponse.upload_fields, (s3Progress) => {
    const overallProgress = 10 + Math.round(s3Progress * 0.85);
    onProgress?.(overallProgress);
  });

  // step 3: confirm upload and trigger processing (95% - 100% progress)
  onProgress?.(95);
  await confirmUpload(uploadResponse.job_id);
  onProgress?.(100);

  return { jobId: uploadResponse.job_id, s3Key: uploadResponse.s3_key, uploadResponse };
};

export const getJobStatus = async (jobId: string): Promise<JobResponse> => {
  try {
    const response = await apiClient.get<JobResponse>(`/jobs/${jobId}`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new UploadError(apiError.message, apiError.code, error.response.status);
    }
    throw new UploadError('Failed to get job status', 'JOB_STATUS_FAILED');
  }
};

export const getJobs = async (limit = 50, offset = 0): Promise<JobListResponse> => {
  try {
    const response = await apiClient.get<JobListResponse>(`/jobs?limit=${limit}&offset=${offset}`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new UploadError(apiError.message, apiError.code, error.response.status);
    }
    throw new UploadError('Failed to get jobs list', 'JOBS_LIST_FAILED');
  }
};

export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  const ALLOWED_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload MP4, MOV, AVI, MKV, or WebM video files.',
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 2GB limit. Please upload a smaller video file.',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty. Please select a valid video file.',
    };
  }

  return { valid: true };
};
