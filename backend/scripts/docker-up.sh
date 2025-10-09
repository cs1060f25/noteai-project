#!/bin/bash
# Start Docker containers

set -e

echo "🐳 Starting Docker containers..."
docker-compose up --build
