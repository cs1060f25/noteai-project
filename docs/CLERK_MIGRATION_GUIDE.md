# Clerk Authentication Migration Guide

## Overview

This guide documents the migration from manual Google OAuth + JWT authentication to **Clerk** for the AI Lecture Highlight Extractor project.

### Why Clerk?

✅ **Free Tier**: 10,000 MAU/month (perfect for course projects)
✅ **Google OAuth**: Native support
✅ **GitHub OAuth**: Native support
✅ **Google OneTap**: Built-in component for seamless sign-in
✅ **Developer Experience**: Simple integration with React/Vite and FastAPI
✅ **Modern Stack**: Built for modern web applications

### Comparison: Clerk vs Auth0

| Feature | Clerk | Auth0 |
|---------|-------|-------|
| Free Tier MAU | 10,000 | 25,000 (but limited features) |
| Google OneTap | ✅ Native | ❌ Requires custom implementation |
| Pricing (Paid) | $25/month | $35-240/month |
| Developer Experience | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Modern Stack Support | ✅ | ✅ |

---

## 1. Clerk Account Setup

### Step 1: Create Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application
4. Name it: "Lecture Highlight Extractor" (or your project name)

### Step 2: Configure OAuth Providers

#### Google OAuth

1. In Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Enable **Google**
3. For Development:
   - Clerk provides shared credentials (no setup needed)
4. For Production:
   - Create Google OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add authorized redirect URI: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
   - Add Client ID and Client Secret in Clerk Dashboard

#### GitHub OAuth

1. In Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Enable **GitHub**
3. For Development:
   - Clerk provides shared credentials
