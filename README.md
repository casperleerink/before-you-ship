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
