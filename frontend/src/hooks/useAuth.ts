import { useState } from 'react';

import { useSignIn, useSignUp } from '@clerk/clerk-react';

export type AuthMode = 'signin' | 'signup';

export const useAuth = () => {
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (email: string, password: string) => {
    if (!signIn) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId });
      }
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Failed to sign in. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    if (!signUp) return;

    setLoading(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Failed to sign up. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (code: string) => {
    if (!signUp) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId });
      }
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Invalid verification code. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'oauth_google' | 'oauth_github') => {
    if (!signIn) return;

    setLoading(true);
    setError(null);

    try {
      await signIn.authenticateWithRedirect({
        strategy: provider,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Failed to sign in with OAuth.');
      setLoading(false);
    }
  };

  const sendPasswordResetCode = async (email: string) => {
    if (!signIn) return;

    setLoading(true);
    setError(null);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
    } catch (err) {
      // For security, do not reveal if the account exists or not.
      // We treat it as a success so the UI proceeds to the verification step.
      console.error('Password reset request failed (suppressed for security):', err);
      // Do NOT set error
      // Do NOT throw
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (code: string, password: string) => {
    if (!signIn) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId });
      }
    } catch (err) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error.errors?.[0]?.message || 'Failed to reset password. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    handleSignIn,
    handleSignUp,
    handleVerifyEmail,
    handleOAuthSignIn,
    sendPasswordResetCode,
    resetPassword,
  };
};
