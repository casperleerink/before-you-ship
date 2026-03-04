import { generateText } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { languageModel } from "./agent";

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

export const REPO_ROOT = "/home/daytona/repo";

function daytonaHeaders(apiKey: string): Record<string, string> {
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};
}

async function fetchToolbox(
	sandboxId: string,
	path: string,
	params?: URLSearchParams
): Promise<Response> {
	const { apiKey, apiUrl } = getDaytonaConfig();
	const url = params
		? `${apiUrl}/sandbox/${sandboxId}/toolbox/${path}?${params}`
		: `${apiUrl}/sandbox/${sandboxId}/toolbox/${path}`;
	const res = await fetch(url, { headers: daytonaHeaders(apiKey) });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Daytona ${path} failed (${res.status}): ${text}`);
	}
	return res;
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
					path: REPO_ROOT,
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

			// Auto-generate project description from repo contents
			await ctx.scheduler.runAfter(
				0,
				internal.daytona.generateProjectDescription,
				{
					projectId: args.projectId,
					sandboxId,
				}
			);
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

export const listFiles = internalAction({
	args: {
		sandboxId: v.string(),
		path: v.string(),
	},
	handler: async (_ctx, args) => {
		const res = await fetchToolbox(
			args.sandboxId,
			"files",
			new URLSearchParams({ path: args.path })
		);
		return (await res.json()) as Array<{
			name: string;
			isDir: boolean;
			size: number;
		}>;
	},
});

export const readFile = internalAction({
	args: {
		sandboxId: v.string(),
		path: v.string(),
	},
	handler: async (_ctx, args) => {
		const res = await fetchToolbox(
			args.sandboxId,
			"files/download",
			new URLSearchParams({ path: args.path })
		);
		return await res.text();
	},
});

export const searchCode = internalAction({
	args: {
		sandboxId: v.string(),
		path: v.string(),
		pattern: v.string(),
	},
	handler: async (_ctx, args) => {
		const res = await fetchToolbox(
			args.sandboxId,
			"files/find",
			new URLSearchParams({ path: args.path, pattern: args.pattern })
		);
		return (await res.json()) as Array<{
			file: string;
			line: number;
			content: string;
		}>;
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

export const generateProjectDescription = internalAction({
	args: {
		projectId: v.id("projects"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		try {
			// Read the file tree (top-level only)
			const files = await ctx.runAction(internal.daytona.listFiles, {
				sandboxId: args.sandboxId,
				path: REPO_ROOT,
			});

			const fileTree = files
				.map((f) => `${f.isDir ? "📁" : "📄"} ${f.name}`)
				.join("\n");

			// Try to read README
			let readme = "";
			const readmeFile = files.find((f) =>
				f.name.toLowerCase().startsWith("readme")
			);
			if (readmeFile) {
				try {
					readme = await ctx.runAction(internal.daytona.readFile, {
						sandboxId: args.sandboxId,
						path: `${REPO_ROOT}/${readmeFile.name}`,
					});
					// Truncate if too long
					if (readme.length > 5000) {
						readme = `${readme.slice(0, 5000)}\n... (truncated)`;
					}
				} catch (error) {
					console.warn(
						`Failed to read README for project ${args.projectId}:`,
						error instanceof Error ? error.message : error
					);
				}
			}

			const prompt = [
				"Generate a concise project description (2-4 sentences) based on this repository.",
				"Focus on: what the project does, what technologies it uses, and its main purpose.",
				"Return ONLY the description text, no headers or formatting.",
				"",
				"## File Tree (root level)",
				fileTree,
			];

			if (readme) {
				prompt.push("", "## README", readme);
			}

			const { text: description } = await generateText({
				model: languageModel,
				system:
					"You generate concise project descriptions from repository contents. Be factual and specific.",
				prompt: prompt.join("\n"),
			});

			await ctx.runMutation(internal.daytona.setProjectDescription, {
				projectId: args.projectId,
				description: description.trim(),
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unknown error";
			console.error(
				`Failed to generate description for project ${args.projectId}: ${message}`
			);
			// Non-critical — fail silently
		}
	},
});

export const setProjectDescription = internalMutation({
	args: {
		projectId: v.id("projects"),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const project = await ctx.db.get(args.projectId);
		if (!project) {
			throw new Error(`Project ${args.projectId} not found`);
		}
		// Only set if no description exists (don't overwrite user edits)
		if (!project.description) {
			await ctx.db.patch(args.projectId, {
				description: args.description,
			});
		}
	},
});
