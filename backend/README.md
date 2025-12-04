# NoteAI Backend

AI-powered lecture video processing pipeline built with FastAPI and Celery.

## Overview

The NoteAI backend handles video upload, processing orchestration, and results delivery. It uses a multi-agent pipeline to transform long lecture videos into short, engaging highlights with AI-powered content analysis.

## Tech Stack

- **Framework**: FastAPI
- **Task Queue**: Celery
- **Broker/Cache**: Redis
- **Database**: PostgreSQL (development & production)
- **Storage**: AWS S3
- **AI Services**: Google Gemini
- **Video Processing**: FFmpeg, MoviePy, OpenCV
- **Auth**: Clerk (JWT-based)
- **Monitoring**: Prometheus + Grafana
- **Runtime**: Python 3.11+, uv package manager
- **Containerization**: Docker + Docker Compose

## Project Structure

```
backend/
├── app/                    # Main application package
│   ├── api/                # API endpoints
│   ├── core/               # Core functionality (settings, logging, security)
│   ├── models/             # Database models and Pydantic schemas
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── .env                    # Environment variables (create from .env.example)
├── pyproject.toml          # Project configuration
└── docker-compose.yml      # Docker configuration
```

## Quick Start

### Prerequisites

- **Docker Desktop** installed and running
- **Python 3.11+** (optional, for local development without Docker)

### Installation

#### 1. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration. **Required variables:**

```bash
# AWS S3 (for video storage)
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXX
CLERK_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXX

# Database (already configured for Docker)
DATABASE_URL=postgresql://lecture_user:lecture_password@127.0.0.1:5432/lecture_extractor

# Redis (already configured for Docker)
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

**Where to get API keys:**

- **AWS Credentials**: [AWS Console](https://console.aws.amazon.com/iam/) → Create IAM user with S3 access
- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Clerk Keys**: [Clerk Dashboard](https://dashboard.clerk.com) (Free tier: 10,000 MAU/month)

#### 2. Start the Backend

```bash
docker-compose up -d
```

This command will:

- Pull and build all Docker images
- Start PostgreSQL database
- Start Redis for task queue
- Start FastAPI API server (port 8000)
- Start Celery worker for video processing
- Start monitoring services (Prometheus, Grafana)

**Verify the backend is running:**

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "environment": "development"
}
```

#### 3. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api      # FastAPI server
docker-compose logs -f worker   # Celery worker
docker-compose logs -f db       # PostgreSQL
docker-compose logs -f redis    # Redis
```

#### 4. Stop the Backend

```bash
# Stop all services
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

### Running Without Docker (Alternative)

If you prefer to run without Docker:

```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment
uv venv
source .venv/bin/activate  # macOS/Linux
# or .venv\Scripts\activate  # Windows

# Install dependencies
uv pip install -e ".[dev]"

# Start PostgreSQL (install separately)
createdb lecture_extractor

# Start Redis (install separately)
redis-server

# Run the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# In another terminal, start Celery worker
celery -A pipeline.celery_app worker --loglevel=info
```

## Available Services

When running with Docker Compose, the following services are available:

| Service         | Port | URL                         | Description                         |
| --------------- | ---- | --------------------------- | ----------------------------------- |
| **FastAPI API** | 8000 | http://localhost:8000       | Main API server                     |
| **API Docs**    | 8000 | http://localhost:8000/docs  | Swagger UI (interactive API docs)   |
| **ReDoc**       | 8000 | http://localhost:8000/redoc | Alternative API documentation       |
| **PostgreSQL**  | 5432 | localhost:5432              | Database                            |
| **Redis**       | 6379 | localhost:6379              | Task queue & cache                  |
| **Prometheus**  | 9090 | http://localhost:9090       | Metrics collection                  |
| **Grafana**     | 3000 | http://localhost:3000       | Monitoring dashboards (admin/admin) |

## Development

### Database Management

The project uses PostgreSQL with Alembic for migrations.

```bash
# Access PostgreSQL container
docker-compose exec db psql -U lecture_user -d lecture_extractor

# Run migrations (once implemented)
docker-compose exec api alembic upgrade head

# Create a new migration
docker-compose exec api alembic revision --autogenerate -m "description"

# Rollback migration
docker-compose exec api alembic downgrade -1

# View migration history
docker-compose exec api alembic history
```

**PostgreSQL commands:**

```sql
-- List all tables
\dt

-- Describe a table
\d table_name

-- List all databases
\l

-- Quit
\q
```

### Code Quality

The project uses Ruff and Black for linting and formatting:

```bash
# Check code with Ruff
ruff check .

# Fix auto-fixable issues
ruff check . --fix

# Format code with Black
black .

# Type checking
mypy .
```

### Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## API Documentation

### Base URL

```
http://localhost:8000/api/v1
```

### Authentication

All endpoints require **Clerk JWT authentication** (except `/health` and `/contact`):

```bash
Authorization: Bearer <your_clerk_jwt_token>
```

### Main Endpoint Groups

- **Upload**: `/upload`, `/upload/confirm`, `/upload/from-youtube`
- **Jobs**: `/jobs`, `/jobs/{id}`, `/jobs/{id}/podcast`
- **Results**: `/results/{id}`, `/results/{id}/export-transcript`
- **Quiz**: `/jobs/{id}/quiz`, `/quizzes`, `/quizzes/{id}`
- **User**: `/users/me`, `/users/api-keys`
- **Dashboard**: `/dashboard`
- **Admin**: `/admin/jobs`, `/admin/users`, `/admin/metrics`
- **WebSocket**: `/ws/jobs/{id}` (real-time progress)
- **System**: `/health`, `/metrics`, `/contact`

### Interactive Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Processing Pipeline

Sequential Celery pipeline with real-time WebSocket updates:

1. **Silence Detection** - PyDub/librosa
2. **Transcription** - Google Gemini
3. **Content Analysis** - Gemini AI
4. **Segment Extraction** - Highlight selection
5. **Video Compilation** - FFmpeg

## License

MIT
