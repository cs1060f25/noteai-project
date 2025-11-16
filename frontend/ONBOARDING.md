# Onboarding Flow

## Overview

The onboarding flow helps users set up their Gemini API key. It's **optional** - users can skip and explore the app, but certain features (like video upload) require an API key.

## How It Works

1. **User signs up/logs in** via Clerk authentication
2. **Optional onboarding**: Users can navigate to `/onboarding` to set up their API key
3. **Multi-step process**:
   - Step 1: Instructions on how to get a Gemini API key
   - Step 2: Input and validate the API key
4. **Skip option**: Users can click "Skip for now" to explore the app without setting up the API key
5. **Feature protection**: Pages that require the API key (e.g., `/upload`) show a warning banner if no key is set

## Key Files

- [`OnboardingPage.tsx`](src/components/OnboardingPage.tsx) - The onboarding UI component with skip option
- [`ApiKeyWarningBanner.tsx`](src/components/ApiKeyWarningBanner.tsx) - Warning banner shown on protected pages
- [`_authenticated.onboarding.tsx`](src/routes/_authenticated.onboarding.tsx) - The onboarding route
- [`_authenticated.upload.tsx`](src/routes/_authenticated.upload.tsx) - Upload page with API key protection
- [`lib/onboarding.ts`](src/lib/onboarding.ts) - Utility functions for managing onboarding state

## Testing the Onboarding Flow

### To test without an API key:
1. Clear localStorage: Open DevTools → Console → Run:
   ```javascript
   localStorage.removeItem('gemini_api_key')
   ```
2. Navigate to `/upload`
3. You'll see a warning banner prompting you to set up your API key
4. Click "Set Up API Key" to go to onboarding, or click "Skip for now" to dismiss

### To test with an API key:
```javascript
// In browser console
localStorage.setItem('gemini_api_key', 'AIzaSyDummyKeyForTesting')
```
Then visit `/upload` - the banner will not appear.

### Testing the Skip Button:
1. Navigate to `/onboarding`
2. Click "Skip for now" at the bottom
3. You'll be redirected to the dashboard without setting up the API key

## Future Enhancements

- [ ] Store API key in backend instead of localStorage
- [ ] Add actual Gemini API validation (test the key works)
- [ ] Allow users to update/change their API key from settings
- [ ] Add option to skip onboarding temporarily
- [ ] Encrypted storage for API keys
