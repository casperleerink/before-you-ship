import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
	type ActionCtx,
	httpAction,
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { parseGitHubRepoUrl, stripGitSuffix } from "./gitUtils";
import { projectRepoProviderValidator } from "./schema";
import { GITHUB_API_URL, generateRandomHex, getConvexSiteUrl } from "./shared";

// --- Internal queries & mutations ---

export const getByProjectId = internalQuery({
	args: { projectId: v.id("projects") },
	handler: (ctx, args) => {
		return ctx.db
			.query("webhooks")
			.withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
			.first();
	},
});

export const store = internalMutation({
	args: {
		projectId: v.id("projects"),
		provider: projectRepoProviderValidator,
		providerWebhookId: v.string(),
		secret: v.string(),
	},
	handler: (ctx, args) => {
		return ctx.db.insert("webhooks", {
			projectId: args.projectId,
			provider: args.provider,
			providerWebhookId: args.providerWebhookId,
			secret: args.secret,
			createdAt: Date.now(),
		});
	},
});

export const deleteByProjectId = internalMutation({
	args: { projectId: v.id("projects") },
	handler: async (ctx, args) => {
		const webhook = await ctx.db
			.query("webhooks")
			.withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
			.first();
		if (webhook) {
			await ctx.db.delete(webhook._id);
		}
	},
});

// --- GitHub webhook registration ---

export const registerGithub = internalAction({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		gitConnectionId: v.id("gitConnections"),
	},
	handler: async (ctx, args) => {
		const parsed = parseGitHubRepoUrl(args.repoUrl);
		if (!parsed) {
			console.error(
				`Cannot register webhook: invalid GitHub URL ${args.repoUrl}`
			);
			return;
		}

		const connection = await ctx.runQuery(
			internal.gitConnections.getConnectionById,
			{ connectionId: args.gitConnectionId }
		);
		if (!connection?.accessToken) {
			console.error("Cannot register webhook: no access token");
			return;
		}

		const secret = generateRandomHex();
		const convexSiteUrl = getConvexSiteUrl();
		const webhookUrl = `${convexSiteUrl}/api/webhooks/github`;

		try {
			const response = await fetch(
				`${GITHUB_API_URL}/repos/${parsed.owner}/${parsed.repo}/hooks`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${connection.accessToken}`,
						Accept: "application/vnd.github+json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name: "web",
						active: true,
						events: ["push"],
						config: {
							url: webhookUrl,
							content_type: "json",
							secret,
							insecure_ssl: "0",
						},
					}),
				}
			);

			if (!response.ok) {
				const text = await response.text();
				console.error(
					`GitHub webhook registration failed (${response.status}): ${text}`
				);
				return;
			}

			const hook: { id: number } = await response.json();

			await ctx.runMutation(internal.webhooks.store, {
				projectId: args.projectId,
				provider: "github",
				providerWebhookId: String(hook.id),
				secret,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to register GitHub webhook: ${message}`);
		}
	},
});

