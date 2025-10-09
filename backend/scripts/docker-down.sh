#!/bin/bash
# Stop Docker containers

set -e

echo "🐳 Stopping Docker containers..."
docker-compose down
