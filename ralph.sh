#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <prd-file>"
  exit 1
fi

PRD_FILE="$1"

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: PRD file '$PRD_FILE' not found."
  exit 1
fi

echo "=== Running single task from $PRD_FILE ==="

claude --dangerously-skip-permissions -p "@$PRD_FILE @progress.txt \
1. Read the PRD and progress file. \
2. Find the next incomplete task and implement ONLY THAT ONE TASK. \
3. Run 'bun check' and 'bun check:types' to verify. Fix any issues. \
4. Update progress.txt with what you did. Keep it EXTREMELY concise — one line, no fluff. \
5. Commit your changes. \
ONLY DO ONE TASK AT A TIME."

echo "=== Done ==="
