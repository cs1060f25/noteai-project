#!/bin/bash
# Run tests with coverage report

set -e

echo "🧪 Running tests with coverage..."
uv run pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=html

echo "✅ Tests complete! Coverage report generated in htmlcov/"
