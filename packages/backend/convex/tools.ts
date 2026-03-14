import { createTool } from "@convex-dev/agent";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { REPO_ROOT } from "./daytona";

const taskLevelSchema = z.enum(["low", "medium", "high"]);
const taskUrgencySchema = z.enum(["low", "medium", "high"]);

const blockerRefSchema = z.union([
	z.object({
		clientId: z
			.string()
			.describe("The clientId of another task in this same proposed plan"),
		kind: z.literal("plan_task"),
	}),
	z.object({
		kind: z.literal("existing_task"),
		taskId: z
			.string()
			.describe("The existing same-project task ID that blocks this task"),
	}),
]);

const proposedTaskSchema = z.object({
	clientId: z
		.string()
		.describe(
			"A stable unique identifier for this proposed task within the plan, used for cross-task blocker references."
		),
	title: z
		.string()
		.describe(
			"Task title in the format 'Action: outcome'. Action must be one of: Add, Fix, Update, Remove, Improve, Investigate. Outcome is 3-5 words describing the user-facing result. Examples: 'Fix: payment fails on retry', 'Add: social auth support', 'Update: filter by date range'."
		),
	brief: z
		.string()
		.describe(
			"Plain-language description of what needs to be done, written for non-technical stakeholders. Focus on the user-facing outcome, not implementation details."
		),
	affectedAreas: z
		.array(z.string())
		.describe(
			"High-level areas of the product affected (e.g. 'Login page', 'Checkout flow'), not specific file paths"
		),
	risk: taskLevelSchema.describe("Risk level: low, medium, or high"),
	complexity: taskLevelSchema.describe(
		"Complexity level: low, medium, or high"
	),
	effort: taskLevelSchema.describe("Effort level: low, medium, or high"),
	urgency: taskUrgencySchema.describe("Urgency level: low, medium, or high"),
	blockedBy: z
		.array(blockerRefSchema)
		.default([])
		.describe(
			"Optional hard blockers for this task. Use plan_task refs for blockers in the same proposal and existing_task refs only for clear same-project dependencies."
		),
	assigneeId: z
		.string()
		.optional()
		.describe(
			"Optional user ID for the best assignee. Only set this after checking assignment candidates."
		),
});

const writeTaskSchema = z.object({
	title: z
		.string()
		.describe(
			"Task title in the format 'Action: outcome'. Action must be one of: Add, Fix, Update, Remove, Improve, Investigate. Outcome is 3-5 words describing the user-facing result. Examples: 'Fix: payment fails on retry', 'Add: social auth support', 'Update: filter by date range'."
		),
	brief: z
		.string()
		.describe(
			"Plain-language description of what needs to be done, written for non-technical stakeholders. Focus on the user-facing outcome, not implementation details."
		),
	affectedAreas: z
		.array(z.string())
		.describe(
			"High-level areas of the product affected (e.g. 'Login page', 'Checkout flow'), not specific file paths"
		),
	risk: taskLevelSchema.describe("Risk level: low, medium, or high"),
	complexity: taskLevelSchema.describe(
		"Complexity level: low, medium, or high"
	),
	effort: taskLevelSchema.describe("Effort level: low, medium, or high"),
	urgency: taskUrgencySchema.describe("Urgency level: low, medium, or high"),
	assigneeId: z
		.string()
		.optional()
		.describe(
			"Optional user ID for the best assignee. Only set this after checking assignment candidates."
		),
});

const MAX_FILE_SIZE = 50_000; // characters
const MAX_SEARCH_RESULTS = 50;

