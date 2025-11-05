import { useState } from 'react';

import { GoogleOneTap, useUser } from '@clerk/clerk-react';
import { Navigate, createFileRoute } from '@tanstack/react-router';

import { LoginForm } from '@/components/auth/LoginForm';
import { VerificationForm } from '@/components/auth/VerificationForm';
import { useAuth } from '@/hooks/useAuth';

const LoginPage = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [email, setEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const { loading, error, setError, handleSignIn, handleVerifyEmail, handleOAuthSignIn } =
    useAuth();

  // redirect to dashboard if already signed in
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  const onLoginSubmit = async (emailValue: string, password: string) => {
    setEmail(emailValue);
    try {
      await handleSignIn(emailValue, password);
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
      <GoogleOneTap />
      <LoginForm
        onSubmit={onLoginSubmit}
        onOAuthSignIn={handleOAuthSignIn}
        loading={loading}
        error={error}
      />
    </>
  );
};

export const Route = createFileRoute('/login')({
  component: LoginPage,
});
