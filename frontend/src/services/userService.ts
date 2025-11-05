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
};
