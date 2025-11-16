import { useEffect } from 'react';

import { useUser, useClerk } from '@clerk/clerk-react';
import { Outlet, createFileRoute, useNavigate, useLocation } from '@tanstack/react-router';

import { DashboardSidebar } from '@/components/DashboardSidebar';

const AuthenticatedLayout = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // redirect to login if not authenticated
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/login' });
      return;
    }

    // redirect to onboarding if user hasn't completed it
    if (isLoaded && isSignedIn && user) {
      const hasCompletedOnboarding = user.unsafeMetadata?.hasCompletedOnboarding;

      // only redirect if not already on onboarding page
      if (!hasCompletedOnboarding && location.pathname !== '/onboarding') {
        navigate({ to: '/onboarding' });
      }
    }
  }, [isSignedIn, isLoaded, navigate, user, location.pathname]);

  // don't render protected content until auth is checked
  if (!isLoaded || !isSignedIn || !user) {
    return null;
  }

  const handleLogout = () => {
    signOut();
    navigate({ to: '/login' });
  };

  // check if user is on onboarding page - hide sidebar for full-screen experience
  const isOnboardingPage = location.pathname === '/onboarding';

  if (isOnboardingPage) {
    // full-screen onboarding without sidebar
    return <Outlet />;
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar user={user} onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden lg:mt-0 mt-16">
        <div className="h-full overflow-auto">
          <div className="px-4 pt-8 pb-4">
            <div className="max-w-8xl mx-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});
