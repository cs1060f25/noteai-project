import axios from 'axios';

import { apiClient } from '../lib/clerk-api';

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
