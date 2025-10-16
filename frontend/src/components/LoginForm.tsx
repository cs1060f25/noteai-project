import { useState } from 'react';

import { GoogleLogin, GoogleOAuthProvider, useGoogleOneTapLogin } from '@react-oauth/google';
import { Video, Loader2 } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginContent = ({ onSuccess }: LoginFormProps) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialResponse = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Failed to get credential from Google');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(credentialResponse.credential);
      onSuccess?.();
    } catch (err) {
      console.error('Login failed:', err);
      setError('Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google One Tap - automatically shows popup
  useGoogleOneTapLogin({
    onSuccess: handleCredentialResponse,
    onError: () => {
      console.log('One Tap Login Failed');
    },
  });

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 fluent-layer-2 rounded-2xl border border-border fluent-reveal">
      {/* header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 fluent-shadow">
          <Video className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="fluent-title text-2xl text-foreground mb-2">Welcome to NoteAI</h1>
        <p className="fluent-body text-muted-foreground">
          Transform your lecture videos into highlight clips
        </p>
      </div>

      {/* google login button */}
      <div className="space-y-4">
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="fluent-body text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="fluent-body">Signing in...</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleCredentialResponse}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          )}
        </div>

        <div className="text-center">
          <p className="fluent-caption text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="w-full max-w-md mx-auto p-8 fluent-layer-2 rounded-2xl border border-border">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Video className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="fluent-subtitle text-xl text-foreground mb-2">Configuration Error</h2>
          <p className="fluent-body text-muted-foreground mb-4">
            Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.
          </p>
          <div className="bg-accent p-4 rounded-lg text-left">
            <p className="fluent-caption text-xs mb-2">To fix this:</p>
            <ol className="fluent-caption text-xs space-y-1 list-decimal list-inside">
              <li>
                Add your Google Client ID to{' '}
                <code className="bg-background px-1 py-0.5 rounded">.env</code>
              </li>
              <li>
                Get your Client ID from{' '}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginContent onSuccess={onSuccess} />
    </GoogleOAuthProvider>
  );
};
