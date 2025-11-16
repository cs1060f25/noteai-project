# Deployment Guide

## Frontend Deployment (Vercel)

### Initial Setup

1. **Install Vercel CLI** (optional, for local testing)
   ```bash
   npm i -g vercel
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click **Add New Project**
   - Import `cs1060f25/noteai-project` repository
   - Select `main` as production branch
   - Framework Preset: **Vite**
   - Root Directory: Leave as `.` (uses `vercel.json` config)

3. **Configure Environment Variables**

   In Vercel Dashboard → Settings → Environment Variables, add:

   | Variable | Value | Environment |
   |----------|-------|-------------|
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
   | `VITE_API_URL` | `https://api.noteai.com/api/v1` | Production |
   | `VITE_WS_URL` | `wss://api.noteai.com/ws` | Production |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Preview |
   | `VITE_API_URL` | `https://api-staging.noteai.com/api/v1` | Preview |
   | `VITE_WS_URL` | `wss://api-staging.noteai.com/ws` | Preview |

4. **Deploy**
   - Click **Deploy**
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

---

## Automatic Deployments

### Production Deployments
- **Trigger:** Push or merge to `main` branch
- **URL:** `https://noteai.vercel.app` (or custom domain)
- **Runs:** After CI checks pass

### Preview Deployments
- **Trigger:** Every pull request
- **URL:** Unique URL for each PR (e.g., `https://noteai-git-feature-xyz.vercel.app`)
- **Purpose:** Test changes before merging

---

## Deployment Workflow

```
1. Create PR → CI runs quality checks
2. CI passes → Vercel builds preview deployment
3. Review preview URL → Test changes
4. Merge PR → Vercel deploys to production
5. Production live → Automatic rollback if fails
```

---

## Custom Domain Setup

1. Go to Vercel Dashboard → Domains
2. Add your custom domain (e.g., `noteai.com`)
3. Follow DNS configuration instructions
4. Vercel automatically provisions SSL certificate
5. Domain goes live in ~1 hour

---

## Rollback

If a deployment breaks production:

**Option 1: Vercel Dashboard**
1. Go to Deployments tab
2. Find previous working deployment
3. Click **Promote to Production**

**Option 2: Git Revert**
```bash
git revert <bad-commit-hash>
git push origin main
```

---

## Environment-Specific Configs

### Development
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
```

### Staging (Preview)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://api-staging.noteai.com/api/v1
VITE_WS_URL=wss://api-staging.noteai.com/ws
```

### Production
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://api.noteai.com/api/v1
VITE_WS_URL=wss://api.noteai.com/ws
```

---

## Backend Deployment (Future)

Backend can be deployed to:
- **Railway** - Easy Docker deployment
- **AWS ECS** - Production-grade container orchestration
- **Google Cloud Run** - Serverless containers
- **DigitalOcean App Platform** - Simple PaaS

*Backend deployment guide coming soon*

---

## Monitoring

### Vercel Analytics
- Enable in Vercel Dashboard → Analytics
- Tracks page views, performance, Web Vitals

### Deployment Notifications
- Configure in Vercel → Settings → Git Integration
- Get Slack/Discord notifications on deployments

---

## Troubleshooting

### Build Fails

**Check build logs:**
1. Go to Vercel Dashboard → Deployments
2. Click failed deployment
3. View build logs

**Common issues:**
- Missing environment variables
- TypeScript errors
- Dependency installation failures
- Build command errors

**Fix:**
- Add missing env vars
- Fix code errors locally
- Push fixes to trigger new deployment

### Preview Deployment Not Created

**Possible reasons:**
- PR from forked repo (security restriction)
- Vercel GitHub app not installed correctly
- Build skipped due to `[skip ci]` in commit message

**Fix:**
- Check Vercel GitHub integration settings
- Re-install Vercel GitHub app
- Push new commit without `[skip ci]`

---

## Quick Commands

```bash
# Deploy to preview (from local)
vercel

# Deploy to production (from local)
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Pull environment variables
vercel env pull
```

---

**Last Updated:** 2025-01-15
