#!/bin/bash
set -e

# Symlink gitignored .env files from project root into worktree
PROJECT_ROOT="${T3CODE_PROJECT_ROOT:-.}"

find "$PROJECT_ROOT" -name '.env*' \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' | while read -r f; do
  rel="${f#$PROJECT_ROOT/}"
  ln -sf "$f" "$T3CODE_WORKTREE_PATH/$rel"
done
