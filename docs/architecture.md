# Architecture

## Tech Stack

- **Frontend**: React 19 + Vite + TanStack Router
- **Backend**: Convex (database, real-time subscriptions, serverless functions)
- **AI**: Vercel AI SDK + Convex Agent component (built-in message history, tool calling, memory). Provider-flexible via AI SDK — starting with Anthropic (Claude) but swappable to any provider.
- **Auth**: Better Auth
- **Codebase access**: Daytona sandboxes
- **Styling**: Tailwind CSS v4 + shadcn

## Data Boundaries

Clear separation between repo data and app data:

- **Daytona sandbox** — read-only mirror of the Git repo. Nothing else stored here.
- **Convex** — all app data: projects, tasks, docs, conversations, triage items.

The AI agent has tools for both, picks the right one based on what it needs.

## AI Agent Design

The AI conversation uses an **agent loop** pattern: reason → call tools → verify → respond. The agent is powered by Convex's agent component, which provides:

- Persistent message history per conversation
- Tool calling (the agent can invoke tools mid-conversation)
- Memory across conversations within a project

### Project Context Injection

Every conversation receives a **project description** in the system prompt. This gives the AI baseline context without needing to explore from scratch each time.

The project description is:
- Auto-generated on first repo connect (AI reads README + file tree, produces a summary)
- Editable by the user (they know their project best)
- Stored in Convex as part of the project record

Similar to `CLAUDE.md` / `AGENTS.md` conventions used by coding agents.

### Conversation UX

**Starting a conversation:**
- From a triage item — context is pre-loaded, AI already knows the raw idea
- From scratch — blank slate, user describes what they want

**During the conversation:**
- User describes their idea/bug/feature in plain language
- AI asks clarifying questions (one or two at a time, not a wall)
- AI reads the codebase in the background (user sees "Analyzing codebase...", not raw file contents)
- AI surfaces technical insights in plain language

**Plan proposal:**
- The AI does NOT always produce a plan — sometimes the user is just exploring
- The system prompt biases toward planning: when the discussion reaches a clear direction, the AI offers to create a plan
- The plan renders as a **structured card** in the chat (not plain text), showing:
  - Proposed tasks (title + brief per task)
  - Feasibility/complexity signal per task
  - Affected areas of the codebase
  - An approve button
- User can **approve** (tasks are created) or **reject/request changes** via chat
- AI revises and produces a new plan card — loop until approved or user walks away
- Once approved, the card locks and shows what was created

### Conversation Phases

**Phase 1: Research & Discuss**
- Agent can use all read tools (codebase, docs, tasks)
- Agent discusses feasibility, impact, asks clarifying questions
- Agent may propose a plan when the conversation naturally reaches that point

**Phase 2: Execute (only after user approval)**
- User approves the proposed plan card
- Agent creates/updates tasks based on the approved plan
- Write tools are only called after explicit user confirmation

### Agent Tools

#### Read Tools (available throughout conversation)

| Tool | Source | Purpose |
|------|--------|---------|
| `list_files(path)` | Daytona | Browse the repo file tree |
| `read_file(path)` | Daytona | Read a specific file's contents |
| `search_code(query)` | Daytona | Grep/ripgrep across the codebase |
| `search_docs(query)` | Convex (vector) | Semantic search over project docs |
| `search_tasks(query)` | Convex (vector) | Find related/duplicate tasks |

#### Write Tools (only after user approves the plan)

| Tool | Source | Purpose |
|------|--------|---------|
| `create_task(...)` | Convex | Create a new vetted task |
| `update_task(...)` | Convex | Add notes or update an existing task |

#### Planning Tool

| Tool | Purpose |
|------|---------|
| `propose_plan(...)` | Present a summary of proposed task changes for user review |

### Vector Search

Convex's built-in vector search is used for semantic search over docs and tasks. This allows the AI to find relevant context even when exact keywords don't match (e.g., "authentication" finds tasks about "login flow").

## Codebase Access via Daytona

[Daytona](https://www.daytona.io/) provides secure, isolated sandboxes with a TypeScript SDK. This is how the AI reads the codebase.

**Why Daytona:**

- Provider-agnostic — works with any Git URL (GitHub, GitLab, Azure DevOps, Bitbucket, self-hosted)
- TypeScript SDK — matches our stack
- Built-in Git clone, file system read, and code search
- No need to build/maintain a file server
- If we ever need to run code (e.g., run tests), the sandbox already supports it

**Flow:**

1. User creates a project and connects a Git repo (via OAuth for their provider)
2. Daytona creates a sandbox and clones the repo
3. On push events (webhook), the sandbox pulls latest changes
4. AI agent tools call the Daytona SDK to read files, search code, etc.

**Integration notes:**
- Daytona tools run as Convex actions (not queries/mutations) since they make external HTTP calls
- File tree is cached in Convex after first load to reduce latency on repeated access

## Git Provider Integration

The app supports multiple Git providers. Each provider needs:

- OAuth flow for user authentication
- Webhook registration for push events (keep sandbox in sync)
- Token passed to Daytona for private repo access

Supported providers: GitHub, GitLab, Azure DevOps, Bitbucket, self-hosted Git.

## Real-Time Updates

Convex provides reactive queries out of the box. When a conversation produces tasks, the UI updates instantly for all connected users.
