#!/bin/bash

# install git hooks for the project

set -e

echo "📦 Installing git hooks..."

# get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# create .git/hooks directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.git/hooks"

# copy pre-commit hook
cp "$PROJECT_ROOT/scripts/pre-commit" "$PROJECT_ROOT/.git/hooks/pre-commit"
chmod +x "$PROJECT_ROOT/.git/hooks/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now run before each commit to check:"
echo "  • Frontend: Prettier formatting, ESLint, TypeScript type checking"
echo "  • Backend: Ruff linting, Black formatting"
echo ""
echo "To skip the hook (not recommended), use: git commit --no-verify"
