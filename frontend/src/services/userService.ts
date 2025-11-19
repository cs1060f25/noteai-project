import { apiClient } from '@/lib/clerk-api';
import type { UserResponse, UserUpdateRequest } from '@/types/api';

export const userService = {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/users/me');
  },

  /**
   * Update current user profile
   */
  async updateCurrentUser(data: UserUpdateRequest): Promise<UserResponse> {
    return apiClient.patch<UserResponse>('/users/me', data);
  },

  /**
   * Store user's Gemini API key
   */
  async storeApiKey(apiKey: string): Promise<{ has_api_key: boolean; masked_key: string }> {
    return apiClient.post('/users/api-keys', { api_key: apiKey });
  },

  /**
   * Get API key status
   */
  async getApiKeyStatus(): Promise<{ has_api_key: boolean; masked_key?: string }> {
    return apiClient.get('/users/api-keys/status');
  },

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<{ is_valid: boolean; message: string }> {
    return apiClient.post('/users/api-keys/validate', { api_key: apiKey });
  },
};
