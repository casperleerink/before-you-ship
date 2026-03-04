import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export function createSearchTools(projectId: Id<"projects">) {
	const searchTasks = createTool({
		description:
			"Search for existing tasks in this project using semantic similarity. Use this to find related or duplicate tasks before proposing new ones.",
		args: z.object({
			query: z.string().describe("The search query to find related tasks"),
		}),
		handler: async (ctx, args) => {
			const results = await ctx.runAction(
				internal.embeddings.vectorSearchTasks,
				{ projectId, text: args.query }
			);
			if (results.length === 0) {
				return "No related tasks found.";
			}
			return results;
		},
	});

	const searchDocs = createTool({
		description:
			"Search project documentation using semantic similarity. Use this to find relevant context, requirements, or specifications.",
		args: z.object({
			query: z
				.string()
				.describe("The search query to find relevant documentation"),
		}),
		handler: async (ctx, args) => {
			const results = await ctx.runAction(
				internal.embeddings.vectorSearchDocs,
				{ projectId, text: args.query }
			);
			if (results.length === 0) {
				return "No related documentation found.";
			}
			return results;
		},
	});

	return { searchTasks, searchDocs };
}