4. For Production:
   - Create OAuth App in [GitHub Settings](https://github.com/settings/developers)
   - Authorization callback URL: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
   - Add Client ID and Client Secret in Clerk Dashboard

#### Google OneTap

1. In Clerk Dashboard → **User & Authentication** → **Social Connections** → **Google**
2. Enable "Google One Tap"
3. Configure in your application (already implemented in this migration)

### Step 3: Get API Keys

1. In Clerk Dashboard → **API Keys**
2. Copy:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

---

## 2. Environment Variables

### Backend (.env)

Create `/backend/.env`:

```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Legacy OAuth (can be removed after migration)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Legacy JWT (can be removed after migration)
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

### Frontend (.env)

Create `/frontend/.env`:

```bash
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# API URL
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 3. Database Migration

### Run Migration

```bash
cd backend
alembic upgrade head
```

This migration:
- Adds `clerk_user_id` column to `users` table
- Makes `google_id` nullable (for backward compatibility)
- Creates unique index on `clerk_user_id`

### Migration File

Location: `/backend/alembic/versions/c5a9cfc92207_add_clerk_user_id_to_users.py`

---

## 4. Backend Integration

### Files Created/Modified

#### New Files:
- `/backend/app/core/clerk_auth.py` - Clerk JWT verification utilities
- `/backend/app/api/dependencies/clerk_auth.py` - FastAPI auth dependencies

#### Modified Files:
- `/backend/app/core/settings.py` - Added Clerk configuration
- `/backend/app/models/user.py` - Added `clerk_user_id` field
- `/backend/pyproject.toml` - Added `clerk-backend-api` dependency

### Using Clerk Authentication in Routes

```python
from app.api.dependencies.clerk_auth import get_current_user_clerk

@router.get("/protected-route")
async def protected_route(current_user: User = Depends(get_current_user_clerk)):
    return {"user_id": current_user.user_id, "email": current_user.email}
```

### Key Features:
- **Automatic User Creation**: First-time Clerk users are automatically created in database
- **Session Token Verification**: Verifies Clerk JWT tokens via JWKS
- **Error Handling**: Proper handling of expired/invalid tokens

---

## 5. Frontend Integration

### Files Created/Modified

#### New Files:
- `/frontend/src/lib/clerk-api.ts` - API client with Clerk token injection

#### Modified Files:
- `/frontend/src/main.tsx` - Wrapped app with `ClerkProvider`
- `/frontend/src/App.tsx` - Replaced manual auth with Clerk components
- `/frontend/src/components/UserProfile.tsx` - Using Clerk's `UserButton`
- `/frontend/package.json` - Added `@clerk/clerk-react` dependency

### Key Components

#### Google OneTap (Already Implemented)

```tsx
import { GoogleOneTap } from '@clerk/clerk-react';

<GoogleOneTap />
```

#### Sign In UI

```tsx
import { SignIn } from '@clerk/clerk-react';

<SignIn routing="hash" />
```

#### User Button

```tsx
import { UserButton } from '@clerk/clerk-react';

<UserButton showName />
```

#### Protected Content

```tsx
import { SignedIn, SignedOut } from '@clerk/clerk-react';

<SignedIn>
  <ProtectedComponent />
</SignedIn>

<SignedOut>
  <PublicComponent />
</SignedOut>
```

---

## 6. API Client Integration

The new Clerk API client (`clerk-api.ts`) automatically:
1. Retrieves Clerk session token
2. Injects it in `Authorization: Bearer <token>` header
3. Handles token refresh automatically via Clerk

### Usage

```tsx
import { apiClient } from './lib/clerk-api';

// API calls automatically include Clerk session token
const data = await apiClient.get('/jobs');
const result = await apiClient.post('/upload', { file: videoFile });
```

---

## 7. Testing Authentication

### Test Google OAuth

1. Start backend: `cd backend && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Click "Continue with Google"
4. Verify user is created in database with `clerk_user_id`

### Test GitHub OAuth

1. Navigate to sign-in page
2. Click "Continue with GitHub"
3. Authorize application
4. Verify authentication works

### Test Google OneTap

1. Load the application
2. OneTap should appear automatically (if you're logged into Google)
3. Click your account
4. Should sign in seamlessly

---

## 8. Cleanup Tasks (Post-Migration)

### Backend Cleanup
- [ ] Remove `/backend/app/api/routes/auth.py` (old Google OAuth routes)
- [ ] Remove Google OAuth dependencies from `pyproject.toml`
- [ ] Remove JWT utilities from `/backend/app/core/auth.py`
- [ ] Remove `/backend/app/api/dependencies/auth.py` (old auth dependency)

### Frontend Cleanup
- [ ] Remove `/frontend/src/contexts/AuthContext.tsx`
- [ ] Remove `/frontend/src/components/LoginForm.tsx`
- [ ] Remove `@react-oauth/google` from `package.json`
- [ ] Remove `/frontend/src/lib/api.ts` (old API client)
- [ ] Update all imports to use `clerk-api.ts` instead

### Database Cleanup (Optional)
- [ ] After all users migrated, can remove `google_id` column
- [ ] Remove old JWT token logic

---

## 9. Production Deployment

### Before Deploying

1. ✅ Set up production OAuth credentials in Clerk Dashboard
2. ✅ Update environment variables with production Clerk keys
3. ✅ Configure allowed origins in Clerk Dashboard
4. ✅ Test authentication flow in production environment
5. ✅ Run database migration: `alembic upgrade head`

### Clerk Dashboard Configuration

1. **Allowed Origins**: Add your production domain
2. **Session Settings**: Configure session lifetime
3. **Email/SMS Settings**: Configure email templates
4. **Security**: Enable MFA if needed

---

## 10. Troubleshooting

### Common Issues

#### "Token verification failed"
- Check Clerk secret key is correct
- Verify JWKS endpoint is accessible
- Check server time is synchronized

#### "User not found"
- Ensure database migration ran successfully
- Check `clerk_user_id` is being saved properly
- Verify user creation logic in `clerk_auth.py`

#### Google OneTap not showing
- Check Clerk Publishable Key is correct
- Verify Google OneTap is enabled in Clerk Dashboard
- Check browser console for errors

#### CORS errors
- Add frontend origin to Clerk Dashboard allowed origins
- Check FastAPI CORS settings include Clerk domains

---

## 11. Security Best Practices

✅ **Never commit API keys** - Use environment variables
✅ **Use HTTPS in production** - Required for OAuth
✅ **Configure CORS properly** - Only allow trusted origins
✅ **Monitor auth logs** - Check Clerk Dashboard for suspicious activity
✅ **Use rate limiting** - Already implemented in backend
✅ **Keep dependencies updated** - Regularly update Clerk SDK

---

## 12. Support & Resources

- **Clerk Documentation**: https://clerk.com/docs
- **React Quickstart**: https://clerk.com/docs/quickstarts/react
- **FastAPI Integration**: Custom implementation (see `clerk_auth.py`)
- **Community Discord**: https://clerk.com/discord

---

## Summary

This migration successfully replaces manual Google OAuth + JWT with **Clerk**, providing:

✅ Simpler authentication flow
✅ Google OneTap for improved UX
✅ GitHub OAuth support
✅ Better developer experience
✅ Free tier perfect for course projects
✅ Production-ready security

**Estimated Time Savings**: ~70% less authentication code to maintain!
