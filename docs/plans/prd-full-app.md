# PRD: AI-Powered Technical Advisor for Non-Technical Teams

## Introduction / Overview

**Problem:** PMs, designers, and clients lack technical context when proposing features or reporting bugs. Developers waste time going back and forth explaining complexity, feasibility, and scope.

**Solution:** An AI layer with codebase access that guides non-technical users through refining ideas into dev-ready tasks — before they reach a developer.

**Summary:** Users create projects connected to Git repos. They submit raw ideas (triage), have AI-guided conversations that explore feasibility and impact, and produce vetted, scoped tasks that devs work from. The AI reads the codebase via Daytona sandboxes and references project docs via vector search.

**Tech Stack:**
- Frontend: React 19 + Vite + TanStack Router + Tailwind CSS v4 + shadcn
- Backend: Convex (database, real-time, serverless functions)
- AI: Vercel AI SDK + Convex Agent component (Anthropic/Claude, provider-swappable)
- Auth: Better Auth
- Codebase access: Daytona sandboxes
- Desktop-only (no mobile layout)
- Deployment: Convex cloud for backend, frontend hosting TBD

IMPORTANT: When your task involves using external packages. Please confirm your thoughts with a quick research on how this package actually works before implementing it.

---

## Goals

1. Non-technical users can refine feature ideas into scoped, dev-ready tasks without developer involvement
2. AI has live codebase access to provide accurate feasibility and complexity assessments
3. All tasks are pre-vetted through AI conversation — no unscoped work reaches developers
4. Real-time collaboration — changes propagate instantly to all connected users
5. Support multiple Git providers (GitHub, GitLab, Azure DevOps, Bitbucket, self-hosted)

---

## List of Tasks

### Auth & Users
- [ ] Better Auth integration with sign-in/sign-up forms
- [x] User sync hook: on sign-up, create app-level user record in Convex from Better Auth user
- [ ] Auth redirect: after sign-in → org selector (or skip if single org)
- [ ] Session management and protected routes

### Organizations
- [ ] Create organization flow (name, creator becomes owner)
- [ ] Org selector screen: list orgs user belongs to, create new org, auto-skip if single org
- [ ] Member management: invite by email, accept invite, assign roles (owner/admin/member)
- [ ] Role-based access: owner=full control, admin=manage projects/members, member=use app

### Projects
- [ ] Projects list screen: grid/list of projects in current org
- [ ] Create project flow: name, optional repo connection
- [ ] Project view layout: sidebar (project name, nav, quick-add triage) + main content area
- [ ] Project settings: edit name/description, connect/disconnect Git repo, sandbox status
- [ ] Auto-generate project description on first repo connect (AI reads README + file tree)

### Git Provider Integration
- [ ] OAuth flow for GitHub, GitLab, Azure DevOps, Bitbucket
- [ ] Self-hosted Git URL support
- [ ] Webhook registration for push events (keep sandbox in sync)
- [ ] Token management: pass OAuth tokens to Daytona for private repo access

### Daytona Sandbox Integration
- [ ] Create sandbox on repo connect (clone repo)
- [ ] Webhook handler: pull latest changes on push events
- [ ] Cache file tree in Convex after first load
- [ ] Implement agent tools: `list_files(path)`, `read_file(path)`, `search_code(query)`
- [ ] Tools run as Convex actions (external HTTP calls to Daytona SDK)

### Triage
- [ ] Triage inbox screen: list items newest-first, status indicator (pending/converted)
- [ ] Quick-add triage: text input + submit, accessible from sidebar in any project section
- [ ] Click pending item → option to start conversation from it
- [ ] Click converted item → navigate to linked conversation
- [ ] Mark triage item as `converted` when conversation starts from it

### Conversations
- [ ] Conversations list screen: AI-generated title, status, date
- [ ] Conversation detail: full-page chat interface with back button
- [ ] Start conversation from scratch (blank slate)
- [ ] Start conversation from triage item (context pre-loaded)
- [ ] Convex agent thread creation with persistent message history
- [ ] System prompt injection: project description + available tools
- [ ] AI behavior: ask clarifying questions (1-2 at a time), surface technical insights in plain language
- [ ] "Analyzing codebase..." indicator when AI reads files (hide raw file contents from user)
- [ ] Plan proposal: structured card in chat (proposed tasks with title/brief, complexity/feasibility signal, affected areas, approve button)
- [ ] Plan approve flow: user approves → tasks created, card locks showing what was created
- [ ] Plan reject/revise flow: user requests changes via chat → AI produces new plan card
- [ ] Conversation status management: active, completed, abandoned
- [ ] AI-generated conversation title after first few messages

