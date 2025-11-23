# 🧩 NoteAI — Comprehensive Project Context (for HW11 setup)

## 🧠 Project Overview

**NoteAI** is a full-stack AI application that automatically turns long lecture recordings (30–60 minutes) into concise highlight videos (20 seconds – 2 minutes).

Users upload a video → NoteAI detects silences, transcribes, analyzes content, and compiles highlight clips → the app shows a dashboard with progress and results.

### 🏗️ Tech Stack Summary

**Frontend**

* React 18 + TypeScript + Vite + TailwindCSS
* TanStack Router (file-based routing)
* TanStack Query (React Query) for API state
* Clerk for authentication
* Vitest + React Testing Library for testing

**Backend**

* FastAPI (Python)
* Celery + Redis for job queue
* PostgreSQL for metadata
* S3-compatible storage for media files

**AI/ML Pipelines**

* Silence detection (PyDub + librosa)
* Transcription (OpenAI Whisper)
* Layout analysis (OpenCV)
* Content summarization (Google Gemini)
* Video compilation (MoviePy)

**System Flow**

```
User → Upload → FastAPI job created
→ Celery processes job stages
→ progress events broadcast via WebSocket
→ frontend subscribes to updates
→ results stored in PostgreSQL/S3
→ dashboard shows progress + final highlights
```

---

## 🗂️ Repository Layout (simplified)

```
noteai-project/
│
├── backend/
│   ├── app/
│   ├── api/routes/
│   ├── pipeline/
│   └── tests/
│
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   └── layout/Footer.tsx  ← (Footer UI)
    │   ├── hooks/
    │   ├── routes/                ← (File-based routing)
    │   │   ├── _root.tsx
    │   │   ├── _authenticated.dashboard.tsx
    │   │   ├── _authenticated.upload.tsx
    │   │   ├── _authenticated.agent-outputs.tsx  ← likely video results
    │   │   ├── login.tsx
    │   │   └── signup.tsx
    │   ├── services/
    │   ├── types/
    │   ├── main.tsx
    │   ├── router.tsx
    │   └── routeTree.gen.ts
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

✅ Confirmed: **TanStack Router (file-based)** with generated `routeTree.gen.ts`.

---

## 📚 Previous Homeworks Context

### HW7 — Frontend UI (Job Progress)

* Built `JobProgress` React component showing label, %, ETA, and “View Results.”
* Created polling hook `useJobStatus.ts` calling `/jobs/{id}` every 3s.
* Integrated into Upload page with mock jobs for dev testing.
* Added unit tests (`JobProgress.test.tsx`).
  ✅ All tests passed.

### HW8 — Real-Time Updates + CI/CD

* Added WebSocket hook `useJobStatusWS.ts` connecting to `/api/v1/jobs/{id}/ws`.
* Implemented reconnection logic and monotonic progress updates.
* Updated Upload page to use WS by default, fallback to polling.
* Built FastAPI mock WS endpoint for local testing.
* CI/CD tested with GitHub Actions + Vercel deployment.
  ✅ Real-time progress + CI/CD complete.

---

## 🧾 HW10 Summary (from assignment)

HW10 introduced **issue tracking, red teaming, and project hygiene**:

* All work after Nov 12 required **Linear issue IDs** in commit messages.
* Issues must have proper labels, test plans, and acceptance criteria.
* Icebox unused items to avoid grading penalties.
* Red team exercise: document project state for peer review.

---

## 📋 HW11 Assignment Overview

> 🗓️ Due Tuesday, Nov 25 (late penalties waived until Nov 28)

### Goal

Pick **two meaningful bugs** in your project and go through the **entire software-engineering process** — triage, testing, fixing, validation, and documentation — using **Linear** + **GitHub**.

---

### **HW11 Grading Breakdown**

| Step                | Points     | Description                                                                                                          |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| 1. Setup + Triage   | 10 (5+5)   | Create/complete two Linear bug issues with Severity (SEV1–4) + Priority (1–4). Include a “Triage” section.           |
| 2. Scope + Scrub    | 15         | Ensure issues are fully defined: description, reproduction steps, test plan, acceptance criteria, labels, estimates. |
| 3. Test / Reproduce | 15         | Write a test for each bug (even if incomplete). Commit with issue ID. Comment on test adequacy.                      |
| 4. Fix              | 15         | Up to 3 AI attempts per bug. Write 50–100 word summaries per attempt. Manual fix allowed.                            |
| 5. Validation       | 5          | Create PR(s), assign for review, close or reassign bug.                                                              |
| **Total**           | **60 pts** | All Linear + GitHub workflow graded.                                                                                 |

**Submission:**

* Copy HW11 template Google Doc → fill in your two Linear issues.
* Share doc “Anyone with link can comment.”
* Submit link on Canvas.

---

## 🧮 Linear Project Setup

**Team:** CS1060 F25 → *NoteAI* project.
**Workspace URL:** [https://linear.app/cs1060f25/team/NOTEAI/all](https://linear.app/cs1060f25/team/NOTEAI/all)

### You created two new bugs:

| ID         | Title                                                                                 | Severity | Priority | Points | Labels              |
| ---------- | ------------------------------------------------------------------------------------- | -------- | -------- | ------ | ------------------- |
| NOTEAI-158 | Highlight videos render too small on Results page; add size presets & remember choice | SEV3     | 2        | 7      | Bug, Frontend, HW11 |
| NOTEAI-159 | Footer links non-functional; wire 9 destinations & add stub pages                     | SEV3     | 3        | 7      | Bug, Frontend, HW11 |

Both are now **In Progress** under your name.

Each issue includes:

* Description, environment, reproduction steps, and scope.
* Triage rationale (severity + priority).
* Test plan.
* Acceptance criteria.
* Fixes and Validation sections to fill later.

---

## 🧑‍💻 Git / GitHub Setup (what you’ll do next)

Start fresh and sync your repo with your team’s latest updates.

### From PowerShell:

```powershell
# 1. Go to your HW7 NoteAI repo
cd "C:\Users\anayp\Documents\CS 1060\HW7\noteai-project"