export const unregisterGithub = internalAction({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		gitConnectionId: v.id("gitConnections"),
	},
	handler: async (ctx, args) => {
		const webhook = await ctx.runQuery(internal.webhooks.getByProjectId, {
			projectId: args.projectId,
		});
		if (!webhook) {
			return;
		}

		const parsed = parseGitHubRepoUrl(args.repoUrl);
		if (!parsed) {
			// Can't call GitHub API but still clean up our record
			await ctx.runMutation(internal.webhooks.deleteByProjectId, {
				projectId: args.projectId,
			});
			return;
		}

		const connection = await ctx.runQuery(
			internal.gitConnections.getConnectionById,
			{ connectionId: args.gitConnectionId }
		);

		if (connection?.accessToken) {
			try {
				const res = await fetch(
					`${GITHUB_API_URL}/repos/${parsed.owner}/${parsed.repo}/hooks/${webhook.providerWebhookId}`,
					{
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${connection.accessToken}`,
							Accept: "application/vnd.github+json",
						},
					}
				);
				if (!res.ok && res.status !== 404) {
					const text = await res.text();
					console.error(
						`GitHub webhook deletion failed (${res.status}): ${text}`
					);
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error(`Failed to delete GitHub webhook: ${message}`);
			}
		}

		await ctx.runMutation(internal.webhooks.deleteByProjectId, {
			projectId: args.projectId,
		});
	},
});

export const deleteGithubByDetails = internalAction({
	args: {
		repoUrl: v.string(),
		gitConnectionId: v.id("gitConnections"),
		providerWebhookId: v.string(),
	},
	handler: async (ctx, args) => {
		const parsed = parseGitHubRepoUrl(args.repoUrl);
		if (!parsed) {
			return;
		}

		const connection = await ctx.runQuery(
			internal.gitConnections.getConnectionById,
			{ connectionId: args.gitConnectionId }
		);
		if (!connection?.accessToken) {
			return;
		}

		try {
			const res = await fetch(
				`${GITHUB_API_URL}/repos/${parsed.owner}/${parsed.repo}/hooks/${args.providerWebhookId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${connection.accessToken}`,
						Accept: "application/vnd.github+json",
					},
				}
			);
			if (!res.ok && res.status !== 404) {
				const text = await res.text();
				console.error(
					`GitHub webhook deletion failed (${res.status}): ${text}`
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to delete GitHub webhook: ${message}`);
		}
	},
});

// --- Webhook handler (HTTP endpoint) ---

async function verifyGitHubSignature(
	payload: string,
	signature: string,
	secret: string
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"]
	);

	const expectedHex = signature.replace("sha256=", "");
	const match = expectedHex.match(/.{2}/g);
	if (!match) {
		return false;
	}
	const expectedBytes = new Uint8Array(
		match.map((byte) => Number.parseInt(byte, 16))
	);

	return crypto.subtle.verify(
		"HMAC",
		key,
		expectedBytes,
		encoder.encode(payload)
	);
}

export const githubWebhookHandler = httpAction(
	async (ctx: ActionCtx, request) => {
		const signature = request.headers.get("x-hub-signature-256");
		const event = request.headers.get("x-github-event");

		if (!(signature && event)) {
			return new Response("Missing headers", { status: 400 });
		}

		// Only handle push events
		if (event === "ping") {
			return new Response("pong", { status: 200 });
		}

		if (event !== "push") {
			return new Response("Ignored event", { status: 200 });
		}

		const body = await request.text();
		let payload: { repository?: { html_url?: string } };
		try {
			payload = JSON.parse(body);
		} catch {
			return new Response("Invalid JSON", { status: 400 });
		}

		const repoUrl = payload.repository?.html_url;
		if (!repoUrl) {
			return new Response("Missing repository URL", { status: 400 });
		}

		const projectWithWebhook = await ctx.runQuery(
			internal.webhooks.getProjectWebhookByRepoUrl,
			{
				repoUrl,
			}
		);
		if (!projectWithWebhook) {
			return new Response("Unauthorized", { status: 401 });
		}

		const { project, webhook } = projectWithWebhook;
		const valid = await verifyGitHubSignature(body, signature, webhook.secret);
		if (!valid) {
			return new Response("Unauthorized", { status: 401 });
		}

		// Schedule sandbox sync
		if (project.sandboxId) {
			await ctx.scheduler.runAfter(0, internal.webhooks.syncSandbox, {
				projectId: project._id,
				sandboxId: project.sandboxId,
			});
		}

		return new Response("OK", { status: 200 });
	}
);

// --- Helper queries for webhook handler ---

export const getProjectWebhookByRepoUrl = internalQuery({
	args: { repoUrl: v.string() },
	handler: async (ctx, args) => {
		const normalizedUrl = stripGitSuffix(args.repoUrl);
		const project =
			(await ctx.db
				.query("projects")
				.withIndex("by_repoUrl", (q) => q.eq("repoUrl", normalizedUrl))
				.first()) ??
			(await ctx.db
				.query("projects")
				.withIndex("by_repoUrl", (q) => q.eq("repoUrl", `${normalizedUrl}.git`))
				.first());

		if (!project) {
			return null;
		}

		const webhook = await ctx.db
			.query("webhooks")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.first();

		if (!webhook) {
			return null;
		}

		return { project, webhook };
	},
});

// --- Sandbox sync on push ---

export const syncSandbox = internalAction({
	args: {
		projectId: v.id("projects"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			// Pull latest changes via Daytona git pull
			await ctx.runAction(internal.daytonaActions.gitPull, {
				sandboxId: args.sandboxId,
			});

			// Invalidate and rebuild file tree cache
			await ctx.runMutation(internal.daytona.clearFileTreeCache, {
				projectId: args.projectId,
			});
			await ctx.runAction(internal.daytonaActions.buildFileTreeCache, {
				projectId: args.projectId,
				sandboxId: args.sandboxId,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(
				`Failed to sync sandbox for project ${args.projectId}: ${message}`
			);
		}
	},
});
