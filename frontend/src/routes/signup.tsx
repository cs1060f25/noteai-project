import { useState } from 'react';

import { useUser } from '@clerk/clerk-react';
import { Navigate, createFileRoute } from '@tanstack/react-router';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { VerificationForm } from '@/components/auth/VerificationForm';
import { useAuth } from '@/hooks/useAuth';

const SignupPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [email, setEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const { loading, error, setError, handleSignUp, handleVerifyEmail, handleOAuthSignIn } =
    useAuth();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  const onSignUpSubmit = async (
    emailValue: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setEmail(emailValue);
    try {
      await handleSignUp(emailValue, password, firstName, lastName);
      setPendingVerification(true);
    } catch {
      // error is already handled in the hook
    }
  };

  const onVerify = async (code: string) => {
    try {
      await handleVerifyEmail(code);
    } catch {
      // error is already handled in the hook
    }
  };

  const onBack = () => {
    setPendingVerification(false);
    setError(null);
  };

  if (pendingVerification) {
    return <VerificationForm email={email} onVerify={onVerify} onBack={onBack} error={error} />;
  }

  return (
    <>
      <SignUpForm
        onSubmit={onSignUpSubmit}
        onOAuthSignIn={handleOAuthSignIn}
        loading={loading}
        error={error}
      />
    </>
  );
};

export const Route = createFileRoute('/signup')({
  component: SignupPage,
});
