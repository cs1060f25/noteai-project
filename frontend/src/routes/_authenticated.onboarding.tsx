import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { OnboardingPage } from '@/components/OnboardingPage';

function OnboardingRoute() {
  const navigate = useNavigate();

  const handleComplete = () => {
    // Navigate to dashboard after completing onboarding
    navigate({ to: '/dashboard' });
  };

  const handleSkip = () => {
    // Allow users to skip onboarding and explore the app
    navigate({ to: '/dashboard' });
  };

  return <OnboardingPage onComplete={handleComplete} onSkip={handleSkip} />;
}

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingRoute,
});
