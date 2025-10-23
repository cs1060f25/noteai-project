import { GoogleOneTap, useUser } from '@clerk/clerk-react';
import { Navigate, createFileRoute } from '@tanstack/react-router';

import { CustomAuthForm } from '@/components/CustomAuthForm';

const LoginPage = () => {
  const { isSignedIn, isLoaded } = useUser();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <>
      <GoogleOneTap />
      <div className="w-screen min-h-screen bg-background2 flex items-center justify-center">
        <CustomAuthForm />
      </div>
    </>
  );
};

export const Route = createFileRoute('/login')({
  component: LoginPage,
});