export function createCodebaseTools(
	conversationId: Id<"conversations">,
	projectId: Id<"projects">
) {
	const listFiles = createTool({
		description:
			"List files and directories in the repository. Use this to explore the project structure and find relevant files.",
		args: z.object({
			path: z
				.string()
				.default("")
				.describe(
					"Relative path within the repo to list (empty string for root)"
				),
		}),
		handler: async (ctx, args) => {
			const sandboxId = await ctx.runAction(
				internal.daytonaActions.ensureConversationSandbox,
				{ conversationId, projectId }
			);
			const fullPath = args.path ? `${REPO_ROOT}/${args.path}` : REPO_ROOT;
			const files: Array<{ name: string; isDir: boolean; size: number }> =
				await ctx.runAction(internal.daytonaActions.listFiles, {
					sandboxId,
					path: fullPath,
				});
			return files.map((f) => ({
				name: f.name,
				isDir: f.isDir,
				size: f.size,
			}));
		},
	});

	const readFile = createTool({
		description:
			"Read the contents of a specific file in the repository. Use this to understand implementation details, check for patterns, or verify feasibility.",
		args: z.object({
			path: z.string().describe("Relative path to the file within the repo"),
		}),
		handler: async (ctx, args) => {
			const sandboxId = await ctx.runAction(
				internal.daytonaActions.ensureConversationSandbox,
				{ conversationId, projectId }
			);
			const fullPath = `${REPO_ROOT}/${args.path}`;
			const content = await ctx.runAction(internal.daytonaActions.readFile, {
				sandboxId,
				path: fullPath,
			});
			if (content.length > MAX_FILE_SIZE) {
				return `${content.slice(0, MAX_FILE_SIZE)}\n\n... [truncated, file too large]`;
			}
			return content;
		},
	});

	const searchCode = createTool({
		description:
			"Search for a text pattern across the codebase using grep. Returns matching file paths, line numbers, and content. Use this to find where things are defined or used.",
		args: z.object({
			query: z
				.string()
				.describe(
					"Text pattern to search for across the codebase (supports regex)"
				),
			path: z
				.string()
				.default("")
				.describe(
					"Relative path to search within (empty string for entire repo)"
				),
		}),
		handler: async (ctx, args) => {
			const sandboxId = await ctx.runAction(
				internal.daytonaActions.ensureConversationSandbox,
				{ conversationId, projectId }
			);
			const fullPath = args.path ? `${REPO_ROOT}/${args.path}` : REPO_ROOT;
			const matches = await ctx.runAction(internal.daytonaActions.searchCode, {
				sandboxId,
				path: fullPath,
				pattern: args.query,
			});
			if (matches.length === 0) {
				return "No matches found.";
			}
			if (matches.length > MAX_SEARCH_RESULTS) {
				return matches.slice(0, MAX_SEARCH_RESULTS);
			}
			return matches;
		},
	});

	return { listFiles, readFile, searchCode };
}

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

export function createAssignmentTools(projectId: Id<"projects">) {
	const listAssignmentCandidates = createTool({
		description:
			"List the project members who are eligible for AI task assignment. Use this before assigning tasks in a proposed plan.",
		args: z.object({}),
		handler: async (ctx) => {
			const candidates = await ctx.runQuery(
				internal.projects.listAssignmentCandidatesInternal,
				{ projectId }
			);
			if (candidates.length === 0) {
				return "No assignment candidates configured for this project.";
			}
			return candidates;
		},
	});

	return { listAssignmentCandidates };
}

export function createPlanTools(
	projectId: Id<"projects">,
	conversationId: Id<"conversations">
) {
	const proposePlan = createTool({
		description:
			"Propose a structured plan with concrete tasks for the user to review. Use this when you have gathered enough context and are ready to suggest specific work items. The plan will be shown as a card in the chat for the user to approve or request changes.",
		args: z.object({
			scope: z
				.enum(["quick-fix", "small", "medium"])
				.describe(
					"Scope classification: quick-fix = 1 task, small = 1-2 tasks, medium = 2-4 tasks. For large initiatives, use createDoc instead."
				),
			tasks: z
				.array(proposedTaskSchema)
				.min(1)
				.describe("The list of proposed tasks"),
		}),
		handler: async (ctx, args) => {
			const planId = await ctx.runMutation(internal.plans.create, {
				conversationId,
				projectId,
				scope: args.scope,
				tasks: args.tasks.map((task) => ({
					...task,
					assigneeId: task.assigneeId as Id<"users"> | undefined,
					blockedBy: task.blockedBy.map((blockerRef) =>
						blockerRef.kind === "existing_task"
							? {
									kind: blockerRef.kind,
									taskId: blockerRef.taskId as Id<"tasks">,
								}
							: blockerRef
					),
				})),
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
		args: writeTaskSchema,
		handler: async (ctx, args) => {
			const taskId = await ctx.runMutation(internal.tasks.createFromAgent, {
				projectId,
				conversationId,
				...args,
				assigneeId: args.assigneeId as Id<"users"> | undefined,
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
			urgency: taskUrgencySchema.optional().describe("Updated urgency level"),
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

export function createDocTools(
	projectId: Id<"projects">,
	conversationId: Id<"conversations">,
	createdBy: Id<"users">
) {
	const createDoc = createTool({
		description:
			"Create a discovery document for large initiatives that are too broad to break into tasks immediately. Use this instead of proposePlan when the scope is large and needs further exploration, research, or phased planning.",
		args: z.object({
			title: z.string().describe("Title for the discovery document"),
			content: z
				.string()
				.describe(
					"Markdown content. Suggested structure: ## Overview, ## Key Questions, ## Proposed Phases, ## Risks, ## Suggested Next Steps"
				),
		}),
		handler: async (ctx, args) => {
			const docId = await ctx.runMutation(internal.docs.createFromAgent, {
				projectId,
				conversationId,
				createdBy,
				title: args.title,
				content: args.content,
			});
			return { docId, title: args.title };
		},
	});

	return { createDoc };
}