### AI Agent
- [ ] Agent loop: reason → call tools → verify → respond
- [ ] Read tools (always available): `list_files`, `read_file`, `search_code`, `search_docs`, `search_tasks`
- [ ] Write tools (only after plan approval): `create_task`, `update_task`
- [ ] Planning tool: `propose_plan` — renders structured plan card in chat
- [ ] Phase 1 (Research & Discuss): all read tools, discussion, optional plan proposal
- [ ] Phase 2 (Execute): only after user approves plan card, creates/updates tasks

### Vector Search
- [ ] Convex vector search index on tasks (embedding field)
- [ ] Convex vector search index on docs (embedding field)
- [ ] `search_docs(query)` tool: semantic search over project docs
- [ ] `search_tasks(query)` tool: find related/duplicate tasks
- [ ] Embedding generation on task/doc create and update

### Tasks
- [ ] Tasks list screen: table with title, status, risk, complexity, effort, assignee columns
- [ ] Filter by status, assignee, risk, complexity, effort
- [ ] Task detail: sheet slide-over from right showing all fields
- [ ] Editable fields in detail: assignee, status
- [ ] Markdown-rendered brief in detail view
- [ ] Link back to origin conversation from task detail
- [ ] Risk/complexity/effort badges (low/medium/high)
- [ ] Affected areas display (codebase paths)

### Docs
- [ ] Docs list screen within project
- [ ] Create new doc button
- [ ] Inline markdown editor for doc content
- [ ] Docs stored with embedding for vector search

### My Tasks (Cross-Project)
- [ ] Top-level nav item (outside project view)
- [ ] List all tasks assigned to current user across all projects in the current org
- [ ] Group or filter by project
- [ ] Same task detail sheet as within a project

### Real-Time
- [ ] Convex reactive queries for instant UI updates
- [ ] When conversation produces tasks, all connected users see updates immediately

---

## Functional Requirements

### Auth & Users

**FR-1:** Better Auth handles sign-in/sign-up with email/password and OAuth providers. On successful sign-up, a Convex `users` record is created via sync hook with fields: `betterAuthId`, `name`, `email`, `avatarUrl` (optional), `createdAt`.

**FR-2:** After sign-in, user is redirected to org selector. If user belongs to exactly one org, skip selector and go directly to that org's projects list.

**FR-3:** All routes except auth screens require an authenticated session. Unauthenticated access redirects to sign-in.

### Organizations

**FR-4:** Any authenticated user can create an organization. Creator is automatically assigned the `owner` role.

**FR-5:** Org selector shows all orgs the user belongs to, sorted by name. "Create new org" option always visible.

**FR-6:** Owners and admins can invite new members by email. Invited user receives email with accept link. On accept: if user has an account, they're added to the org as `member`. If not, they sign up first, then are added.

**FR-7:** Role permissions:
- `owner`: full control (delete org, manage all members and roles, manage all projects)
- `admin`: manage projects, invite/remove members (cannot delete org or change owner)
- `member`: use app (view projects, create triage items, start conversations, view tasks)

### Projects

**FR-8:** Projects belong to an organization. Any org member can create a project. Project fields: `name`, `description` (markdown, used as AI system prompt context), `repoUrl` (optional), `repoProvider` (optional), `sandboxId` (optional).

**FR-9:** Project list shows project name, repo connection status (connected/not connected), and total task count per project.

**FR-10:** On first Git repo connection, AI auto-generates a project description by reading the repo's README and file tree. This description is editable by users in project settings.

### Git & Daytona

**FR-11:** Connecting a Git repo triggers: OAuth with the Git provider → Daytona sandbox creation → repo clone → webhook registration for push events.

**FR-12:** Supported providers: GitHub, GitLab, Azure DevOps, Bitbucket, self-hosted Git (via URL).

**FR-13:** Push webhook triggers sandbox pull to sync latest code. File tree is cached in Convex after first load to reduce latency.

**FR-14:** Daytona tools (`list_files`, `read_file`, `search_code`) run as Convex actions (not queries/mutations) since they make external HTTP calls.

### Triage

**FR-15:** Triage items are text-only inputs. Fields: `projectId`, `content` (string), `status` (`pending`|`converted`), `conversationId` (optional), `createdBy`, `createdAt`.

**FR-16:** Quick-add triage is accessible via a persistent button in the project sidebar. Opens minimal UI (text input + submit), creates item, returns to current page. No page navigation required.

