#!/bin/bash
# Run tests with pytest

set -e

echo "🧪 Running tests..."
uv run pytest tests/ -v

echo "✅ Tests complete!"
