#!/bin/bash

# ShainAI Git Post-Commit Hook
# This hook automatically ingests changed files after each commit
#
# To install:
# 1. Copy this file to your repo's .git/hooks/post-commit
# 2. Make it executable: chmod +x .git/hooks/post-commit
# 3. Optionally set SHAINAI_PROJECT env var to override project name

# Configuration
SHAINAI_DIR="${SHAINAI_DIR:-$HOME/projects/shainai}"
PROJECT="${SHAINAI_PROJECT:-$(basename $(git rev-parse --show-toplevel))}"

# Only ingest if ShainAI is installed
if [ ! -d "$SHAINAI_DIR" ]; then
  exit 0
fi

# Get changed files in last commit
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# Filter for text files we care about
TEXT_FILES=""
for file in $CHANGED_FILES; do
  case "$file" in
    *.md|*.txt|*.js|*.ts|*.jsx|*.tsx|*.py|*.rb|*.go|*.rs)
      if [ -f "$file" ]; then
        TEXT_FILES="$TEXT_FILES $file"
      fi
      ;;
  esac
done

# Ingest changed files if any
if [ -n "$TEXT_FILES" ]; then
  echo "📝 ShainAI: Ingesting ${#TEXT_FILES[@]} changed files..."

  # Run ingestion in background to not slow down git
  (
    cd "$SHAINAI_DIR/ingest"
    for file in $TEXT_FILES; do
      FULL_PATH="$(git rev-parse --show-toplevel)/$file"
      node src/github.js "$PROJECT" "$FULL_PATH" 2>&1 | grep -E "(✓|✗)" &
    done
  ) &
fi

exit 0
