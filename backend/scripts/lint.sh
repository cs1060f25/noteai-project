#!/bin/bash
# Run Ruff linter

set -e

echo "🔍 Running Ruff linter..."
uv run ruff check app tests

echo "✅ Linting complete!"
