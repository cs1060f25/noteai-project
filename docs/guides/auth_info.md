# Authentication & Authorization Implementation Plan

## Overview

Add Google One Tap and OAuth 2.0 authentication with JWT-based authorization to secure the NoteAI application.

## Tech Stack Selection

### Backend

- FastAPI OAuth2 with JWT tokens (python-jose, passlib)
- Google OAuth 2.0 for authentication (google-auth, google-auth-oauthlib)
- SQLAlchemy User model to link users to their jobs
- Dependency injection for route protection

### Frontend

- @react-oauth/google for Google One Tap + OAuth button
- React Context API for auth state management
- Protected routes with authentication guards
- Automatic token refresh logic

## Database Changes

### New Tables

1. **users** table
   - id (primary key)
   - user_id (UUID, unique)
   - email (unique, indexed)
   - name
   - picture_url
   - google_id (unique, indexed)
   - is_active, is_verified
   - created_at, updated_at, last_login_at

2. **Modify jobs table**
   - Add user_id foreign key
   - Add database migration

## Backend Implementation

### 1. New Files

- `backend/app/models/user.py` - User database model
- `backend/app/core/auth.py` - JWT creation, verification, OAuth helpers
- `backend/app/api/routes/auth.py` - Auth endpoints (login, callback, refresh, logout, me)
- `backend/app/api/dependencies/auth.py` - get_current_user dependency
- `backend/app/schemas/user.py` - User Pydantic models

### 2. Auth Endpoints

- `POST /api/v1/auth/google` - Exchange Google token for JWT
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - Logout (optional, frontend handles)

### 3. Protected Routes

- Modify existing routes (/upload, /jobs, /results) to require authentication
- Use FastAPI dependency injection: current_user: User = Depends(get_current_user)
- Filter queries by user: jobs = db.query(Job).filter(Job.user_id == current_user.user_id)

### 4. Settings Updates

Add to `backend/app/core/settings.py`:
- google_client_id
- google_client_secret
- jwt_secret_key
- jwt_algorithm (HS256)
- access_token_expire_minutes (60)
- refresh_token_expire_days (30)

### 5. Dependencies

Add to `pyproject.toml`:
- python-jose[cryptography]
- passlib[bcrypt]
- google-auth
- google-auth-oauthlib

## Frontend Implementation

### 1. New Files

- `frontend/src/contexts/AuthContext.tsx` - Auth state management
- `frontend/src/components/GoogleOneTap.tsx` - Google One Tap component
- `frontend/src/components/LoginPage.tsx` - Login page with Google button
- `frontend/src/components/ProtectedRoute.tsx` - Route guard component
- `frontend/src/services/authService.ts` - Auth API calls
- `frontend/src/hooks/useAuth.ts` - Auth hook

### 2. Google OAuth Setup

- Install @react-oauth/google
- Wrap app with GoogleOAuthProvider clientId="..."
- Implement Google One Tap on landing page
- Implement Google Sign-In button as fallback

### 3. Auth Flow

1. User clicks Google sign-in or One Tap appears
2. Google returns credential (JWT ID token)
3. Send to backend /api/v1/auth/google
4. Backend verifies with Google, creates/updates user, returns JWT
5. Frontend stores JWT in localStorage
6. API client includes JWT in Authorization header
7. Protected routes check for valid JWT

### 4. UI Updates

- Add user profile dropdown in header
- Show user avatar and name
- Add logout button
- Redirect unauthenticated users to login page
- Show loading states during auth checks

### 5. Dependencies

Add to `frontend/package.json`:
- @react-oauth/google

## Database Migration

### Alembic Migration Steps

1. Create migration: `alembic revision --autogenerate -m "add_users_table_and_auth"`
2. Review and edit migration file
3. Run migration: `alembic upgrade head`

## Configuration

### Google Cloud Console Setup

