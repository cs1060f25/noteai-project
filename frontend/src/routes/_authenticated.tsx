import { useEffect } from 'react';

import { useUser } from '@clerk/clerk-react';
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router';

import { CustomUserProfile } from '@/components/CustomUserProfile';
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
        {/* Header */}
        <header className="fluent-layer-1 border-b border-border p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="fluent-title text-3xl text-foreground">NoteAI Dashboard</h1>
              <p className="fluent-caption mt-1">
                Manage your lecture videos and generate highlight clips with subtitles
              </p>
            </div>
            <CustomUserProfile />
          </div>
        </header>

        {/* Content Area - Protected routes render here */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
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
