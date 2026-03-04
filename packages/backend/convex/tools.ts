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

export function createWriteTools(
	projectId: Id<"projects">,
	conversationId: Id<"conversations">
) {
	const createTask = createTool({
		description:
			"Create a new task in the project. Only use this after the user has approved a plan. Use this for additional tasks that come up during post-approval discussion.",
		args: proposedTaskSchema,
		handler: async (ctx, args) => {
			const taskId = await ctx.runMutation(internal.tasks.createFromAgent, {
				projectId,
				conversationId,
				...args,
			});
			return { taskId, title: args.title };
		},
	});

	const updateTask = createTool({
		description:
			"Update an existing task's fields. Only use this after the user has approved a plan. Use this to refine tasks based on post-approval feedback.",
		args: z.object({
			taskId: z.string().describe("The ID of the task to update"),
			status: z
				.enum(["ready", "in_progress", "done"])
				.optional()
				.describe("New status for the task"),
			brief: z.string().optional().describe("Updated markdown description"),
			affectedAreas: z
				.array(z.string())
				.optional()
				.describe("Updated codebase paths or areas"),
			risk: taskLevelSchema.optional().describe("Updated risk level"),
			complexity: taskLevelSchema
				.optional()
				.describe("Updated complexity level"),
			effort: taskLevelSchema.optional().describe("Updated effort level"),
		}),
		handler: async (ctx, args) => {
			const { taskId: rawTaskId, ...updates } = args;
			const taskId = await ctx.runMutation(internal.tasks.updateFromAgent, {
				taskId: rawTaskId as Id<"tasks">,
				projectId,
				...updates,
			});
			return { taskId, updated: true };
		},
	});

	return { createTask, updateTask };
}
