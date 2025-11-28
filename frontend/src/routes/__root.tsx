import { useUser } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Loader2 } from 'lucide-react';
import { RootLayout } from '../components/RootLayout';

const queryClient = new QueryClient();

const RootComponent = () => {
  const { isLoaded } = useUser();

  // show loading spinner while checking auth status
  if (!isLoaded) {
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
    <QueryClientProvider client={queryClient}>
      <RootLayout>
        {/* All routes render here - both public and protected */}
        <Outlet />
      </RootLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </QueryClientProvider>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
