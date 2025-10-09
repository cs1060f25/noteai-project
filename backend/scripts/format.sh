#!/bin/bash
# Format code with Black

set -e

echo "🎨 Formatting code with Black..."
uv run black app tests

echo "✅ Formatting complete!"
