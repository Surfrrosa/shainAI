#!/bin/bash

# Install ShainAI git hook in a repository
# Usage: ./install-git-hook.sh [path-to-repo]

REPO_PATH="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SOURCE="$SCRIPT_DIR/git-post-commit-hook.sh"
HOOK_DEST="$REPO_PATH/.git/hooks/post-commit"

# Check if repo exists
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "❌ Error: $REPO_PATH is not a git repository"
  exit 1
fi

# Check if hook already exists
if [ -f "$HOOK_DEST" ]; then
  echo "⚠️  Hook already exists at $HOOK_DEST"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi

# Copy hook
cp "$HOOK_SOURCE" "$HOOK_DEST"
chmod +x "$HOOK_DEST"

echo "✅ ShainAI git hook installed at $HOOK_DEST"
echo ""
echo "Now, every time you commit in this repo, changed text files will"
echo "automatically be ingested into your ShainAI second brain."
echo ""
echo "Project name: $(basename $REPO_PATH)"
