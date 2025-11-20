import axios from 'axios';

import { apiClient } from '../lib/clerk-api';

import type { DashboardData } from '../types/api';

export class DashboardError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'DashboardError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const getDashboardData = async (): Promise<DashboardData> => {
  try {
    const response = await apiClient.get<DashboardData>('/dashboard');
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new DashboardError(apiError.message, apiError.code, error.response.status);
    }
    throw new DashboardError('Failed to fetch dashboard data', 'DASHBOARD_FETCH_FAILED');
  }
};
