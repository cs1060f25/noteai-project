import { useState } from 'react';

import { AuthForm } from '@/components/auth/AuthForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { VerificationForm } from '@/components/auth/VerificationForm';
import { useAuth } from '@/hooks/useAuth';
import type { AuthMode } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface CustomAuthFormProps extends React.ComponentProps<'div'> {
  initialMode?: AuthMode;
}

export const CustomAuthForm = ({ className, initialMode = 'signin' }: CustomAuthFormProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);

  const {
    loading,
    error,
    setError,
    handleSignIn,
    handleSignUp,
    handleVerifyEmail,
    handleOAuthSignIn,
  } = useAuth();

  const onAuthSubmit = async (
    emailValue: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    setEmail(emailValue);
    try {
      if (mode === 'signin') {
        await handleSignIn(emailValue, password);
      } else {
        await handleSignUp(emailValue, password, firstName || '', lastName || '');
        setPendingVerification(true);
      }
    } catch {
      // Error is already handled in the hook
    }
  };

  const onVerify = async (code: string) => {
    try {
      await handleVerifyEmail(code);
    } catch {
      // Error is already handled in the hook
    }
  };

  const onModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
  };

  const onBack = () => {
    setPendingVerification(false);
    setError(null);
  };

  if (pendingVerification) {
    return <VerificationForm email={email} onVerify={onVerify} onBack={onBack} error={error} />;
  }

  return (
    <AuthLayout className={cn(className, 'w-full')}>
      <AuthForm
        mode={mode}
        onModeChange={onModeChange}
        onSubmit={onAuthSubmit}
        onOAuthSignIn={handleOAuthSignIn}
        loading={loading}
        error={error}
      />
    </AuthLayout>
  );
};
