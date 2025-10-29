import { useUser } from '@clerk/clerk-react';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootComponent = () => {
  const { isLoaded } = useUser();
  
  console.log('🔍 Root Component - Clerk integrated, isLoaded:', isLoaded);
  
  // Don't block on Clerk loading for demo purposes
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
