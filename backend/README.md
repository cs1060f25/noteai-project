# Lecture Highlight Extractor - Backend

AI-powered lecture video processing pipeline built with FastAPI and Celery.

## Tech Stack

- **Framework**: FastAPI
- **Task Queue**: Celery
- **Broker/Cache**: Redis
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Storage**: AWS S3 + CloudFront
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

## Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager
- Docker and Docker Compose (for containerized setup)

## Setup

### 1. Install uv (if not already installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Create virtual environment and install dependencies

```bash
# Create virtual environment
uv venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows

# Install dependencies
uv pip install -e ".[dev]"
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run with Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The API will be available at `http://localhost:8000`.

### 5. Run locally (without Docker)

```bash
# Start Redis (required)
redis-server

# Run the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Development

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

When running in development mode, API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Health Check

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

## Environment Variables

See `.env.example` for all available configuration options.

### Required for Production

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `OPENAI_API_KEY` (for Whisper transcription)
- `GEMINI_API_KEY` (for content analysis)
- `SECRET_KEY` (generate a secure random key)

## License

MIT
