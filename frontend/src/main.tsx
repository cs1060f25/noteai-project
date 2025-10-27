import { StrictMode, useEffect } from 'react';

import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';

import './index.css';
import { setClerkSessionTokenGetter } from './lib/clerk-api';
import { router } from './router';
import { ThemeProvider } from './contexts/ThemeContext';

// import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

// wrapper component to set up clerk api integration
// eslint-disable-next-line react-refresh/only-export-components
const ClerkApiSetup = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();

  useEffect(() => {
    // set up the session token getter for the api client
    setClerkSessionTokenGetter(() => getToken());
  }, [getToken]);

  return <>{children}</>;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ClerkApiSetup>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </ClerkApiSetup>
    </ClerkProvider>
  </StrictMode>
);
