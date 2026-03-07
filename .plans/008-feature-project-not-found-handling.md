# Feature: Project not found / 404 handling

## Status: Open
## Priority: Medium
## Type: Feature
## Effort: Small

## Problem

If a user navigates to `/$orgSlug/projects/$projectId` with an invalid `projectId`, the project layout likely shows a loading spinner forever or renders a blank page. There's no explicit "not found" handling.

## Fix

In the project layout route (`apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId.tsx`), check for the case where the query has resolved but returned `null`, and render a proper error state:

```tsx
const project = useQuery(api.projects.getById, { projectId });

if (project === undefined) {
  return <Loader />;
}

if (project === null) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Project not found"
      description="This project doesn't exist or you don't have access to it."
    />
  );
}
```

The same pattern should be applied to the org layout (`$orgSlug.tsx`) for invalid org slugs.

## Files

- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId.tsx`
- `apps/web/src/routes/_authenticated/$orgSlug.tsx`
