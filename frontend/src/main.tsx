import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { RouterProvider } from '@tanstack/react-router';
import './index.css';
import { router } from './router';

// Use a valid demo key that won't cause loading issues
const PUBLISHABLE_KEY = 'pk_test_Y2xlcmsuaW5jbHVkZWQua2l0dGVuLTkyLmxjbGNsZXJrLmFjY291bnRzLmRldiQ';

console.log('🔑 Using demo Clerk key for navigation compatibility');

// Simple wrapper without the complex auth setup that was causing issues
createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <RouterProvider router={router} />
  </ClerkProvider>
);
