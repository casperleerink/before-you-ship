# Feature: Project deletion with cascading cleanup

## Status: Open
## Priority: Medium
## Type: Feature
## Effort: Medium

## Problem

There is no way to delete a project. If a user creates a project by mistake or wants to remove one, there's no mechanism. More importantly, if this is added later without cascading deletes, orphaned records will accumulate.

## Scope

### Backend (`packages/backend/convex/projects.ts`)

Add a `deleteProject` mutation that:

1. Checks auth + membership (owner or admin only)
2. Unregisters any GitHub webhook
3. Deletes the Daytona sandbox
4. Cascading-deletes all related records:
   - conversations (and their agent threads)
   - tasks
   - plans
   - triage items
   - activity records
   - docs
   - file tree cache entries
   - webhook records
5. Deletes the project record

### Frontend

Add a "Delete Project" button in the project settings page (`apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/settings.tsx`) with a confirmation dialog.

## Considerations

- Should be restricted to owners/admins
- Needs a confirmation modal with project name typed to confirm (destructive action)
- Agent threads stored in the Convex agent component may need separate cleanup
- Consider soft-delete with a grace period instead of hard delete
