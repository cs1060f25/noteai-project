import axios from 'axios';

import { apiClient } from '../lib/api';
import type { JobResponse, UploadRequest, UploadResponse } from '../types/api';

export class UploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Initiate video upload and get pre-signed S3 URL
 */
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

/**
 * Upload file directly to S3 using pre-signed URL
 */
export const uploadToS3 = async (
  file: File,
  uploadUrl: string,
  uploadFields: Record<string, string>,
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    // check if we have fields (POST) or just URL (PUT)
    const hasFields = Object.keys(uploadFields).length > 0;

    if (hasFields) {
      // POST with multipart/form-data (for post_object presigned URLs)
      const formData = new FormData();

      // add all pre-signed fields first
      Object.entries(uploadFields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // add the file last
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
      // PUT with file content (for put_object presigned URLs)
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
      const errorDetails = error.response?.data
        ? `: ${JSON.stringify(error.response.data)}`
        : '';
      throw new UploadError(
        `Failed to upload file to S3${errorDetails}`,
        'S3_UPLOAD_FAILED',
        error.response?.status
      );
    }
    throw new UploadError('Failed to upload file to S3', 'S3_UPLOAD_FAILED');
  }
};

/**
 * Complete upload flow: initiate + upload to S3
 */
export const uploadVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ jobId: string; s3Key: string; uploadResponse: UploadResponse }> => {
  // initiate upload (0-10% progress)
  onProgress?.(5);
  const uploadResponse = await initiateUpload(file);

  onProgress?.(10);

  // upload to S3 (10-100% progress)
  await uploadToS3(file, uploadResponse.upload_url, uploadResponse.upload_fields, (s3Progress) => {
    // map S3 progress (0-100) to overall progress (10-100)
    const overallProgress = 10 + Math.round(s3Progress * 0.9);
    onProgress?.(overallProgress);
  });

  return { jobId: uploadResponse.job_id, s3Key: uploadResponse.s3_key, uploadResponse };
};

/**
 * Get job status
 */
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

/**
 * Validate file before upload
 */
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
