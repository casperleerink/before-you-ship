# Feature: Organization settings / rename / delete

## Status: Open
## Priority: Low
## Type: Feature
## Effort: Medium

## Problem

The organization page shows projects and members but has no settings panel. Users can't rename or delete organizations.

## Scope

### Backend

- `organizations.update` mutation — rename org (owner only), regenerate slug
- `organizations.delete` mutation — delete org with cascading cleanup (owner only):
  - Delete all projects (with their own cascading cleanup)
  - Delete all members
  - Delete all invites

### Frontend

- Add a "Settings" tab or section to the org page (`apps/web/src/routes/_authenticated/$orgSlug/index.tsx`)
- Rename form with slug preview
- Danger zone with delete button + confirmation dialog
- Only visible to owners

## Considerations

- Renaming an org changes its slug, which changes all URLs — need redirect handling
- Deleting an org is extremely destructive — requires strong confirmation (type org name)
- Should notify members before deletion (future: email notifications)
