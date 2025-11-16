# Role-Based Access Control (RBAC) Implementation

## Overview

The backend now supports role-based access control with two roles: `user` and `admin`. Admin users have elevated permissions to access all jobs, view system metrics, and manage users.

## User Roles

- **user** (default): Standard access to own jobs and results
- **admin**: Full system access including all jobs, users, and metrics

## Backend Changes

### Database

- Added `role` column to `users` table (enum: 'user', 'admin')
- Migration: `5262ba4a3e83_add_user_role_and_audit_log.py`

### Authorization

All protected endpoints now check user role:
- Regular users can only access their own jobs/results
- Admin users can access ANY job/result by job_id

### New Admin Endpoints

All require admin role and are prefixed with `/api/v1/admin`:

1. **GET /api/v1/admin/jobs** - List all jobs across users
   - Query params: `limit`, `offset`, `status`, `user_id`

2. **GET /api/v1/admin/users** - List all users
   - Query params: `limit`, `offset`, `search`

3. **GET /api/v1/admin/metrics** - System-wide statistics
   - Returns: user counts, job counts by status, storage usage, activity metrics

4. **GET /api/v1/admin/processing-logs** - All pipeline logs
   - Query params: `limit`, `offset`, `job_id`, `stage`

### Admin-Only Agent Output Endpoints

All agent output endpoints require admin role:

- **GET /api/v1/jobs/{job_id}/transcripts** - Get transcript segments
- **GET /api/v1/jobs/{job_id}/silence-regions** - Get silence regions
- **GET /api/v1/jobs/{job_id}/content-segments** - Get content segments
- **GET /api/v1/jobs/{job_id}/clips** - Get extracted clips

## Frontend Integration

### Setting Admin Role in Clerk

To make a user an admin:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users
2. Select the user
3. Navigate to "Metadata" tab → "Public metadata"
4. Add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
5. Save changes
6. User will receive admin role on next login

### User Response Schema

The user object now includes a `role` field:

```typescript
interface User {
  user_id: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';  // NEW FIELD
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  // ... other fields
}
```

### Checking User Role in Frontend

```typescript
// Get current user from your auth context
const currentUser = useUser(); // or however you fetch user data

// Check if user is admin
const isAdmin = currentUser?.role === 'admin';

// Conditionally render admin UI
{isAdmin && (
  <AdminDashboard />
)}
```

### Calling Admin Endpoints

```typescript
// Example: Fetch system metrics (admin only)
const response = await fetch('/api/v1/admin/metrics', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
  },
});

if (response.status === 403) {
  // User is not admin
  console.error('Admin access required');
}

const metrics = await response.json();
```

### Error Handling

Admin endpoints return `403 Forbidden` if accessed by non-admin users:

```json
{
  "error": {
    "code": "ADMIN_ACCESS_REQUIRED",
    "message": "Admin access required for this endpoint"
  }
}
```

Handle this in your frontend to show appropriate error messages or redirect to home page.

## Security Notes

- All new users default to `user` role
- Admin role can only be set via Clerk metadata or direct database access
- Role syncs from Clerk on every login for real-time updates
