import { useUser } from '@clerk/clerk-react';

import type { UserRole } from '../types/api';

interface UseRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  isLoading: boolean;
}

export const useRole = (): UseRoleReturn => {
  const { user, isLoaded } = useUser();

  // Extract role from Clerk public metadata
  const role = (user?.publicMetadata?.role as UserRole) || null;

  // Check if user is admin
  const isAdmin = role === 'admin';

  // Loading state - true if Clerk user data hasn't loaded yet
  const isLoading = !isLoaded;

  return {
    role,
    isAdmin,
    isLoading,
  };
};
