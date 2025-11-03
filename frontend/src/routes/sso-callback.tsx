import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';

const SSOCallbackComponent = () => {
  return (
    <div className="w-screen min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="fluent-body text-muted-foreground">
          Completing sign in...
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
};

export const Route = createFileRoute('/sso-callback')({
  component: SSOCallbackComponent,
});