# 2. Make sure remote points to your team repo
git remote -v

# 3. Get latest updates
git fetch origin
git switch main
git pull --ff-only origin main

# 4. Create a new HW11 branch
git switch -c anayp-hw11
git push -u origin anayp-hw11

# You are now on your working branch for HW11
```

You’ll use this branch for **both bugs, their tests, and fixes**.

---

## 🧩 Bug 1 — “Highlight videos render too small”

### 🔍 Summary

Generated highlight clips appear in a small player on the Results page.
Goal: make them larger and allow user-selectable size presets (Compact / Medium / Large).

### 📁 Likely file(s)

* `frontend/src/routes/_authenticated.agent-outputs.tsx` (renders highlight clips)
* `frontend/src/components/highlights/HighlightPlayer.tsx` (if exists or to create)

### 🎯 Acceptance

* Larger default size (responsive, maintains aspect ratio)
* Size presets or “fill width” toggle
* Persist size in localStorage
* No regressions or layout shift

### 🧪 Test Plan

* Failing test first: default small size detected → fail
* After fix: default ≥ expected width
* Toggle changes applied class
* Size persists across reloads
* Controls accessible via keyboard

### 💬 Linear Fields

| Field    | Value               |
| -------- | ------------------- |
| Severity | SEV3                |
| Priority | 2                   |
| Points   | 7                   |
| Labels   | Bug, Frontend, HW11 |
| Status   | In Progress         |

---

## 🧩 Bug 2 — “Footer links non-functional”

### 🔍 Summary

The 9 links in the site footer (“Features, Pricing, Use Cases, About, Blog, Contact, Privacy, Terms, Security”) are static and don’t navigate.

Goal: connect each to a real route with placeholder content.

### 📁 File(s)

* `frontend/src/components/layout/Footer.tsx` (footer UI)
* Create new route files under `src/routes/`:

  ```
  features.tsx
  pricing.tsx
  use-cases.tsx
  about.tsx
  blog.tsx
  contact.tsx
  legal.privacy.tsx
  legal.terms.tsx
  legal.security.tsx
  ```

### 🎯 Acceptance

* 9 working routes (each shows a heading)
* Footer links use TanStack Router `<Link>` (no full reloads)
* Works without login
* 404 route present for invalid URLs

### 🧪 Test Plan

* Failing test first: no links navigate → fail
* After fix: clicking each link renders correct heading

### 💬 Linear Fields

| Field    | Value               |
| -------- | ------------------- |
| Severity | SEV3                |
| Priority | 3                   |
| Points   | 7                   |
| Labels   | Bug, Frontend, HW11 |
| Status   | In Progress         |
