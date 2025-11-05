import axios from 'axios';

import { apiClient } from '../lib/clerk-api';

import type {
  ContentSegmentsResponse,
  SilenceRegionsResponse,
  TranscriptsResponse,
} from '../types/api';

export class AgentOutputsError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AgentOutputsError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const getTranscripts = async (jobId: string): Promise<TranscriptsResponse> => {
  try {
    const response = await apiClient.get<TranscriptsResponse>(`/jobs/${jobId}/transcripts`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AgentOutputsError(apiError.message, apiError.code, error.response.status);
    }
    throw new AgentOutputsError('Failed to fetch transcripts', 'TRANSCRIPTS_FETCH_FAILED');
  }
};

export const getSilenceRegions = async (jobId: string): Promise<SilenceRegionsResponse> => {
  try {
    const response = await apiClient.get<SilenceRegionsResponse>(`/jobs/${jobId}/silence-regions`);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AgentOutputsError(apiError.message, apiError.code, error.response.status);
    }
    throw new AgentOutputsError('Failed to fetch silence regions', 'SILENCE_REGIONS_FETCH_FAILED');
  }
};

export const getContentSegments = async (jobId: string): Promise<ContentSegmentsResponse> => {
  try {
    const response = await apiClient.get<ContentSegmentsResponse>(
      `/jobs/${jobId}/content-segments`
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new AgentOutputsError(apiError.message, apiError.code, error.response.status);
    }
    throw new AgentOutputsError(
      'Failed to fetch content segments',
      'CONTENT_SEGMENTS_FETCH_FAILED'
    );
  }
};
