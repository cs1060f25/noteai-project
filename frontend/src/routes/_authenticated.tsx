import { useEffect } from 'react';

import { useUser } from '@clerk/clerk-react';
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router';

import { Sidebar } from '@/components/Sidebar';

const AuthenticatedLayout = () => {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // redirect to login if not authenticated
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/login' });
    }
  }, [isSignedIn, isLoaded, navigate]);

  // don't render protected content until auth is checked
  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="w-screen min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Content Area - Protected routes render here */}
        <div className="flex-1 px-4 pt-8 pb-4 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});
