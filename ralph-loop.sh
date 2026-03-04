#!/bin/bash
set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <prd-file> <iterations>"
  exit 1
fi

PRD_FILE="$1"
ITERATIONS="$2"

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: PRD file '$PRD_FILE' not found."
  exit 1
fi

for ((i=1; i<=ITERATIONS; i++)); do
  echo "=== Iteration $i of $ITERATIONS ==="

  result=$(claude --dangerously-skip-permissions -p "@$PRD_FILE @progress.txt \
  1. Find highest-priority non-blocked incomplete task and implement ONLY THAT ONE TASK. \
  2. Run 'bun check' and 'bun check:types' to verify. Fix any issues. \
  3. Run /simplify to review and clean up the implementation. \
  4. Update the PRD with what was done. \
  5. Append progress to progress.txt. Keep progress.txt EXTREMELY concise — one line or none, no fluff. \
  6. Commit your changes. \
  ONLY WORK ON A SINGLE TASK. \
  If the PRD is fully complete, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done

echo "Finished $ITERATIONS iterations without completing the PRD."
