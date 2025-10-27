import { useUser } from '@clerk/clerk-react';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Loader2 } from 'lucide-react';

const RootComponent = () => {
  const { isLoaded } = useUser();

  // Check if we're in demo mode (no real Clerk key)
  const isDemoMode = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === undefined || 
                     import.meta.env.VITE_CLERK_PUBLISHABLE_KEY === 'pk_test_demo_key_for_development';
  
  // Show loading spinner while checking auth status (but skip in demo mode)
  if (!isLoaded && !isDemoMode) {
    return (
      <div className="w-screen min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="fluent-body text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* All routes render here - both public and protected */}
      <Outlet />

      {/* TanStack Router DevTools - only in development */}
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