**FR-17:** Clicking a pending triage item offers to start a conversation from it. Starting a conversation sets `status` to `converted` and links `conversationId`.

### Conversations

**FR-18:** Conversations can start from scratch (blank) or from a triage item (AI receives triage content as initial context).

**FR-19:** Each conversation creates a Convex agent thread. The thread's system prompt includes: project description, available tools, behavioral instructions (ask 1-2 questions at a time, surface insights in plain language, bias toward planning when direction is clear).

**FR-20:** When the AI reads codebase files, the UI shows "Analyzing codebase..." — raw file contents are never shown to the user.

**FR-21:** The AI can propose a plan via `propose_plan` tool. Plan renders as a structured card in chat showing:
- List of proposed tasks (title + brief per task)
- Feasibility/complexity signal per task (low/medium/high)
- Affected areas of the codebase
- Approve button + option to request changes via chat

**FR-22:** On plan approval: tasks are created in Convex, plan card locks and displays what was created with links to the tasks.

**FR-23:** On plan rejection: user types feedback in chat, AI revises and produces a new plan card. Loop continues until approved or conversation abandoned.

**FR-24:** Conversation title is AI-generated after the first few messages. Status can be `active`, `completed`, or `abandoned`.

### AI Agent Tools

**FR-25:** Read tools (available throughout conversation):
| Tool | Source | Description |
|------|--------|-------------|
| `list_files(path)` | Daytona | Browse repo file tree |
| `read_file(path)` | Daytona | Read specific file contents |
| `search_code(query)` | Daytona | Ripgrep across codebase |
| `search_docs(query)` | Convex vector | Semantic search over project docs |
| `search_tasks(query)` | Convex vector | Find related/duplicate tasks |

**FR-26:** Write tools (only after user approves plan):
| Tool | Source | Description |
|------|--------|-------------|
| `create_task(...)` | Convex | Create a new task with all fields |
| `update_task(...)` | Convex | Update notes or fields on existing task |

**FR-27:** Planning tool:
| Tool | Description |
|------|-------------|
| `propose_plan(...)` | Present structured plan card for user review |

### Tasks

**FR-28:** Tasks are only created as output of approved conversation plans. Fields: `projectId`, `conversationId`, `title`, `brief` (markdown), `affectedAreas` (string[]), `risk` (low/medium/high), `complexity` (low/medium/high), `effort` (low/medium/high), `status` (`ready`|`in_progress`|`done`), `assigneeId` (optional), `embedding` (vector), `createdAt`.

**FR-29:** Task list view supports filtering by status, assignee, risk, complexity, and effort. Table columns: title, status, risk, complexity, effort, assignee.

**FR-30:** Task detail opens as a sheet slide-over from the right. Shows all fields, with assignee and status editable inline. Brief is rendered as markdown. Includes link to origin conversation.

### Docs

**FR-31:** Docs are per-project markdown documents. Fields: `projectId`, `title`, `content` (markdown), `embedding` (vector), `createdBy`, `createdAt`, `updatedAt`.

**FR-32:** Docs list shows all docs for a project. Clicking a doc opens an inline markdown editor. New doc button creates a blank doc.

**FR-33:** On doc create/update, an embedding is generated for vector search.

### My Tasks

**FR-34:** "My Tasks" is a top-level view outside any project. Shows all tasks assigned to the current user across all projects in the current org. Supports grouping/filtering by project. Uses the same task detail sheet.

### Real-Time

**FR-35:** All list views (triage, conversations, tasks, docs) use Convex reactive queries. Changes made by any user (including AI-created tasks) appear instantly without page refresh.

---

## Non-Goals

- **Not a project management tool** — no sprints, story points, burndown charts, kanban boards, or workflow automation
- **Not a dev tool** — no code editing, no PR creation, no CI/CD integration
- **Not generating implementation plans** — tasks contain dev-ready briefs, not step-by-step implementation instructions
- **No mobile layout** — desktop-only for now
- **No AI rate limiting** — no per-org usage caps or billing for AI usage in this version
- **No rich media triage** — no voice notes, screenshots, or file attachments in triage items (text only)
- **No notifications** — no email or in-app notification system
- **No task dependencies** — tasks are independent units; no blocking/dependency graphs
- **No multi-org task view** — "My Tasks" is scoped to the current org

---

## Design & Technical Considerations

### Architecture Constraints
- Daytona sandbox is read-only — only mirrors Git repo, no app data stored there
- Convex holds all app data — single source of truth for projects, tasks, conversations, etc.
- AI tools that call Daytona must be Convex actions (not queries/mutations) due to external HTTP calls
- File tree cached in Convex after first Daytona load to reduce latency

