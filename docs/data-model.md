# Data Model

## Users

App-level user profile. Created on sign-up by syncing from Better Auth's internal user record.

| Field | Type | Description |
|-------|------|-------------|
| `betterAuthId` | string | Better Auth's internal user ID (foreign key, unique) |
| `name` | string | Display name |
| `email` | string | Email address |
| `avatarUrl` | string (optional) | Profile picture |
| `createdAt` | number | Timestamp |

> Better Auth manages authentication (sessions, OAuth tokens, etc.). This table mirrors the identity and adds a place for app-specific user data. On sign-up, a hook syncs the Better Auth user to this table.

## Organizations

Top-level account. Users belong to organizations, projects belong to organizations.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Organization name |
| `createdBy` | user ID | Creator |
| `createdAt` | number | Timestamp |

## Members

Pivot table: users ↔ organizations. Scopes access.

| Field | Type | Description |
|-------|------|-------------|
| `orgId` | org ID | Organization |
| `userId` | user ID | User |
| `role` | string | `owner`, `admin`, `member` |
| `createdAt` | number | Timestamp |

> Roles are kept simple for now. `owner` has full control, `admin` can manage projects/members, `member` can use the app. Granular permissions can be added later.

## Projects

Belongs to an organization. Everything else belongs to a project.

| Field | Type | Description |
|-------|------|-------------|
| `orgId` | org ID | Parent organization |
| `name` | string | Project name |
| `description` | string (markdown) | AI-readable project summary, injected into every conversation system prompt |
| `repoUrl` | string (optional) | Git repository URL |
| `repoProvider` | string (optional) | `github`, `gitlab`, `azure_devops`, `bitbucket`, `self_hosted` |
| `sandboxId` | string (optional) | Daytona sandbox ID for this repo |
| `createdBy` | user ID | Project creator |
| `createdAt` | number | Timestamp |

## Triage Items

Raw, unprocessed inputs. Quick-add inbox.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | project ID | Parent project |
| `content` | string | Raw text input |
| `status` | string | `pending` or `converted` |
| `conversationId` | conversation ID (optional) | Link to conversation if converted |
| `createdBy` | user ID | Who added it |
| `createdAt` | number | Timestamp |

## Conversations

AI-guided refinement sessions. Messages are managed internally by the Convex agent component.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | project ID | Parent project |
| `threadId` | string | Convex agent thread ID (links to message history) |
| `title` | string (optional) | AI-generated summary, set after first few messages |
| `status` | string | `active`, `completed`, `abandoned` |
| `triageItemId` | triage item ID (optional) | Source triage item if started from one |
| `createdBy` | user ID | Who started it |
| `createdAt` | number | Timestamp |

## Tasks

Vetted units of work. Only created as output of conversations.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | project ID | Parent project |
| `conversationId` | conversation ID | Conversation that created this task |
| `title` | string | Task title |
| `brief` | string (markdown) | Dev-ready description |
| `affectedAreas` | string[] | Codebase paths/modules affected |
| `risk` | string | `low`, `medium`, `high` |
| `complexity` | string | `low`, `medium`, `high` |
| `effort` | string | `low`, `medium`, `high` |
| `status` | string | `ready`, `in_progress`, `done` |
| `assigneeId` | user ID (optional) | Assigned team member |
| `embedding` | vector | For semantic search via Convex vector search |
| `createdAt` | number | Timestamp |

## Docs

Project knowledge base. Context the AI can pull in when relevant.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | project ID | Parent project |
| `title` | string | Document title |
| `content` | string (markdown) | Document body |
| `embedding` | vector | For semantic search via Convex vector search |
| `createdBy` | user ID | Who created it |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

## Relationships

```
Organization
├── Members (users with roles)
└── Projects (0..n)
    ├── Triage Items (0..n)
    │   └── → Conversation (0..1, when converted)
    ├── Conversations (0..n)
    │   ├── → Triage Item (0..1, source)
    │   ├── → Thread (1, agent message history)
    │   └── → Tasks (0..n, created as output)
    ├── Tasks (0..n)
    │   ├── → Conversation (1, origin)
    │   └── → Assignee (0..1, user)
    └── Docs (0..n)
```
