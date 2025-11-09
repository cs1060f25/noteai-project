import React from 'react';

import { AlertCircle, Shield } from 'lucide-react';

import { useRole } from '@/hooks/useRole';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, isLoading } = useRole();

  // Show loading state while checking role
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card rounded-xl border border-border/50 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Verifying Access</h2>
              <p className="text-sm text-muted-foreground">Checking your permissions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="glass-card rounded-xl border border-destructive/30 bg-destructive/5 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have permission to access this page. Admin privileges are required.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render children if admin
  return <>{children}</>;
};