### Agent Design
- Agent loop pattern: reason → call tools → verify → respond
- System prompt per conversation includes project description (acts like CLAUDE.md for the AI)
- Write tools gated behind user approval — AI cannot create/update tasks without explicit plan approval
- Convex Agent component manages thread persistence, tool calling, and cross-conversation memory

### Auth Flow
- Better Auth manages sessions, OAuth tokens, password hashing
- App-level user record in Convex mirrors Better Auth identity
- Sync hook on sign-up bridges the two

### Data Integrity
- Tasks always link to a conversation (origin tracking)
- Triage items track conversion status and link to resulting conversation
- Org membership checked on every data access (no cross-org data leaks)

### Vector Search
- Convex built-in vector search for docs and tasks
- Embeddings generated on create/update
- Enables semantic search even when exact keywords don't match

---

## Testing Strategy

Testing uses **Vitest** for both frontend and backend. No E2E tests in this phase.

### Backend (Convex Functions)

**Unit/Integration tests for all Convex functions:**

- **Auth sync hook:** verify user record created in Convex on sign-up with correct fields
- **Organization CRUD:** create org, verify creator gets owner role, member count
- **Member management:** invite creates pending invite, accept adds member with correct role, role permission checks (admin can't delete org, member can't invite)
- **Project CRUD:** create project, update settings, verify org scoping
- **Triage:** create item, verify status defaults to `pending`, convert to conversation marks as `converted` and links conversation ID
- **Conversations:** create from scratch, create from triage item, status transitions (active → completed/abandoned)
- **Tasks:** create task with all fields, update assignee/status, verify embedding generated, verify conversation link
- **Docs:** create/update doc, verify embedding generated
- **Agent tools:** mock Daytona SDK, verify `list_files`/`read_file`/`search_code` return expected shapes. Verify write tools reject calls when no approved plan exists
- **Vector search:** verify `search_docs` and `search_tasks` return relevant results for semantic queries
- **Access control:** verify org-scoped queries don't return data from other orgs. Verify role checks on mutation endpoints

### Frontend (React Components)

**Component tests with Vitest + React Testing Library:**

- **Auth forms:** sign-in/sign-up render correctly, form validation, submit calls correct auth methods
- **Org selector:** renders org list, create org form, skip behavior when single org
- **Project list:** renders projects with name/repo status/task count, create project flow
- **Triage inbox:** renders items sorted newest-first, status badges, quick-add creates item
- **Conversation list:** renders with title/status/date
- **Chat interface:** messages render correctly, plan cards render with approve/reject, loading states for "Analyzing codebase..."
- **Task list:** table renders with correct columns, filters work, detail sheet opens on click
- **Task detail sheet:** all fields display, assignee/status editable, markdown brief rendered
- **Docs list:** renders docs, create new doc, editor saves content
- **My Tasks:** renders cross-project tasks, project grouping/filtering works

### Test Boundaries

- Mock Convex backend in frontend tests (use Convex test utilities)
- Mock Daytona SDK in backend tests
- Mock AI responses in conversation tests (don't call real AI providers)
- Test real Convex function logic (queries, mutations) with Convex test framework

---

## Success Metrics

1. A non-technical user can go from raw idea to dev-ready task(s) without developer input
2. AI-generated tasks contain accurate affected areas matching actual codebase structure
3. All tasks trace back to a conversation (full audit trail)
4. Real-time updates work — task creation in a conversation appears instantly in task list for other users
5. Vector search returns relevant docs/tasks for natural language queries

---

## Open Questions

1. **Conversation memory scope:** The architecture mentions "memory across conversations within a project" — how much cross-conversation context should the AI retain? Full history or just summaries?
2. **Sandbox lifecycle:** When should sandboxes be destroyed? On repo disconnect only, or also after inactivity?
3. **Concurrent conversations:** Can multiple users have active conversations in the same project simultaneously? If so, do they share any state?
4. **Plan card versioning:** Should the conversation preserve all plan iterations (v1, v2, v3) visually, or only show the latest?
5. **Task editing post-creation:** Can users edit task fields (title, brief, affected areas) after creation, or are those locked to what the AI produced?
6. **Self-hosted Git auth:** For self-hosted Git repos without OAuth, what auth method? SSH keys? Personal access tokens?
7. **Embedding model:** Which model generates embeddings for vector search? Same provider as the conversation AI or a dedicated embedding model?
