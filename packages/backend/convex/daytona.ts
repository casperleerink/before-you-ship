import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

const DEFAULT_API_URL = "https://app.daytona.io/api";

function getDaytonaConfig() {
	const apiKey = process.env.DAYTONA_API_KEY;
	if (!apiKey) {
		throw new Error(
			"DAYTONA_API_KEY must be set as a Convex environment variable"
		);
	}

	const apiUrl = process.env.DAYTONA_API_URL || DEFAULT_API_URL;
	const target = process.env.DAYTONA_TARGET || "us";

	return { apiKey, apiUrl, target };
}

function daytonaHeaders(apiKey: string): Record<string, string> {
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};
}

export const createSandbox = internalAction({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const { apiKey, apiUrl, target } = getDaytonaConfig();
		const headers = daytonaHeaders(apiKey);

		try {
			// Create sandbox
			const createRes = await fetch(`${apiUrl}/sandbox`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					language: "typescript",
					target,
				}),
			});

			if (!createRes.ok) {
				const text = await createRes.text();
				throw new Error(
					`Sandbox creation failed (${createRes.status}): ${text}`
				);
			}

			const sandbox = await createRes.json();
			const sandboxId: string = sandbox.id;

			// Clone repo into sandbox
			const cloneUrl = `${apiUrl}/sandbox/${sandboxId}/toolbox/git/clone`;
			const cloneRes = await fetch(cloneUrl, {
				method: "POST",
				headers,
				body: JSON.stringify({
					url: args.repoUrl,
					path: "/home/daytona/repo",
				}),
			});

			if (!cloneRes.ok) {
				const text = await cloneRes.text();
				throw new Error(`Git clone failed (${cloneRes.status}): ${text}`);
			}

			await ctx.runMutation(internal.daytona.setSandboxId, {
				projectId: args.projectId,
				sandboxId,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(
				`Failed to create sandbox for project ${args.projectId}: ${message}`
			);
			throw new Error(`Sandbox creation failed: ${message}`);
		}
	},
});

export const deleteSandbox = internalAction({
	args: {
		sandboxId: v.string(),
	},
	handler: async (_ctx, args) => {
		const { apiKey, apiUrl } = getDaytonaConfig();
		const headers = daytonaHeaders(apiKey);

		try {
			const res = await fetch(`${apiUrl}/sandbox/${args.sandboxId}`, {
				method: "DELETE",
				headers,
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Sandbox deletion failed (${res.status}): ${text}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to delete sandbox ${args.sandboxId}: ${message}`);
		}
	},
});

export const setSandboxId = internalMutation({
	args: {
		projectId: v.id("projects"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.projectId, {
			sandboxId: args.sandboxId,
		});
	},
});
