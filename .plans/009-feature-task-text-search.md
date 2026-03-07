# Feature: Task text search on tasks page

## Status: Open
## Priority: Low
## Type: Feature
## Effort: Medium

## Problem

The tasks page has filter dropdowns for status/risk/complexity/effort, but no text search. Users can't quickly find a task by name or content.

## Approach

The backend already has `embeddings.vectorSearchTasks` for semantic search. Two options:

### Option A: Simple client-side text filter (recommended for now)

Add a search input that filters tasks by title match on the client. No backend changes needed.

```tsx
const [searchQuery, setSearchQuery] = useState("");

const filteredTasks = useMemo(() => {
  // ...existing filter logic
  return tasks.filter((task) => {
    // ...existing status/risk/etc filters
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });
}, [search.status, search.risk, search.complexity, search.effort, tasks, searchQuery]);
```

### Option B: Semantic search via backend

Add a search input that calls `vectorSearchTasks` when the user types, returning semantically similar tasks. More powerful but adds latency and embedding API calls.

This can be a future enhancement once Option A proves insufficient.

## Files

- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/tasks.tsx`
