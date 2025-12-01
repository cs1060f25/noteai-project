Product Requirements Document (PRD)

0) Summary
Product: NoteAI, a multi-agent AI platform that transforms lecture recordings into highlight clips, transcripts, quizzes, and podcasts.
One‑liner: Upload a lecture, get highlights, transcripts, quizzes, and podcasts, all AI-generated in minutes.
Primary outcome: Educators upload 30-90 minute lectures and receive within 15 minutes:
- Highlight clips with embedded subtitles
- Full transcript with timestamps
- AI-generated quiz
- AI-generated podcast (2-speaker dialogue format)

1) Problem
Lectures are long, dense, and hard to review. Educators lack time and tooling to manually produce highlight reels. Students struggle to locate “the moment that matters.” Universities and course platforms want scalable, privacy‑respecting workflows that produce consistent, branded learning assets without video‑editing expertise.
Key problems to solve
P1 - Extraction: Automatically find and compile key moments (concepts, definitions, demos) from 30 to 90 min lectures.
P2 - Time-to-value: Deliver first results within minutes of upload.
P3 - Quality & Cohesion: Clips must feel intentional (no dead air, coherent start/finish, accurate captions).
P4 - Operations at scale: Handle many concurrent jobs; predictable cost; robust error handling.
P5 - Compliance & Trust: Respect consent/ownership of lecture content; secure handling of student/lecturer data.
P6 - Study Tools: Students want active learning materials (quizzes) not just passive videos.
P7 - Accessibility: Not all students can watch videos; audio-only formats (podcasts) improve access.
P8 - Retention: Short clips + quizzes + podcasts create multiple study modalities, improving retention.

2) Personas
A) Educator (User)
Background: University professor, records 30-90 min lectures weekly, not a video editor
Motivation: Improve student outcomes, reduce prep time, share polished content in LMS
Goals: Upload → get several polished highlight clips with captions and topic labels; export to LMS/YouTube
Values/Ethics: Student privacy; academic integrity; accessibility (captions, clean audio)
Frictions: Slow manual editing; inconsistent results; tools too technical

B) Student (End Beneficiary)
Background: Efficient studying, find concepts quickly, prep for exams
Motivation: Efficient studying, find concepts quickly, prep for exams
Goals: Watch short clips instead of rewatching 60-min lecture; test knowledge with quiz; listen to podcast while commuting
Values/Ethics: Fast access, accurate content

C) Teaching Assistant (User)
Background: Manages course logistic
Motivation: Batch processing, deadline-driven workflows
Goals: Queue multiple lectures, track status, fix errors
Values/Ethics: Accuracy; reliability; minimal rework

D) Program Admin / Department Chair (Customer/Owner)
Background: Oversees LMS, budgets, compliance
Motivation: Scalable solution, cost control, usage analytics
Goals: Department‑level deployment, SSO, usage analytics
Values/Ethics: FERPA/GDPR alignment; content IP clarity

3) Persona Journeys
3.1 Educator Journey — "Upload → Highlights → Share" (happy path)
Trigger: Instructor finishes recording a 60-min lecture and wants fast highlights.
Preconditions:
- User signed in via Clerk (Google/GitHub OAuth)
- Video file ready or YouTube URL

Steps & System Interactions
Upload media
   - Navigate to Upload page
   - Drag-and-drop video file or paste YouTube URL
   - Frontend requests upload URL from `POST /api/v1/upload`
   - Direct upload to S3 (bypasses backend for performance)
   - Confirm upload triggers processing via `POST /api/v1/jobs`

Processing (real-time status)
   - Backend creates Job record in database (`status=QUEUED`)
   - Celery task queued to Redis
   - Worker executes pipeline:
     1. Download (audio + video tracks)
     2. Silence Detection (ffmpeg)
     3. Transcription (Whisper)
     4. Content Analysis (Gemini)
     5. Segment Extraction
     6. Video Compilation (ffmpeg)
   - Frontend connects to WebSocket `WS /ws/{job_id}` for real-time progress
   - Progress includes: stage name, percentage, ETA

Review results
   - Navigate to Results page
   - View highlight clips with:
     * Thumbnails
     * Importance scores
     * Topic labels
     * Timestamps
   - Video player features:
     * HTML5 player with controls
     * Subtitle toggle
   - View full transcript with timestamps

