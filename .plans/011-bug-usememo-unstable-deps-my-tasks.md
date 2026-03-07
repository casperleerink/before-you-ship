# Bug: `filteredTasks` useMemo has unstable dependencies in My Tasks

## Status: Open
## Priority: High
## Type: Bug (Performance)
## Effort: Small

## Problem

In `apps/web/src/routes/_authenticated/$orgSlug/my-tasks.tsx:163-217`, the filter `Set` objects are recreated on every render:

```ts
const projectFilter = new Set(search.project);
const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
const complexityFilter = new Set<TaskLevel>(search.complexity as TaskLevel[]);
const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);
```

Those `Set` instances are then used as `useMemo` dependencies:

```ts
}, [
  complexityFilter,
  effortFilter,
  projectFilter,
  riskFilter,
  statusFilter,
  tasks,
]);
```

Because `Set` values are reference-unstable, `filteredTasks` recomputes on every render and the memo never provides any caching benefit.

## Fix

Move the `Set` creation inside the `useMemo` and depend on the parsed search arrays instead:

```ts
const filteredTasks = useMemo(() => {
  if (!tasks) return [];

  const projectFilter = new Set(search.project);
  const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
  const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
  const complexityFilter = new Set<TaskLevel>(search.complexity as TaskLevel[]);
  const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);

  return tasks.filter((task) => {
    if (projectFilter.size > 0 && !projectFilter.has(task.projectId)) return false;
    if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false;
    if (riskFilter.size > 0 && !riskFilter.has(task.risk)) return false;
    if (complexityFilter.size > 0 && !complexityFilter.has(task.complexity)) return false;
    if (effortFilter.size > 0 && !effortFilter.has(task.effort)) return false;
    return true;
  });
}, [search.project, search.status, search.risk, search.complexity, search.effort, tasks]);
```

The `Set` objects used for `activeFilterCount` and filter toggling can remain outside the memo because they are cheap and not used as dependencies.

## Files

- `apps/web/src/routes/_authenticated/$orgSlug/my-tasks.tsx`
