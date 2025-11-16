# NoteAI – Transform Long Lectures into Highlight Videos

**Team Project for CS1060**

> *NoteAI automatically transforms long lecture recordings into short, engaging highlight videos using multi-agent AI processing.*

## Project Summary

NoteAI is a multi-agent AI pipeline that processes long lecture recordings (30–60 minutes) into concise video highlights (20s–2min each). The system identifies key educational moments, removes silence, and generates polished video summaries with subtitles, screen splits, and topic segmentation.

This project leverages distributed processing with Celery, integrates Google Gemini for content analysis, and uses OpenAI Whisper for transcription and subtitle generation.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Features](#features)
5. [System Flow](#system-flow)
6. [Team Roles](#team-roles)
7. [Resources](#resources)
8. [Links](#links)

## Overview

**Input:**

* Long lecture video (30+ min, with slides + camera)

**Output:**

* Multiple highlight clips (20s–2min each)
* Auto subtitles and timestamps
* Screen-split layout (slides | speaker view)
* Topic timeline visualization

**Value Proposition:**

* Saves time for students and instructors
* Auto-identifies key learning moments
* Professional, accessible output with subtitles
* Supports educational content re-use and accessibility

### System Components

| Component                         | Description                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Frontend (React + TypeScript)** | Uploads lecture, displays real-time processing dashboard                                                      |
| **Backend (FastAPI + Celery)**    | Handles video processing and task orchestration                                                               |
| **AI Agents**                     | Gemini API (content analysis), Whisper (transcription), OpenCV (layout detection), MoviePy (video generation) |
| **Broker (Redis/RabbitMQ)**       | Queues processing jobs for distributed workers                                                                |
| **Database (PostgreSQL)**         | Stores job records, transcript metadata, and results                                                          |
| **Storage (AWS S3)**              | Stores uploaded and processed video content                                                                   |
| **CDN (AWS CloudFront)**          | Delivers final highlight videos efficiently                                                                   |

## Tech Stack

**Backend:**

* Python 3.9+, FastAPI, Celery, Redis, Pydantic
* PostgreSQL for production (SQLite for dev)

**Frontend:**

* React 18+, TypeScript, Vite, TailwindCSS
* React Query for data fetching
* Socket.io for live updates

**AI/ML:**

* Google Gemini API (topic segmentation & scoring)
* OpenAI Whisper (speech-to-text & subtitles)
* MoviePy, OpenCV, PyDub, librosa

**Infrastructure:**

* AWS S3 + CloudFront
* Docker + Docker Compose for local orchestration
* Vercel / Railway / ECS for deployment

## Features

| Feature                         | Description                                    |
| --------------------------------| ---------------------------------------------- |
| **Lecture Upload**             | Secure pre-signed S3 upload via FastAPI        |
| **Distributed Processing**     | Parallel + sequential AI pipeline              |
| **Smart Highlight Extraction** | Gemini-based topic segmentation                |
| **Silence Detection**          | Removes pauses using PyDub + librosa           |
| **Auto Subtitles**            | Whisper generates SRT/VTT captions             |
| **Results Dashboard**          | Real-time status updates via WebSocket         |
| **Export Options**             | Download clips individually or as full package |

## System Flow

1. **User Uploads Lecture** → React requests pre-signed URL
2. **FastAPI API** → Creates a processing job + S3 record
3. **Video Upload** → User uploads directly to S3
4. **Celery Worker** → Pulls job from Redis queue
5. **Stage 1 (Parallel)**
   * Silence Detector
   * Transcript Agent (Whisper)
   * Layout Agent (OpenCV)
6. **Stage 2 (Sequential)**
   * Content Analyzer (Gemini)
   * Segment Extractor
   * Video Compiler
7. **Results Saved** → S3 + Database
8. **Frontend Dashboard** → Displays progress and results

## Team Roles

| Role                          | Member   | Responsibility                     |
| ----------------------------- | -------- | ---------------------------------- |
| **Project Lead**              | *Miranda Shen* | Organization & scheduling          |
| **Product Lead**              | *Anay Patel* | PRD ownership & requirements       |
| **Engineering Lead**          | *Eliot Atlani* | Backend & pipeline development     |
| **Quality Lead**              | *Aaron Gong* | Testing and QA                     |

## Resources

* **PRD (Product Requirements Document):** [Link to PRD]([https://drive.google.com/drive/folder/...](https://drive.google.com/file/d/17IcuCqpmhBInQSeeHxLTP3FYMh7DeQI7/view?usp=drive_link))
* **Project Index Document:** [Link to Project Index]([https://drive.google.com/drive/folder/...](https://docs.google.com/document/d/1Tju0ISCucELqwJ5BzRnwcWK9UDIXWhwrgyJk3jxe9co/edit?usp=sharing))
* **Team Google Drive Folder:** [Link to Design Folder]([https://drive.google.com/drive/folder/...](https://drive.google.com/drive/folders/1_EZt-vSreHZA9UMcIAoyl-5W0WhwjE9Q?usp=drive_link))
* **Linear Project Board:** [Link to Linear Project]([https://linear.app/...](https://linear.app/cs1060f25/team/NOTEAI/all))

## Development Setup

### Git Hooks Installation

After cloning the repository, install git hooks to ensure code quality:

```bash
./scripts/install-hooks.sh
```

This installs a pre-commit hook that automatically:
- **Frontend**: Runs Prettier formatting, ESLint linting, and TypeScript type checking
- **Backend**: Runs Ruff linting and Black formatting

See `scripts/README.md` for more details.

## Links

| Resource                | URL                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------- |
| **GitHub Repo**          | [https://github.com/cs1060f25/noteai-project](https://github.com/cs1060f25/noteai-project) |
| **Google Drive Folder**  | [https://drive.google.com/drive/folders/1_EZt-vSreHZA9UMcIAoyl-5W0WhwjE9Q?usp=drive_link](https://drive.google.com/drive/folders/1_EZt-vSreHZA9UMcIAoyl-5W0WhwjE9Q?usp=drive_link) |
| **Linear Project**       | [https://linear.app/cs1060f25/team/NOTEAI/all](https://linear.app/cs1060f25/team/NOTEAI/all) |

## License

© 2025 NoteAI Team – CS1060, Harvard University
Educational use only.
