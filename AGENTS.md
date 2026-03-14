# AGENTS.md

## Task Completion Requirements

- Both `bun check` and `bun check-types` must pass before considering tasks completed. You can run `bun fix` to auto-fix linting and formatting issues
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

"Before you ship" is an AI tool that bridges the gap of technical expertise between engineers and other stakeholders in the project.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there are shared logic that can be extracted to a separate module. Duplicate logic across mulitple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Code Style

- Prefer React composition over conditionals in JSX output.


Docs:

- Daytona: https://www.daytona.io/docs/en.md
