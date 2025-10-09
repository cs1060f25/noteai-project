#!/bin/bash
# Run Ruff linter with auto-fix

set -e

echo "🔧 Running Ruff linter with auto-fix..."
uv run ruff check app tests --fix

echo "✅ Linting with fixes complete!"
