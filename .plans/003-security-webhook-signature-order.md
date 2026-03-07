# Security: Webhook signature verified after database lookups

## Status: Open
## Priority: High
## Type: Security
## Effort: Small

## Problem

In `packages/backend/convex/webhooks.ts:252-314`, the `githubWebhookHandler` performs database lookups **before** verifying the HMAC signature:

```ts
// 1. Parse JSON body
// 2. Extract repoUrl
// 3. Query DB for project by repoUrl  <-- before signature check
// 4. Query DB for webhook record       <-- before signature check
// 5. Verify signature                  <-- too late
```

This means an attacker can probe whether specific repo URLs are connected to projects by observing different HTTP responses (404 vs 401). It also wastes database reads on unauthenticated requests.

## Fix

Restructure the handler so signature verification happens as early as possible. Since we need the webhook secret to verify, and the secret is per-project, the minimum required lookup is:

1. Parse JSON, extract `repoUrl`
2. Find project + webhook record (combined query)
3. **Verify signature immediately**
4. Proceed with sync

To minimize information leakage, return the same generic error response for "no project found" and "invalid signature":

```ts
const project = await ctx.runQuery(internal.webhooks.getProjectByRepoUrl, { repoUrl });
const webhook = project
  ? await ctx.runQuery(internal.webhooks.getByProjectId, { projectId: project._id })
  : null;

if (!webhook) {
  return new Response("Unauthorized", { status: 401 });
}

const valid = await verifyGitHubSignature(body, signature, webhook.secret);
if (!valid) {
  return new Response("Unauthorized", { status: 401 });
}
```

The key change: return `401` (not `404`) when the project isn't found, making the response indistinguishable from an invalid signature.

## Files

- `packages/backend/convex/webhooks.ts`
