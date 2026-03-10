# Before You Ship

An AI-powered technical advisor that helps non-technical team members refine feature requests and bug reports into dev-ready briefs — before they ever reach a developer.

## Features

- **AI Conversations** - Chat with an AI that has codebase access to understand feasibility, refine requests, and surface edge cases
- **Triage Inbox** - Low-friction capture for ideas, bugs, and feature requests
- **Dev-Ready Briefs** - Conversations produce scoped, vetted tasks that developers can work from
- **Project Docs** - Lightweight knowledge base with semantic search that the AI references during conversations
- **Git Integration** - Connect GitHub, GitLab, Azure DevOps, or Bitbucket repos

## Tech Stack

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Convex** - Reactive backend-as-a-service platform
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Copy environment variables from `packages/backend/.env.local` to `apps/*/.env`.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Your app will connect to the Convex cloud backend automatically.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
before-you-ship/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
├── packages/
│   ├── backend/     # Convex backend functions and schema
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run check-types`: Check TypeScript types across all apps
- `bun run check`: Run Biome formatting and linting
- `bun run -F web test:logic`: Run frontend business-logic tests in Vitest
- `bun run test:e2e`: Run Playwright end-to-end coverage for the web app

## Frontend Testing

Frontend testing is split into two layers:

- `Vitest` for pure business logic under `apps/web/src/lib` and `apps/web/src/features`
- `Playwright` for real-browser E2E flows against the running Convex-backed app

### Required Environment

The E2E suite expects a running dev stack plus the usual app environment variables:

- `VITE_CONVEX_URL`
- `VITE_CONVEX_SITE_URL`
- `SITE_URL`

`CONVEX_E2E_SECRET` is optional for local runs. If you set it, the E2E bootstrap routes require the matching `x-e2e-secret` header. If you do not set it, those routes are only available from localhost.

### Local Workflow

Start the app stack:

```bash
bun run dev
```

Run frontend logic tests:

```bash
bun run -F web test:logic
```

Run the full Playwright suite:

```bash
bun run test:e2e
```

Run a single Playwright spec:

```bash
bun run -F web test:e2e -- e2e/tasks.spec.ts
```

Refresh the seeded E2E scenario manually:

```bash
curl -X POST \
  http://127.0.0.1:3001/api/e2e/reset

curl -X POST \
  -H "content-type: application/json" \
  -d '{"runId":"manual-seed"}' \
  http://127.0.0.1:3001/api/e2e/bootstrap
```

If `CONVEX_E2E_SECRET` is configured, add `-H "x-e2e-secret: $CONVEX_E2E_SECRET"` to both requests.
