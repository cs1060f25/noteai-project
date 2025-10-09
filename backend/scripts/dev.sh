#!/bin/bash
# Start development server

set -e

echo "🚀 Starting development server..."
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
