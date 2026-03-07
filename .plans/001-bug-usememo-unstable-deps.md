# Bug: `filteredTasks` useMemo has unstable dependencies

## Status: Open
## Priority: High
## Type: Bug (Performance)
## Effort: Small

## Problem

In `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/tasks.tsx:254-285`, the filter `Set` objects are recreated on every render:

```ts
const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
const complexityFilter = new Set<TaskLevel>(search.complexity as TaskLevel[]);
const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);
```

These Sets are then used as `useMemo` dependencies at line 285:

```ts
}, [complexityFilter, effortFilter, riskFilter, statusFilter, tasks]);
```

Since `Set` objects are compared by reference, the memo **never caches** — it re-runs on every render, completely defeating its purpose.

## Fix

Move the Set creation inside the `useMemo` and depend on the raw `search` object (or its individual primitive fields) instead:

```ts
const filteredTasks = useMemo(() => {
  if (!tasks) return [];

  const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
  const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
  const complexityFilter = new Set<TaskLevel>(search.complexity as TaskLevel[]);
  const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);

  return tasks.filter((task) => {
    if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false;
    if (riskFilter.size > 0 && !riskFilter.has(task.risk)) return false;
    if (complexityFilter.size > 0 && !complexityFilter.has(task.complexity)) return false;
    if (effortFilter.size > 0 && !effortFilter.has(task.effort)) return false;
    return true;
  });
}, [search.status, search.risk, search.complexity, search.effort, tasks]);
```

The Sets used outside the memo (for `activeFilterCount`, `toggleFilter`) can remain as-is since they're cheap and not memoized.

## Files

- `apps/web/src/routes/_authenticated/$orgSlug/projects/$projectId/tasks.tsx`
