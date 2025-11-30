import axios from 'axios';

import api, { apiClient } from '../lib/clerk-api';

import type { ResultsResponse } from '../types/api';

export class ResultsError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'ResultsError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const getResults = async (jobId: string): Promise<ResultsResponse> => {
  try {
    const response = await apiClient.get<ResultsResponse>(`/results/${jobId}`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new ResultsError(apiError.message, apiError.code, error.response.status);
    }
    throw new ResultsError('Failed to fetch results', 'RESULTS_FETCH_FAILED');
  }
};

export const exportTranscript = async (jobId: string, filename?: string): Promise<void> => {
  try {
    const response = await api.get(`/results/${jobId}/export-transcript`, {
      responseType: 'blob',
    });

    // Create blob from response
    const blob = new Blob([response.data], { type: 'text/plain; charset=utf-8' });

    // Extract filename from Content-Disposition header if not provided
    let downloadFilename = filename;
    if (!downloadFilename) {
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          downloadFilename = filenameMatch[1];
        }
      }
    }

    // Fallback filename
    if (!downloadFilename) {
      downloadFilename = `transcript_${jobId}_${new Date().toISOString().split('T')[0]}.txt`;
    }

    // Create download link and trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new ResultsError(apiError.message, apiError.code, error.response.status);
    }
    throw new ResultsError('Failed to export transcript', 'TRANSCRIPT_EXPORT_FAILED');
  }
};
