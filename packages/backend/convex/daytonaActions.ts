"use node";

import type { Sandbox } from "@daytonaio/sdk";
import { Daytona } from "@daytonaio/sdk";
import { generateText } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
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

export const createSandbox = internalAction({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		gitConnectionId: v.optional(v.id("gitConnections")),
	},
	handler: async (ctx, args) => {
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

		try {
			const daytona = getDaytonaClient();
			const sandbox = await daytona.create({ language: "typescript" });

			await sandbox.git.clone(
				args.repoUrl,
				REPO_ROOT,
				undefined,
				undefined,
				gitCredentials?.username,
				gitCredentials?.password
			);

			await ctx.runMutation(internal.daytona.setSandboxId, {
				projectId: args.projectId,
				sandboxId: sandbox.id,
			});

			await ctx.scheduler.runAfter(
				0,
				internal.daytonaActions.buildFileTreeCache,
				{
					projectId: args.projectId,
					sandboxId: sandbox.id,
				}
			);

			await ctx.scheduler.runAfter(
				0,
				internal.daytonaActions.generateProjectDescription,
				{
					projectId: args.projectId,
					sandboxId: sandbox.id,
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

export const gitPull = internalAction({
	args: {
		sandboxId: v.string(),
	},
	handler: async (_ctx, args) => {
		const sandbox = await getSandbox(args.sandboxId);
		await sandbox.git.pull(REPO_ROOT);
	},
});

export const buildFileTreeCache = internalAction({
	args: {
		projectId: v.id("projects"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		const sandbox = await getSandbox(args.sandboxId);
		const files = await sandbox.fs.listFiles(REPO_ROOT);
		const entries = files.map((f) => ({
			name: f.name,
			isDir: f.isDir,
			size: f.size,
		}));

		await ctx.runMutation(internal.daytona.setFileTreeCache, {
			projectId: args.projectId,
			path: REPO_ROOT,
			entries,
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
			const sandbox = await getSandbox(args.sandboxId);
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
		}
	},
});
