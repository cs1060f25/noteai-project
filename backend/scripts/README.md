# Development Scripts

Utility scripts for common development tasks.

## Available Scripts

### Code Quality

- **`./scripts/lint.sh`** - Run Ruff linter (check for issues)
- **`./scripts/lint-fix.sh`** - Run Ruff linter with auto-fix
- **`./scripts/format.sh`** - Format code with Black
- **`./scripts/format-check.sh`** - Check formatting without making changes
- **`./scripts/check-all.sh`** - Run all quality checks (lint + format + type check)

### Testing

- **`./scripts/test.sh`** - Run tests with pytest
- **`./scripts/test-cov.sh`** - Run tests with coverage report

### Development

- **`./scripts/dev.sh`** - Start development server with auto-reload
- **`./scripts/docker-up.sh`** - Start all Docker containers
- **`./scripts/docker-down.sh`** - Stop all Docker containers

## Usage Examples

```bash
# Before committing code
./scripts/check-all.sh

# Fix linting issues automatically
./scripts/lint-fix.sh

# Format code
./scripts/format.sh

# Start development server
./scripts/dev.sh

# Start with Docker
./scripts/docker-up.sh
```

## Pre-commit Workflow

Recommended workflow before committing:

```bash
# 1. Format code
./scripts/format.sh

# 2. Fix linting issues
./scripts/lint-fix.sh

# 3. Run all checks
./scripts/check-all.sh

# 4. Commit if all checks pass
git add .
git commit -m "your message"
```
