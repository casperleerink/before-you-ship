# Refactor: Extract auth + membership guard helper

## Status: Open
## Priority: Medium
## Type: Refactor
## Effort: Medium

## Problem

Nearly every backend query and mutation repeats the same auth + org membership check pattern:

```ts
const appUser = await getAppUser(ctx);
if (!appUser) {
  return [] / null / throw new Error("Not authenticated");
}

const membership = await getOrgMembership(ctx, orgId, appUser._id);
if (!membership) {
  return [] / null / throw new Error("Not a member of this organization");
}
```

This pattern appears in **15+ functions** across `organizations.ts`, `projects.ts`, `plans.ts`, `conversations.ts`, `tasks.ts`, `docs.ts`, and `triageItems.ts`.

## Fix

Add helpers to `packages/backend/convex/helpers.ts`:

```ts
/**
 * Require an authenticated user. Throws if not authenticated.
 * Use in mutations where you want to throw on auth failure.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const appUser = await getAppUser(ctx);
  if (!appUser) {
    throw new Error("Not authenticated");
  }
  return appUser;
}

/**
 * Require org membership. Throws if user is not a member.
 * Use in mutations where you want to throw on auth failure.
 */
export async function requireOrgMember(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
) {
  const appUser = await requireUser(ctx);
  const membership = await getOrgMembership(ctx, orgId, appUser._id);
  if (!membership) {
    throw new Error("Not a member of this organization");
  }
  return { appUser, membership };
}
```

For queries (which return `null`/`[]` instead of throwing), keep using the existing `getAppUser`/`getOrgMembership` pattern, or add `optional` variants.

Mutations can then be simplified from ~10 lines to ~1:

```ts
// Before
const appUser = await getAppUser(ctx);
if (!appUser) throw new Error("Not authenticated");
const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
if (!membership) throw new Error("Not a member of this organization");

// After
const { appUser, membership } = await requireOrgMember(ctx, args.orgId);
```

## Files

- `packages/backend/convex/helpers.ts` — add helpers
- `packages/backend/convex/organizations.ts` — update mutations
- `packages/backend/convex/projects.ts` — update mutations
- `packages/backend/convex/conversations.ts` — update mutations
- `packages/backend/convex/tasks.ts` — update mutations
- `packages/backend/convex/plans.ts` — update mutations
- `packages/backend/convex/docs.ts` — update mutations
- `packages/backend/convex/triageItems.ts` — update mutations
