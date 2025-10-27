import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootComponent = () => {
  // Simple root component for demo - no Clerk dependency
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
