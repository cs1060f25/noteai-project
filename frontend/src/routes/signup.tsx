import { useUser } from '@clerk/clerk-react';
import { Link, Navigate, createFileRoute } from '@tanstack/react-router';

import { CustomAuthForm } from '@/components/CustomAuthForm';

const SignupPage = () => {
  const { isSignedIn, isLoaded } = useUser();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="w-screen min-h-screen bg-background2 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="fluent-title text-3xl text-foreground mb-2">Create your account</h1>
          <p className="fluent-body text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
        <CustomAuthForm initialMode="signup" />
      </div>
    </div>
  );
};

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});
