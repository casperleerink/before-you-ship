# Refactor: Centralize date formatting utilities

## Status: Open
## Priority: Low
## Type: Refactor
## Effort: Small

## Problem

Date formatting functions are defined locally in route files:

- `formatDate()` in `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/index.tsx:50-56`
- `formatRelativeTime()` likely exists in the project dashboard index

These should be centralized to prevent further local utility sprawl.

## Fix

Add date utilities to `apps/web/src/lib/utils.ts`:

```ts
export function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeTime(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}
```

Then remove the local definitions and import from `@/lib/utils`.

## Files

- `apps/web/src/lib/utils.ts` — add utilities
- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/conversations/index.tsx` — remove local `formatDate`
- Any other files with local date formatting
