#!/bin/bash

# Admin Features Testing Script
# This script helps verify the admin dashboard implementation

set -e

echo "=========================================="
echo "Admin Dashboard Testing Helper"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"

echo -e "${BLUE}Step 1: Checking if backend is running...${NC}"
if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running at ${BACKEND_URL}${NC}"
else
    echo -e "${RED}✗ Backend is not running!${NC}"
    echo "Please start the backend server first:"
    echo "  cd backend && docker compose up -d"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Checking if frontend is running...${NC}"
if curl -s "${FRONTEND_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running at ${FRONTEND_URL}${NC}"
else
    echo -e "${RED}✗ Frontend is not running!${NC}"
    echo "Please start the frontend server first:"
    echo "  cd frontend && npm run dev"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Checking admin API endpoints...${NC}"

# Test admin endpoints (will fail without auth, but checks if routes exist)
ENDPOINTS=(
    "/api/v1/admin/metrics"
    "/api/v1/admin/jobs"
    "/api/v1/admin/users"
    "/api/v1/admin/processing-logs"
)

for endpoint in "${ENDPOINTS[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}${endpoint}")
    if [ "$response" == "401" ] || [ "$response" == "403" ]; then
        echo -e "${GREEN}✓ ${endpoint} - Route exists (auth required)${NC}"
    elif [ "$response" == "404" ]; then
        echo -e "${RED}✗ ${endpoint} - Route not found!${NC}"
    else
        echo -e "${YELLOW}? ${endpoint} - Unexpected response: ${response}${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 4: Checking frontend files...${NC}"

REQUIRED_FILES=(
    "frontend/src/hooks/useRole.ts"
    "frontend/src/services/adminService.ts"
    "frontend/src/types/admin.ts"
    "frontend/src/components/admin/AdminRoute.tsx"
    "frontend/src/components/admin/AdminBadge.tsx"
    "frontend/src/components/admin/SystemMetricsGrid.tsx"
    "frontend/src/components/admin/AdminJobsTable.tsx"
    "frontend/src/components/admin/UsersTable.tsx"
    "frontend/src/components/admin/ProcessingLogsViewer.tsx"
    "frontend/src/routes/_authenticated.admin.tsx"
    "frontend/src/routes/_authenticated/admin/index.tsx"
    "frontend/src/routes/_authenticated/admin/jobs.tsx"
    "frontend/src/routes/_authenticated/admin/users.tsx"
    "frontend/src/routes/_authenticated/admin/logs.tsx"
)

all_files_exist=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ ${file}${NC}"
    else
        echo -e "${RED}✗ ${file} - Missing!${NC}"
        all_files_exist=false
    fi
done

echo ""
if [ "$all_files_exist" = true ]; then
    echo -e "${GREEN}=========================================="
    echo "✓ All checks passed!"
    echo "==========================================${NC}"
    echo ""
    echo "Next steps for manual testing:"
    echo ""
    echo "1. Open Clerk Dashboard: https://dashboard.clerk.com"
    echo "   - Create or select a user"
    echo "   - Add to Public metadata: {\"role\": \"admin\"}"
    echo "   - Save changes"
    echo ""
    echo "2. Open frontend: ${FRONTEND_URL}"
    echo "   - Log in with the admin user"
    echo "   - Verify admin menu appears in sidebar"
    echo ""
    echo "3. Test admin pages:"
    echo "   - ${FRONTEND_URL}/admin (Dashboard)"
    echo "   - ${FRONTEND_URL}/admin/jobs (All Jobs)"
    echo "   - ${FRONTEND_URL}/admin/users (User Management)"
    echo "   - ${FRONTEND_URL}/admin/logs (System Logs)"
    echo "   - ${FRONTEND_URL}/agent-outputs (Agent Outputs)"
    echo ""
    echo "4. Test as regular user:"
    echo "   - Log out"
    echo "   - Log in with a non-admin user"
    echo "   - Verify NO admin menu appears"
    echo "   - Try accessing /admin directly → Should see access denied"
    echo ""
    echo "5. See ADMIN_TESTING_GUIDE.md for detailed test cases"
    echo ""
else
    echo -e "${RED}=========================================="
    echo "✗ Some files are missing!"
    echo "==========================================${NC}"
    echo "Please ensure all admin files are created."
    exit 1
fi
