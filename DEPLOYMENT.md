# Deployment Guide

## Quick Setup

### 1. Create Vercel Project
- Go to [vercel.com](https://vercel.com) → New Project
- Import GitHub repo
- Framework: **Vite**
- **Disable automatic deployments** (we use GitHub Actions)

### 2. Get Vercel Credentials

```bash
npm i -g vercel
vercel login
vercel link  # Links to your project
```

After `vercel link`, check `.vercel/project.json` for:
- `orgId` → `VERCEL_ORG_ID`
- `projectId` → `VERCEL_PROJECT_ID`

Get token from: Vercel Dashboard → Settings → Tokens → Create Token

### 3. Add GitHub Secrets

Go to GitHub → Settings → Secrets → Actions:

- `VERCEL_TOKEN` - Your Vercel token
- `VERCEL_ORG_ID` - From `.vercel/project.json`
- `VERCEL_PROJECT_ID` - From `.vercel/project.json`

### 4. Add Environment Variables in Vercel

Vercel Dashboard → Settings → Environment Variables:

**Production:**
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk production key
- `VITE_API_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket URL

**Preview (optional):**
- Same variables with staging/test values

---

## How It Works

### Deployment Flow

```
1. Push to main
2. CI runs (lint, format, type-check, tests, build)
3. ✅ CI passes
4. GitHub Actions triggers Vercel deployment
5. 🚀 Production live
```

### Important Rules

- **Only deploys on `main` branch**
- **Only deploys if CI passes**
- **Automatic rollback if deployment fails**

---

## Testing Before Merge

1. Create PR
2. CI runs checks
3. Vercel creates preview deployment (optional)
4. Review changes
5. Merge when ready
6. Automatic production deployment

---

## Manual Deployment

If needed, deploy manually:

```bash
vercel --prod
```

---

## Rollback

**Option 1: Vercel Dashboard**
- Deployments → Previous deployment → Promote to Production

**Option 2: Git Revert**
```bash
git revert <bad-commit>
git push origin main
```

---

## Monitoring

- Vercel Dashboard → Analytics
- GitHub Actions → Deployments tab
- Check deployment logs in Actions

---

## Troubleshooting

**Build fails:**
- Check GitHub Actions logs
- Verify environment variables in Vercel
- Test build locally: `npm run build`

**Secrets not working:**
- Re-check secret names (case-sensitive)
- Verify `.vercel/project.json` values
- Regenerate Vercel token if expired
