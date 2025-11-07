# Admin Dashboard Testing Guide

This guide provides comprehensive testing procedures for the Role-Based Access Control (RBAC) implementation and admin dashboard features.

## Prerequisites

Before testing, ensure you have:

1. **Backend running** on `http://localhost:8000`
2. **Frontend running** on `http://localhost:5173`
3. **Clerk account** with at least 2 test users:
   - One regular user (no admin role)
   - One admin user (with admin role set in Clerk)

## Setting Up Test Users

### Creating an Admin User

1. Log into [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users**
3. Select a user or create a new one
4. Click on the user to view details
5. Scroll to **Metadata** section
6. Under **Public metadata**, add:
   ```json
   {
     "role": "admin"
   }
   ```
7. Save changes
8. Have the user log out and log back in for changes to take effect

### Creating a Regular User

- Simply create a user without adding the `role` metadata
- Default role will be `"user"`

---

## Test Suite

### Test 1: Role Detection

**Purpose:** Verify that the `useRole` hook correctly identifies user roles.

**Test Steps:**

1. **As Admin User:**
   - Log in with admin credentials
   - Open browser console
   - The Clerk user object should show `publicMetadata: { role: "admin" }`
   - Verify no console errors

2. **As Regular User:**
   - Log in with non-admin credentials
   - Check browser console
   - The Clerk user object should NOT have admin role in metadata
   - Verify no console errors

**Expected Results:**
- ✅ Admin users have role="admin" in public metadata
- ✅ Regular users have no role or role="user"
- ✅ No JavaScript errors in console

---

### Test 2: Sidebar Navigation - Admin User

**Purpose:** Verify admin menu appears for admin users.

**Test Steps:**

1. Log in as **admin user**
2. Check the sidebar (desktop) or hamburger menu (mobile)

**Expected Results:**

**Desktop Sidebar:**
- ✅ Main navigation visible:
  - Dashboard
  - Upload
  - Library
  - Settings
- ✅ "ADMIN" section header visible
- ✅ Admin navigation visible:
  - Admin Dashboard (Shield icon)
  - All Jobs (Briefcase icon)
  - User Management (Users icon)
  - System Logs (FileText icon)
  - Agent Outputs (Sparkle icon)
- ✅ Admin menu items have purple theme
- ✅ Admin badge visible next to username
- ✅ Smooth animations on hover

**Mobile:**
- ✅ Same admin section appears in mobile menu
- ✅ Admin badge visible in user section

---

### Test 3: Sidebar Navigation - Regular User

**Purpose:** Verify admin menu is hidden from regular users.

**Test Steps:**

1. Log in as **regular user**
2. Check the sidebar (desktop) or hamburger menu (mobile)

**Expected Results:**

- ✅ Main navigation visible (Dashboard, Upload, Library, Settings)
- ❌ NO "ADMIN" section header
- ❌ NO admin menu items visible
- ❌ NO admin badge next to username
- ✅ Clean, uncluttered sidebar

---

### Test 4: Admin Dashboard Page (/admin)

**Purpose:** Test the main admin dashboard with system metrics.

**Test Steps (Admin User):**

1. Log in as admin
2. Click "Admin Dashboard" in sidebar
3. Wait for metrics to load

**Expected Results:**

- ✅ URL is `/admin`
- ✅ Page header shows "Admin Dashboard" with purple icon
- ✅ **User Statistics** section displays:
  - Total Users
  - Active Users (30d)
  - Administrators
- ✅ **Job Statistics** section displays:
  - Total Jobs
  - Completed
  - Failed
  - Running
  - Queued
- ✅ **Storage Usage** section displays:
  - Total Storage (formatted: GB, MB)
  - Video Storage
  - Clip Storage
- ✅ **Recent Activity** section displays:
  - Last 24 Hours
  - Last 7 Days
  - Last 30 Days
- ✅ All metrics show real numbers (not loading states)
- ✅ No error messages
- ✅ Responsive layout on mobile

**Test Steps (Regular User):**

1. Log in as regular user
2. Manually navigate to `/admin` in URL bar

**Expected Results:**

- ✅ Access denied page displayed
- ✅ Message: "You don't have permission to access this page"
- ✅ "Return to Dashboard" button visible
- ✅ Clicking button redirects to `/dashboard`

---

### Test 5: All Jobs Page (/admin/jobs)

**Purpose:** Test the all jobs management page.

**Test Steps (Admin User):**

1. Navigate to "All Jobs" from admin menu
2. Wait for jobs to load

**Expected Results:**

- ✅ URL is `/admin/jobs`
- ✅ Page header shows "All Jobs" with indigo icon
- ✅ **Jobs table displays:**
  - Filename column
  - User column (name + email)
  - Status column (with colored badges)
  - Created column
  - Updated column
- ✅ **Search functionality:**
  - Search by filename works
  - Search by user email works
  - Search by user name works
- ✅ **Status filter dropdown:**
  - "All Status" option
  - Filter by Completed
  - Filter by Failed
  - Filter by Running
  - Filter by Queued
- ✅ **Pagination controls:**
  - Page numbers correct
  - "Previous" button disabled on page 1
  - "Next" button disabled on last page
  - Shows "Showing X to Y of Z jobs"
- ✅ **Status badges colored correctly:**
  - Completed = green
  - Failed = red
  - Running = blue (with spinner)
  - Queued = orange
- ✅ Smooth animations on row render

**Test Steps (Regular User):**

1. Manually navigate to `/admin/jobs`

**Expected Results:**

- ✅ Access denied page displayed
- ❌ No jobs table visible

---

### Test 6: User Management Page (/admin/users)

**Purpose:** Test the user management page.

**Test Steps (Admin User):**

1. Navigate to "User Management" from admin menu
2. Wait for users to load

**Expected Results:**

- ✅ URL is `/admin/users`
- ✅ Page header shows "User Management" with blue icon
- ✅ **Users table displays:**
  - User avatar/icon
  - Name column
  - Email column
  - Role column (badge: Admin with shield, or User)
  - Jobs column (job count)
  - Joined column
  - Last Active column
- ✅ **Search functionality:**
  - Type in search box
  - Wait 500ms (debounce)
  - Results filter by name or email
  - "No users found" message when no matches
- ✅ **Pagination:**
  - 20 users per page
  - Page controls work
  - Correct count displayed
- ✅ **Role badges:**
  - Admin users show purple badge with shield icon
  - Regular users show outline badge with user icon

**Test Steps (Regular User):**

1. Manually navigate to `/admin/users`

**Expected Results:**

- ✅ Access denied page displayed
- ❌ No users table visible

---

### Test 7: System Logs Page (/admin/logs)

**Purpose:** Test the processing logs viewer.

**Test Steps (Admin User):**

1. Navigate to "System Logs" from admin menu
2. Wait for logs to load

**Expected Results:**

- ✅ URL is `/admin/logs`
- ✅ Page header shows "Processing Logs" with cyan icon
- ✅ **Logs display:**
  - Log level badge (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  - Agent name
  - Job ID
  - Timestamp
  - Log message
  - Expandable metadata (if present)
- ✅ **Level filter:**
  - "All Levels" option
  - Filter by DEBUG, INFO, WARNING, ERROR, CRITICAL
  - Logs update when filter changes
- ✅ **Agent filter:**
  - "All Agents" option
  - Dropdown populated with unique agent names
  - Logs update when filter changes
- ✅ **Refresh button:**
  - Clicking reloads logs
  - Shows loading state briefly
- ✅ **Pagination:**
  - 50 logs per page
  - Page controls work
- ✅ **Log level colors:**
  - DEBUG = gray
  - INFO = blue
  - WARNING = yellow
  - ERROR = red
  - CRITICAL = dark red

**Test Steps (Regular User):**

1. Manually navigate to `/admin/logs`

**Expected Results:**

- ✅ Access denied page displayed
- ❌ No logs visible

---

### Test 8: Agent Outputs Page (/agent-outputs)

**Purpose:** Verify agent outputs page is admin-only.

**Test Steps (Admin User):**

1. Navigate to "Agent Outputs" from admin menu
2. Page should load

**Expected Results:**

- ✅ URL is `/agent-outputs`
- ✅ Page displays job list
- ✅ Can select job and view outputs
- ✅ All agent output sections visible:
  - Silence Regions
  - Transcripts
  - Content Segments
  - Extracted Clips

**Test Steps (Regular User):**

1. Manually navigate to `/agent-outputs`

**Expected Results:**

- ✅ Access denied page displayed
- ❌ No job list visible
- ❌ Cannot access agent outputs

---

### Test 9: Navigation State Persistence

**Purpose:** Verify active states and navigation work correctly.

**Test Steps:**

1. Log in as admin
2. Navigate to each admin page
3. Check sidebar highlighting

**Expected Results:**

For each admin page visited:
- ✅ Active page has purple background in sidebar
- ✅ Icon color is white (on purple background)
- ✅ Hover effects work on non-active items
- ✅ Smooth animations on navigation
- ✅ URL matches expected path
- ✅ Page title updates

---

### Test 10: Mobile Responsiveness

**Purpose:** Test admin features on mobile devices.

**Test Steps:**

1. Resize browser to mobile width (< 768px) or use device
2. Test all admin features

**Expected Results:**

- ✅ Hamburger menu shows admin section (for admin users)
- ✅ Admin badge visible in mobile user section
- ✅ All admin pages responsive:
  - Tables scroll horizontally if needed
  - Metrics stack vertically
  - Buttons/inputs stack properly
- ✅ Search and filter controls usable on mobile
- ✅ Pagination controls accessible
- ✅ No horizontal overflow issues

---

### Test 11: Loading States

**Purpose:** Verify loading states work correctly.

**Test Steps:**

1. Log in as admin
2. Navigate to each admin page
3. Observe initial load

**Expected Results:**

For each page:
- ✅ Shows skeleton loaders or loading indicators
- ✅ No flash of empty content
- ✅ Smooth transition from loading to content
- ✅ Error states display if API fails
- ✅ Retry buttons work on errors

---

### Test 12: Error Handling

**Purpose:** Test error scenarios.

**Test Steps:**

1. **Stop backend server**
2. Log in as admin (if already logged in, stay logged in)
3. Navigate to admin pages

**Expected Results:**

- ✅ Error messages display clearly
- ✅ "Failed to load" messages shown
- ✅ Retry buttons available
- ✅ No app crashes
- ✅ Console shows helpful error logs

4. **Restart backend server**
5. Click retry or refresh page

**Expected Results:**

- ✅ Data loads successfully
- ✅ Error messages clear

---

### Test 13: Data Accuracy

**Purpose:** Verify displayed data matches backend.

**Test Steps:**

1. Log in as admin
2. Open browser DevTools Network tab
3. Navigate to admin dashboard

**Expected Results:**

- ✅ API calls to `/api/v1/admin/metrics` succeed (200 status)
- ✅ Response data matches displayed metrics
- ✅ Numbers are formatted correctly:
  - Storage in GB/MB
  - Job counts as integers
  - Percentages where applicable

4. Navigate to All Jobs page

**Expected Results:**

- ✅ API call to `/api/v1/admin/jobs` succeeds
- ✅ All jobs from all users shown
- ✅ User details correct for each job

5. Navigate to Users page

**Expected Results:**

- ✅ API call to `/api/v1/admin/users` succeeds
- ✅ All users listed
- ✅ Admin users show admin badge
- ✅ Job counts accurate

---

### Test 14: Security Validation

**Purpose:** Ensure non-admin users cannot bypass security.

**Test Steps:**

1. Log in as **regular user**
2. Open browser DevTools Console
3. Try direct API calls:
   ```javascript
   fetch('http://localhost:8000/api/v1/admin/metrics', {
     headers: {
       'Authorization': 'Bearer ' + document.cookie
     }
   }).then(r => r.json()).then(console.log)
   ```

**Expected Results:**

- ✅ API returns 403 Forbidden status
- ✅ Error message: "Admin access required for this endpoint"
- ❌ No data returned

4. Try accessing admin routes directly:
   - Type `/admin` in URL bar
   - Type `/admin/jobs` in URL bar
   - Type `/admin/users` in URL bar
   - Type `/admin/logs` in URL bar
   - Type `/agent-outputs` in URL bar

**Expected Results:**

- ✅ All routes show "Access Denied" page
- ✅ No admin data visible
- ✅ "Return to Dashboard" button works

---

## Performance Testing

### Test 15: Large Dataset Handling

**Purpose:** Test admin pages with large amounts of data.

**Test Steps:**

1. Ensure database has:
   - At least 100+ jobs
   - At least 50+ users
   - At least 500+ log entries

2. Navigate to each admin page

**Expected Results:**

- ✅ Pages load within 3 seconds
- ✅ Pagination works smoothly
- ✅ Search/filter operations are fast
- ✅ No UI freezing or stuttering
- ✅ Smooth scrolling

---

## Browser Compatibility

### Test 16: Cross-Browser Testing

**Test in each browser:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on Mac)

**Expected Results:**

For each browser:
- ✅ All admin features work
- ✅ Styling consistent
- ✅ Animations smooth
- ✅ No console errors
- ✅ No visual glitches

---

## Regression Testing

### Test 17: Non-Admin Features Still Work

**Purpose:** Ensure admin implementation didn't break existing features.

**Test Steps (as regular user):**

1. Navigate to Dashboard
2. Upload a video
3. View Library
4. Update Settings
5. View job details

**Expected Results:**

- ✅ All regular user features work normally
- ✅ No admin UI elements visible
- ✅ No broken functionality
- ✅ Clean, uncluttered interface

---

## Test Results Template

Use this template to record test results:

```markdown
## Test Run: [Date]

**Tester:** [Your Name]
**Environment:** [Dev/Staging/Production]
**Backend:** [Running/Version]
**Frontend:** [Running/Version]

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Role Detection | ✅ PASS | |
| 2 | Sidebar - Admin | ✅ PASS | |
| 3 | Sidebar - Regular | ✅ PASS | |
| 4 | Admin Dashboard | ✅ PASS | |
| 5 | All Jobs Page | ✅ PASS | |
| 6 | User Management | ✅ PASS | |
| 7 | System Logs | ✅ PASS | |
| 8 | Agent Outputs | ✅ PASS | |
| 9 | Navigation State | ✅ PASS | |
| 10 | Mobile Responsive | ✅ PASS | |
| 11 | Loading States | ✅ PASS | |
| 12 | Error Handling | ✅ PASS | |
| 13 | Data Accuracy | ✅ PASS | |
| 14 | Security | ✅ PASS | |
| 15 | Large Datasets | ✅ PASS | |
| 16 | Cross-Browser | ✅ PASS | |
| 17 | Regression | ✅ PASS | |

### Issues Found

1. [Issue description]
   - **Severity:** [Critical/High/Medium/Low]
   - **Steps to reproduce:** [...]
   - **Expected:** [...]
   - **Actual:** [...]

### Sign-off

- [ ] All tests passed
- [ ] Known issues documented
- [ ] Ready for production

**Tester Signature:** ________________
**Date:** ________________
```

---

## Quick Smoke Test (5 minutes)

For quick verification after changes:

1. ✅ Log in as admin → Admin menu visible
2. ✅ Log in as regular user → No admin menu
3. ✅ Navigate to `/admin` as admin → Dashboard loads
4. ✅ Navigate to `/admin` as user → Access denied
5. ✅ Check 1 metric on admin dashboard → Displays correctly
6. ✅ Check jobs table → Shows jobs from multiple users
7. ✅ Check users table → Shows admin and regular users
8. ✅ Check logs page → Logs display with colors
9. ✅ Mobile menu → Admin section visible for admin only

---

## Automated Testing Setup (Future)

To set up automated tests in the future:

1. Install testing dependencies:
   ```bash
   cd frontend
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. Add test scripts to `package.json`:
   ```json
   "scripts": {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

3. Create tests in `__tests__` directories following the patterns in this guide

---

## Support

For issues or questions:
- Check console for errors
- Review Network tab for failed API calls
- Verify Clerk metadata is set correctly
- Ensure backend is running and accessible
- Check backend logs for authorization errors
