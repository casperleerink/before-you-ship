"use node";

import type { Sandbox } from "@daytonaio/sdk";
import { Daytona } from "@daytonaio/sdk";
import { generateText } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { languageModel } from "./agent";
import { REPO_ROOT } from "./daytona";

function getDaytonaClient(): Daytona {
	const apiKey = process.env.DAYTONA_API_KEY;
	if (!apiKey) {
		throw new Error(
			"DAYTONA_API_KEY must be set as a Convex environment variable"
		);
	}

	return new Daytona({
		apiKey,
		target: process.env.DAYTONA_TARGET || "us",
	});
}

function getSandbox(sandboxId: string): Promise<Sandbox> {
	const daytona = getDaytonaClient();
	return daytona.get(sandboxId);
}

async function resolveGitCredentials(
	ctx: ActionCtx,
	projectId: Id<"projects">
): Promise<{ username: string; password: string } | undefined> {
	const project = await ctx.runQuery(internal.projects.getProjectInternal, {
		projectId,
	});
	if (!(project?.repoProvider && project.createdBy)) {
		return undefined;
	}

	const connection = await ctx.runQuery(
		internal.gitConnections.getConnectionByUserAndProvider,
		{ userId: project.createdBy, provider: project.repoProvider }
	);
	if (!connection?.accessToken) {
		return undefined;
	}

	return { username: "x-access-token", password: connection.accessToken };
}

export const ensureConversationSandbox = internalAction({
	args: {
		conversationId: v.id("conversations"),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args): Promise<string> => {
		// 1. Check for existing sandboxId on conversation
		const existingSandboxId: string | null = await ctx.runQuery(
			internal.daytona.getConversationSandboxId,
			{ conversationId: args.conversationId }
		);

		if (existingSandboxId) {
			try {
				const sandbox = await getSandbox(existingSandboxId);
				if (sandbox.state === "started") {
					return existingSandboxId;
				}
				if (sandbox.state === "stopped" || sandbox.state === "archived") {
					await sandbox.start();
					return existingSandboxId;
				}
				if (sandbox.state === "error" && sandbox.recoverable) {
					await sandbox.recover();
					return existingSandboxId;
				}
				// Non-recoverable state — clear and create a new one
				await ctx.runMutation(internal.daytona.clearConversationSandboxId, {
					conversationId: args.conversationId,
				});
			} catch {
				// Sandbox is gone or unreachable — clear and create a new one
				await ctx.runMutation(internal.daytona.clearConversationSandboxId, {
					conversationId: args.conversationId,
				});
			}
		}

		// 2. Look up project repoUrl
		const project = await ctx.runQuery(internal.projects.getProjectInternal, {
			projectId: args.projectId,
		});
		if (!project?.repoUrl) {
			throw new Error("Project has no repository URL");
		}

		// 3. Get git credentials from project creator's connection
		const gitCredentials = await resolveGitCredentials(ctx, args.projectId);

		// 4. Create ephemeral sandbox
		const daytona = getDaytonaClient();
		const sandbox = await daytona.create({
			language: "typescript",
			autoStopInterval: 30,
		});

		try {
			await sandbox.git.clone(
				project.repoUrl,
				REPO_ROOT,
				undefined,
				undefined,
				gitCredentials?.username,
				gitCredentials?.password
			);
		} catch (error) {
			try {
				await sandbox.delete();
			} catch {
				// Best-effort cleanup
			}
			throw error;
		}

		// 5. Store sandboxId on conversation
		await ctx.runMutation(internal.daytona.setConversationSandboxId, {
			conversationId: args.conversationId,
			sandboxId: sandbox.id,
		});

		return sandbox.id;
	},
});

export const deleteSandbox = internalAction({
	args: {
		sandboxId: v.string(),
	},
	handler: async (_ctx, args) => {
		try {
			const sandbox = await getSandbox(args.sandboxId);
			await sandbox.delete();
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
		const sandbox = await getSandbox(args.sandboxId);
		const files = await sandbox.fs.listFiles(args.path);
		return files.map((f) => ({
			name: f.name,
			isDir: f.isDir,
			size: f.size,
		}));
	},
});

export const readFile = internalAction({
	args: {
		sandboxId: v.string(),
		path: v.string(),
	},
	handler: async (_ctx, args) => {
		const sandbox = await getSandbox(args.sandboxId);
		const buffer = await sandbox.fs.downloadFile(args.path);
		return buffer.toString("utf-8");
	},
});

export const searchCode = internalAction({
	args: {
		sandboxId: v.string(),
		path: v.string(),
		pattern: v.string(),
	},
	handler: async (_ctx, args) => {
		const sandbox = await getSandbox(args.sandboxId);
		const matches = await sandbox.fs.findFiles(args.path, args.pattern);
		return matches as Array<{
			file: string;
			line: number;
			content: string;
		}>;
	},
});

export const generateProjectDescription = internalAction({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		gitConnectionId: v.optional(v.id("gitConnections")),
	},
	handler: async (ctx, args) => {
		let sandbox: Sandbox | undefined;
		try {
			// Get git credentials if connection provided
			let gitCredentials: { username: string; password: string } | undefined;
			if (args.gitConnectionId) {
				const connection = await ctx.runQuery(
					internal.gitConnections.getConnectionById,
					{ connectionId: args.gitConnectionId }
				);
				if (connection?.accessToken) {
					gitCredentials = {
						username: "x-access-token",
						password: connection.accessToken,
					};
				}
			}

			// Create ephemeral sandbox
			const daytona = getDaytonaClient();
			sandbox = await daytona.create({ language: "typescript" });

			await sandbox.git.clone(
				args.repoUrl,
				REPO_ROOT,
				undefined,
				undefined,
				gitCredentials?.username,
				gitCredentials?.password
			);

			const files = await sandbox.fs.listFiles(REPO_ROOT);

			const fileTree = files
				.map((f) => `${f.isDir ? "📁" : "📄"} ${f.name}`)
				.join("\n");

			let readme = "";
			const readmeFile = files.find((f) =>
				f.name.toLowerCase().startsWith("readme")
			);
			if (readmeFile) {
				try {
					const buffer = await sandbox.fs.downloadFile(
						`${REPO_ROOT}/${readmeFile.name}`
					);
					readme = buffer.toString("utf-8");
					if (readme.length > 5000) {
						readme = `${readme.slice(0, 5000)}\n... (truncated)`;
					}
				} catch (error) {
					console.warn(
						`Failed to read README for project ${args.projectId}: ${error instanceof Error ? error.message : "Unknown error"}`
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
		} finally {
			if (sandbox) {
				try {
					await sandbox.delete();
				} catch {
					// Best-effort cleanup
				}
			}
		}
	},
});
