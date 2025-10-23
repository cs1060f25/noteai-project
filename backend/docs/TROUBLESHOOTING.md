# Troubleshooting Guide

Common issues and solutions when developing the lecture highlight extractor backend.

## Table of Contents
- [Python Version Issues](#python-version-issues)
- [FFmpeg Issues](#ffmpeg-issues)
- [Architecture Mismatch (Apple Silicon)](#architecture-mismatch-apple-silicon)
- [Database Issues](#database-issues)
- [S3 Connection Issues](#s3-connection-issues)

---

## Python Version Issues

### Error: `TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'`

**Cause:** The codebase uses Python 3.10+ union syntax (`str | None`) but you're running Python 3.9.

**Solution:**
```bash
# Check your Python version
python3 --version

# If < 3.10, install Python 3.10 or higher
# macOS (Homebrew)
arch -arm64 brew install python@3.11

# Then recreate your virtual environment
rm -rf .venv
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
pip install uv
uv sync
```

### Error: `ImportError: incompatible architecture (have 'x86_64', need 'arm64')`

**Cause:** You're on Apple Silicon but have packages compiled for Intel (x86_64).

**Solution:**
```bash
# Remove old virtual environment
rm -rf .venv

# Use native ARM Python
arch -arm64 /opt/homebrew/bin/python3 -m venv .venv
source .venv/bin/activate
pip install uv
uv sync
```

---

## FFmpeg Issues

### Error: `RuntimeWarning: Couldn't find ffmpeg or avconv`

**Cause:** PyDub requires ffmpeg to process audio from video files.

**Solution:**
```bash
# macOS (Homebrew)
arch -arm64 brew install ffmpeg

# Verify installation
which ffmpeg
ffmpeg -version

# Add to PATH if needed
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Error: `ffmpeg: command not found` in Docker

**Cause:** Docker container doesn't have ffmpeg installed.

**Solution:**
Already handled in the Dockerfile. If building custom image, ensure:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

---

## Architecture Mismatch (Apple Silicon)

### Error: `Cannot install under Rosetta 2 in ARM default prefix`

**Cause:** Running Homebrew under Rosetta but trying to install in ARM location.

**Solution:**
```bash
# Always use arch prefix for ARM installations
arch -arm64 brew install <package>

# Or set up ARM terminal profile
# In Terminal.app: Duplicate profile, uncheck "Open using Rosetta"
```

### Checking Your Architecture

```bash
# Check architecture
uname -m
# arm64 = Apple Silicon native
# x86_64 = Intel or Rosetta 2

# Check Python architecture
python3 -c "import platform; print(platform.machine())"

# Check which Homebrew you're using
which brew
# /opt/homebrew/bin/brew = ARM
# /usr/local/bin/brew = Intel (Rosetta)
```

---

## Database Issues

### Error: `sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) unable to open database file`

**Cause:** Database file or directory doesn't exist, or permission issues.

**Solution:**
```bash
# Create data directory
mkdir -p backend/data

# Set correct permissions
chmod 755 backend/data

# Or use PostgreSQL instead
# Update DATABASE_URL in .env:
DATABASE_URL=postgresql://lecture_user:lecture_password@localhost:5432/lecture_extractor
```

### Error: `psycopg2.OperationalError: could not connect to server`

**Cause:** PostgreSQL is not running or connection settings are wrong.

**Solution:**
```bash
# Start PostgreSQL with Docker
docker-compose up -d db

# Check if it's running
docker-compose ps db

# Test connection
docker exec -it lecture-extractor-db psql -U lecture_user -d lecture_extractor

# Check connection string in .env matches docker-compose.yml
```

### Running Migrations

```bash
# Run all pending migrations
uv run alembic upgrade head

# Check migration status
uv run alembic current

# Create new migration
uv run alembic revision --autogenerate -m "description"
```

---

## S3 Connection Issues

### Error: `botocore.exceptions.NoCredentialsError: Unable to locate credentials`

**Cause:** AWS credentials not configured.

**Solution:**
```bash
# Option 1: Set in .env file
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1

# Option 2: Use AWS CLI
aws configure

# Option 3: Use IAM role (in production)
```

### Error: `botocore.exceptions.ClientError: An error occurred (403) Forbidden`

**Cause:** IAM user/role doesn't have required permissions.

**Solution:**
Ensure your IAM user has these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

### Error: `botocore.exceptions.EndpointConnectionError`

**Cause:** Cannot reach S3 endpoint (network issue or wrong region).

**Solution:**
```bash
# Check AWS region in .env matches your bucket region
AWS_REGION=us-east-1  # Change to your bucket's region

# Test connectivity
ping s3.amazonaws.com

# Check bucket exists
aws s3 ls s3://your-bucket-name
```

---

## Redis Issues

### Error: `redis.exceptions.ConnectionError: Error connecting to Redis`

**Cause:** Redis is not running.

**Solution:**
```bash
# Start Redis with Docker
docker-compose up -d redis

# Check if it's running
docker-compose ps redis

# Test connection
redis-cli ping
# Should return: PONG

# Check connection string in .env
REDIS_URL=redis://localhost:6379/0
```

---

## Celery Worker Issues

### Error: `celery.exceptions.NotRegistered: 'pipeline.tasks.process_video'`

**Cause:** Celery can't find task definitions.

**Solution:**
```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=/path/to/backend:$PYTHONPATH

# Restart worker
docker-compose restart worker

# Check worker logs
docker-compose logs -f worker
```

### Worker Not Processing Tasks

**Solution:**
```bash
# Check if worker is running
celery -A pipeline.celery_app inspect active

# Check registered tasks
celery -A pipeline.celery_app inspect registered

# Purge queue and restart
celery -A pipeline.celery_app purge
docker-compose restart worker
```

---

## Import Errors

### Error: `ModuleNotFoundError: No module named 'app'`

**Cause:** Running Python from wrong directory or PYTHONPATH not set.

**Solution:**
```bash
# Always run from backend directory
cd backend

# Or set PYTHONPATH
export PYTHONPATH=/path/to/backend:$PYTHONPATH

# Use uv run to ensure correct environment
uv run python script.py
```

---

## Test Issues

### Tests Failing with Import Errors

**Solution:**
```bash
# Ensure you're in backend directory
cd backend

# Install test dependencies
uv sync

# Run with uv to ensure correct environment
uv run pytest tests/ -v

# Run specific test file
uv run pytest tests/test_silence_detector.py -v
```

### Tests Slow or Hanging

**Solution:**
```bash
# Run tests in parallel
uv run pytest tests/ -n auto

# Skip slow integration tests
uv run pytest tests/ -m "not slow"

# Increase timeout
uv run pytest tests/ --timeout=60
```

---

## Docker Issues

### Error: `ERROR: Couldn't connect to Docker daemon`

**Cause:** Docker is not running.

**Solution:**
```bash
# Start Docker Desktop (macOS)
open -a Docker

# Wait for Docker to start
docker ps

# Check Docker status
docker info
```

### Container Keeps Restarting

**Solution:**
```bash
# Check logs
docker-compose logs api
docker-compose logs worker

# Common causes:
# 1. Database not ready - wait for healthcheck
# 2. Missing .env file - create from .env.example
# 3. Port already in use - change port in docker-compose.yml
```

---

## Getting Help

If you encounter an issue not covered here:

1. **Check logs:**
   ```bash
   # Application logs
   docker-compose logs -f api

   # Worker logs
   docker-compose logs -f worker

   # All logs
   docker-compose logs -f
   ```

2. **Search existing issues:**
   - Check GitHub issues
   - Search Stack Overflow
   - Check library documentation

3. **Create a minimal reproduction:**
   - Isolate the problem
   - Create a small test case
   - Document steps to reproduce

4. **Ask for help:**
   - Open a GitHub issue with full error message and logs
   - Include environment details (OS, Python version, etc.)
   - Provide reproduction steps
