import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const taskLevelSchema = z.enum(["low", "medium", "high"]);

const proposedTaskSchema = z.object({
	title: z.string().describe("Short, descriptive title for the task"),
	brief: z.string().describe("Markdown description of what needs to be done"),
	affectedAreas: z
		.array(z.string())
		.describe("Codebase paths or areas affected by this task"),
	risk: taskLevelSchema.describe("Risk level: low, medium, or high"),
	complexity: taskLevelSchema.describe(
		"Complexity level: low, medium, or high"
	),
	effort: taskLevelSchema.describe("Effort level: low, medium, or high"),
});

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

export function createPlanTools(
	projectId: Id<"projects">,
	conversationId: Id<"conversations">
) {
	const proposePlan = createTool({
		description:
			"Propose a structured plan with concrete tasks for the user to review. Use this when you have gathered enough context and are ready to suggest specific work items. The plan will be shown as a card in the chat for the user to approve or request changes.",
		args: z.object({
			tasks: z
				.array(proposedTaskSchema)
				.min(1)
				.describe("The list of proposed tasks"),
		}),
		handler: async (ctx, args) => {
			const planId = await ctx.runMutation(internal.plans.create, {
				conversationId,
				projectId,
				tasks: args.tasks,
			});
			return { planId, taskCount: args.tasks.length };
		},
	});

	return { proposePlan };
}
