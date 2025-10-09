#!/bin/bash
# Check code formatting with Black (no changes)

set -e

echo "🎨 Checking code formatting with Black..."
uv run black app tests --check

echo "✅ Format check complete!"