Generate quiz (optional)
   - Click "Generate Quiz" button
   - Backend calls `POST /api/v1/quiz/generate`
   - Gemini API generates questions from transcript
   - Take quiz with immediate feedback
   - View quiz history

Generate podcast (optional)
   - Request podcast generation
   - Backend triggers async Celery task
   - AI creates conversational dialogue
   - TTS generates audio
   - Download podcast MP3

Publish & share
   - Download individual clips
   - Download subtitles
   - Share links with students

3.2 Teaching Assistant (TA) Journey — "Bulk queue → Monitor → Export"
Trigger: TA must process ~10 lectures before the weekly release window.

Steps & System Interactions
Bulk queue
   - Upload multiple videos sequentially via UI
   - Backend returns list of job_ids
   - Dashboard shows all jobs with status

Monitor
   - Navigate to Dashboard
   - View statistics:
     * Total videos processed
     * Job status distribution
   - Real-time updates via WebSocket

Triage
   - Inspect failed jobs
   - View error messages
   - Retry failed jobs

3.3 Program Admin / Department Chair Journey — "Provision → Govern → Audit"
Trigger: Start of semester rollout.

Steps & System Interactions
Provision org
   - Admin creates user accounts via Clerk
   - Assign roles

Review analytics
   - View all jobs
   - View all users
   - Monitor metrics via Prometheus/Grafana

3.4 Student Journey — "Find → Watch → Recall"
Trigger: Student preps for a quiz and needs key definitions quickly.

Steps & System Interactions
Discover
   - Receive link to video results page
   - View highlight gallery

Watch
   - Click clip thumbnail
   - HTML5 video player loads with S3 URL
   - Watch clip on mobile or desktop

Recall
   - Take quiz to test understanding
   - Listen to podcast for review

4) API Journeys
Upload flow: POST /api/v1/upload/presigned-url → S3 direct PUT → POST /api/v1/jobs.
Progress: WebSocket /ws/{job_id} or GET /api/v1/jobs/{job_id}.
Results: GET /api/v1/results/{job_id} returns clip metadata, file URIs, captions.
Auth: Clerk (OAuth2/SSO).

5) UX Map
Pages: Upload → Dashboard → Video Details (Results) → Quiz
System states: Idle → Uploading → Processing (Queued/Started) → Complete → Failed
Artifacts: Clips (MP4), captions (VTT), transcripts, quizzes, podcasts.

6) Scope & Requirements
Functional
Upload lectures via pre‑signed S3 or YouTube URL.
Pipeline: silence detection, transcription, content analysis, segment extraction, video compilation.
Real‑time progress via WebSocket.
Results page: gallery, topic labels, subtitle toggle, timeline view.
Admin: SSO (Clerk), usage dashboard.

Non‑Functional
Processing time target: Fast turnaround.
Availability: High uptime.
Cost efficiency: Optimized resource usage.
Brand consistency: Uniform styling.

7) Success Criteria
Turnaround time.
Clip utility and quality.
Reliability (low failure rate).
Security (pre-signed URLs, secure auth).

8) Security, Privacy, and Ethics
Data inventory & retention
Raw video: stored in S3.
Generated clips/captions: stored in S3.
Metadata & logs: stored in PostgreSQL.

Threat model
Spoofing: Mitigated with Clerk Auth and pre-signed URLs.
Tampering: S3 bucket policies.
Information disclosure: Least-privilege IAM.

Privacy & Ethics
Consent & IP: Respect uploader rights.
Accessibility: Captions generated.

9) Architecture
Frontend: React + TypeScript, Vite, Tailwind CSS, React Query, Clerk (Auth).
Backend: FastAPI, Celery, Redis, PostgreSQL.
AI/ML: Whisper (ASR), Gemini (Content Analysis/Quiz/Podcast), FFmpeg (Processing).
Infra: Docker, S3.
Observability: Prometheus, Grafana, Loki.

10) Launch Plan
Phase 0 — Internal Alpha
Phase 1 — Design Partner Beta
Phase 2 — Public GA

11) Update Plan
Regular reviews and updates based on metrics and feedback.

12) The “Lucky Break” (5‑year success)
Standard for lecture post‑production; high adoption; rich API ecosystem.

13) The “Pre‑mortem” (5‑year failure)
Poor quality; high costs; trust breaches; complex UX.

14) Measurement Plan
Processing time, failure rate, cost per job, user engagement metrics.
