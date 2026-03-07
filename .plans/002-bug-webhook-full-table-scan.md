# Bug: Full table scan in webhook handler — `getProjectByRepoUrl`

## Status: Open
## Priority: High
## Type: Bug (Performance)
## Effort: Small

## Problem

In `packages/backend/convex/webhooks.ts:318-332`, the `getProjectByRepoUrl` query scans every project in the database:

```ts
export const getProjectByRepoUrl = internalQuery({
  args: { repoUrl: v.string() },
  handler: async (ctx, args) => {
    const normalizedUrl = args.repoUrl.replace(GIT_SUFFIX_RE, "");
    const projects = await ctx.db.query("projects").collect();
    return (
      projects.find(
        (p) => p.repoUrl && p.repoUrl.replace(GIT_SUFFIX_RE, "") === normalizedUrl
      ) ?? null
    );
  },
});
```

This runs on **every GitHub push webhook**. As the project count grows, this becomes increasingly expensive.

## Fix

Add an index on `repoUrl` to the `projects` table in `packages/backend/convex/schema.ts`:

```ts
projects: defineTable({
  // ...existing fields
}).index("by_organizationId", ["organizationId"])
  .index("by_repoUrl", ["repoUrl"]),
```

Then update the query to use the index. Since GitHub may send URLs with or without `.git` suffix, query for both variants:

```ts
export const getProjectByRepoUrl = internalQuery({
  args: { repoUrl: v.string() },
  handler: async (ctx, args) => {
    const normalizedUrl = args.repoUrl.replace(GIT_SUFFIX_RE, "");

    const project = await ctx.db
      .query("projects")
      .withIndex("by_repoUrl", (q) => q.eq("repoUrl", normalizedUrl))
      .first();

    if (project) return project;

    // Try with .git suffix
    return ctx.db
      .query("projects")
      .withIndex("by_repoUrl", (q) => q.eq("repoUrl", `${normalizedUrl}.git`))
      .first();
  },
});
```

Note: Existing project records should already be stored without `.git` suffix (the `create` mutation stores `repoUrl` as-is from user input). If normalization at write-time isn't guaranteed, consider normalizing on insert as well.

## Files

- `packages/backend/convex/schema.ts` — add index
- `packages/backend/convex/webhooks.ts` — update query
