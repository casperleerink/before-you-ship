# Screens

## 1. Auth

- Sign in / Sign up (already exists)
- Redirect to org selector after auth

## 2. Org Selector

- List of orgs the user belongs to
- Create new org
- If user only has one org, skip this and go straight to projects

## 3. Projects List

- Grid/list of projects in the current org
- Create new project button
- Each card shows project name, repo connection status, task count

## 4. Project View

Main workspace. Sidebar navigation with the following sections:

### Layout

- **Sidebar** (left): project name, nav links, quick-add triage button
- **Main area** (right): active section content

### Sections

#### Triage Inbox

- List of triage items, newest first
- Quick status indicator: `pending` / `converted`
- Click a pending item → option to start a conversation from it
- Click a converted item → link to its conversation

#### Conversations

- List of conversations with AI-generated title, status, and date
- Click → opens **conversation detail** (full page):
  - Chat interface
  - Plan cards rendered inline with approve/reject
  - Back button to return to conversation list

#### Tasks

- List/table of tasks with columns: title, status, risk, complexity, effort, assignee
- Filterable by status, assignee, risk/complexity/effort
- Click a task → **Sheet slide-over** from the right showing:
  - Title, brief (markdown rendered)
  - Risk / complexity / effort badges
  - Affected areas
  - Assignee (editable)
  - Status (editable)
  - Link back to origin conversation

#### Docs

- List of documents
- Click → markdown editor (simple, inline)
- Create new doc button

#### Settings

- Project name and description (editable, this is the AI's project context)
- Git repo connection (connect/disconnect, provider, URL)
- Sandbox status

### Quick-Add Triage

- Accessible from anywhere in the project view (button in sidebar)
- Minimal UI: text input + submit
- Creates a triage item, returns to whatever page you were on

## 5. My Tasks (Cross-Project)

- Accessible from top-level nav (outside project view)
- Shows all tasks assigned to the current user across all projects
- Grouped or filterable by project
- Same task detail sheet as within a project