1. Create OAuth 2.0 Client ID
2. Add authorized JavaScript origins (http://localhost:5173, production URL)
3. Add authorized redirect URIs
4. Copy Client ID and Client Secret

### Environment Variables

**Backend (.env):**
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
JWT_SECRET_KEY=generate-random-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
```

**Frontend (.env):**
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Security Considerations

- HTTPS required for production
- CORS properly configured
- JWT secret must be strong and secret
- Implement rate limiting on auth endpoints
- Add CSRF protection for cookie-based refresh tokens (optional)
- Validate Google tokens on backend (never trust frontend)

## Testing Plan

1. Unit tests for auth utilities (JWT creation/verification)
2. Integration tests for auth endpoints
3. E2E tests for login flow
4. Test token expiration and refresh
5. Test unauthorized access to protected routes

## Rollout Strategy

1. Implement backend models and migrations
2. Implement backend auth endpoints (test with Postman)
3. Implement frontend auth context and services
4. Add Google OAuth to frontend
5. Protect existing routes
6. Add UI polish (profile dropdown, etc.)
7. Test thoroughly
8. Deploy with proper environment variables

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Install dependencies (python-jose, google-auth, etc.)
- [ ] Create User model (app/models/user.py)
- [ ] Create Pydantic schemas (app/schemas/user.py)
- [ ] Implement JWT utilities (app/core/auth.py)
- [ ] Add Google OAuth settings to settings.py
- [ ] Create database migration
- [ ] Run migration

### Phase 2: Backend Auth Routes
- [ ] Create auth routes file (app/api/routes/auth.py)
- [ ] Implement POST /auth/google endpoint
- [ ] Implement POST /auth/refresh endpoint
- [ ] Implement GET /auth/me endpoint
- [ ] Create auth dependency (get_current_user)
- [ ] Test endpoints with Postman

### Phase 3: Protect Existing Routes
- [ ] Add user relationship to Job model
- [ ] Update upload route to require auth
- [ ] Update jobs route to filter by user
- [ ] Update results route to filter by user
- [ ] Update videos route to filter by user
- [ ] Test protected routes

### Phase 4: Frontend Foundation
- [ ] Install @react-oauth/google
- [ ] Create TypeScript types for auth
- [ ] Create AuthContext
- [ ] Create auth service
- [ ] Wrap app with GoogleOAuthProvider
- [ ] Wrap app with AuthProvider

### Phase 5: Frontend UI Components
- [ ] Create LoginPage component
- [ ] Create GoogleOneTap component
- [ ] Create ProtectedRoute component
- [ ] Create UserProfile dropdown component
- [ ] Update App.tsx with auth UI

### Phase 6: Integration & Polish
- [ ] Add Google One Tap to main page
- [ ] Implement auto token refresh logic
- [ ] Add loading states during auth
- [ ] Handle auth errors gracefully
- [ ] Add user profile in header
- [ ] Implement logout functionality
- [ ] Test complete flow end-to-end

### Phase 7: Testing
- [ ] Write backend unit tests
- [ ] Write frontend unit tests
- [ ] Perform manual E2E testing
- [ ] Test token expiration
- [ ] Test refresh flow
- [ ] Test error cases

### Phase 8: Deployment
- [ ] Set up Google Cloud OAuth credentials
- [ ] Configure production environment variables
- [ ] Deploy backend with new migrations
- [ ] Deploy frontend with Google Client ID
- [ ] Test production auth flow
- [ ] Monitor logs for auth issues

## Additional Notes

### Key Files to Create/Modify

**Backend:**
- NEW: app/models/user.py
- NEW: app/schemas/user.py
- NEW: app/core/auth.py
- NEW: app/api/routes/auth.py
- NEW: app/api/dependencies/auth.py
- MODIFY: app/core/settings.py
- MODIFY: app/models/database.py (add User import and relationship)
- MODIFY: app/api/routes/upload.py (add auth dependency)
- MODIFY: app/api/routes/jobs.py (add auth dependency)
- MODIFY: app/api/routes/results.py (add auth dependency)
- MODIFY: app/api/routes/videos.py (add auth dependency)

**Frontend:**
- NEW: src/contexts/AuthContext.tsx
- NEW: src/components/GoogleOneTap.tsx
- NEW: src/components/LoginPage.tsx
- NEW: src/components/ProtectedRoute.tsx
- NEW: src/components/UserProfile.tsx
- NEW: src/services/authService.ts
- NEW: src/hooks/useAuth.ts
- NEW: src/types/auth.ts
- MODIFY: src/main.tsx (add providers)
- MODIFY: src/App.tsx (add auth UI)
- MODIFY: src/lib/api.ts (already has token handling)

### JWT Token Structure

Access Token Payload:
- sub: user_id
- email: user email
- exp: expiration timestamp
- iat: issued at timestamp
- type: "access"

Refresh Token Payload:
- sub: user_id
- exp: expiration timestamp
- iat: issued at timestamp
- type: "refresh"

### Error Handling

Auth errors to handle:
- 401 Unauthorized - Invalid/expired token
- 403 Forbidden - Valid token but insufficient permissions
- 400 Bad Request - Invalid Google credential
- 500 Server Error - Token generation/verification failed

### Performance Considerations

- Cache user data in AuthContext to avoid repeated API calls
- Implement token refresh 5 minutes before expiration
- Use React.memo for auth-dependent components
- Consider using httpOnly cookies instead of localStorage for better security (optional enhancement)

### Future Enhancements

- Add email/password authentication as alternative to Google
- Implement 2FA/MFA
- Add role-based access control (RBAC)
- Implement token blacklisting for logout
- Add session management and device tracking
- Implement "remember me" functionality
- Add social auth providers (GitHub, Microsoft, etc.)
