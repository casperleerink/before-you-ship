import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { generateText, stepCountIs } from "ai";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import {
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { chatAgent, languageModel } from "./agent";
import { resolveUserNames } from "./helpers";
import {
	createAssignmentTools,
	createCodebaseTools,
	createDocTools,
	createPlanTools,
	createSearchTools,
	createWriteTools,
} from "./tools";

const STEPS_PER_ROUND = 20;
const MAX_CONTINUATIONS = 3;

export async function sendMessageToThread(
	ctx: MutationCtx,
	threadId: string,
	prompt: string
) {
	const { messageId } = await saveMessage(ctx, components.agent, {
		threadId,
		prompt,
	});
	await ctx.scheduler.runAfter(0, internal.chat.generateResponseAsync, {
		threadId,
		promptMessageId: messageId,
	});
	return messageId;
}

export const createNewThread = mutation({
	args: {},
	handler: async (ctx) => {
		const threadId = await createThread(ctx, components.agent, {});
		return threadId;
	},
});

export const listMessages = query({
	args: {
		threadId: v.string(),
		paginationOpts: paginationOptsValidator,
		streamArgs: vStreamArgs,
	},
	handler: async (ctx, args) => {
		const paginated = await listUIMessages(ctx, components.agent, args);
		const streams = await syncStreams(ctx, components.agent, args);
		return { ...paginated, streams };
	},
});

export const sendMessage = mutation({
	args: {
		threadId: v.string(),
		prompt: v.string(),
	},
	handler: async (ctx, { threadId, prompt }) => {
		return await sendMessageToThread(ctx, threadId, prompt);
	},
});

function buildSystemPrompt(
	project: {
		name: string;
		description?: string;
		repoUrl?: string;
	},
	hasApprovedPlan: boolean,
	proposedPlanSummary?: string | null
): string {
	const hasCodebase = Boolean(project.repoUrl);
	const parts = [
		"You are a technical advisor AI helping non-technical team members (PMs, designers, clients) refine ideas into developer-ready tasks.",
		"",
		"## Project Context",
		`**Project:** ${project.name}`,
	];

	if (project.description) {
		parts.push(`**Description:** ${project.description}`);
	}

	if (project.repoUrl) {
		parts.push(`**Repository:** ${project.repoUrl}`);
	}

	if (proposedPlanSummary) {
		parts.push("", "## Current Proposed Plan", proposedPlanSummary);
	}

	parts.push(
		"",
		"## Scope Assessment",
		"Before proposing a plan, classify the request scope:",
		"- **quick-fix**: A single, focused change (typo, config tweak, small bug). → 1 task.",
		"- **small**: A minor feature or bug fix with limited blast radius. → 1-2 tasks.",
		"- **medium**: A feature or change touching multiple areas. → 2-4 tasks.",
		"- **large**: A broad initiative, migration, or exploration that cannot be concretely tasked yet. → Use `createDoc` to write a discovery document instead of `proposePlan`.",
		"",
		"**Anti-patterns to avoid:**",
		'- Do NOT split "investigate" and "fix" into separate tasks — combine them.',
		"- Do NOT create separate tasks for testing, code review, or deployment — those are part of every task.",
		"- Do NOT pad plans with boilerplate tasks. Fewer, well-scoped tasks are better than many thin ones.",
		"- Quality over quantity: 1 precise task beats 5 vague ones."
	);

	parts.push(
		"",
		"## Available Tools",
		"",
		"### Read Tools (always available)",
		"- **searchTasks**: Search existing tasks in this project by semantic similarity. Use this to check for duplicates or related work before proposing new tasks.",
		"- **searchDocs**: Search project documentation by semantic similarity. Use this to find relevant context, requirements, or specifications.",
		"- **listAssignmentCandidates**: List the people currently eligible for task assignment in this project."
	);

	if (hasCodebase) {
		parts.push(
			"",
			"### Codebase Tools (repository connected)",
			"- **listFiles**: List files and directories in the repository. Use this to explore the project structure.",
			"- **readFile**: Read the contents of a specific file. Use this to understand implementation details or verify feasibility.",
			"- **searchCode**: Search for a text pattern across the codebase (grep). Use this to find where things are defined or used.",
			"",
			"When using codebase tools, do NOT show raw file contents to the user. Instead, summarize what you found in plain language. Show only small, relevant code snippets when they help explain a point."
		);
	}

	parts.push(
		"",
		"### Planning Tools",
		"- **proposePlan**: Propose a structured plan with concrete tasks for the user to review. The plan renders as a card in the chat with an approve button. Requires a `scope` classification.",
		"- **createDoc**: Create a discovery document for large initiatives that need further exploration before concrete tasks can be defined. Use this instead of `proposePlan` when the scope is `large`."
	);

	if (hasApprovedPlan) {
		parts.push(
			"",
			"### Write Tools (unlocked — plan approved)",
			"- **createTask**: Create a new task in the project. Use for additional tasks that come up during post-approval discussion.",
			"- **updateTask**: Update an existing task's fields (status, brief, affected areas, risk, complexity, effort, urgency). Use to refine tasks based on feedback."
		);
	}

	parts.push(
		"",
		"## Conversation Phases",
		"",
		"### Phase 1: Research & Discuss",
		"- Ask 1-2 clarifying questions at a time to understand the user's intent. Do not overwhelm with many questions.",
		"- Use the search tools to check for existing tasks and relevant documentation when discussing features or bugs."
	);

	if (hasCodebase) {
		parts.push(
			"- Use `listFiles`, `readFile`, and `searchCode` to explore the codebase and provide accurate technical assessments.",
			"- When analyzing code, start with `listFiles` to understand structure, then `readFile` or `searchCode` for specifics."
		);
	}

	parts.push(
		"- Surface technical insights in plain, non-technical language. Avoid jargon unless you explain it.",
		"- Access role in the app is not the same thing as someone's company role or specialty.",
		"- Before calling `proposePlan`, assess the scope level. Match your task count to the scope classification.",
		"- When you have enough context, use the `proposePlan` tool to present a structured plan card with concrete tasks.",
		"- For large-scope requests, use `createDoc` instead to write a discovery document with phases and open questions.",
		"- Each proposed task should include a stable `clientId`, title, brief, urgency, complexity/risk/effort assessment, affected areas, optional hard blocker references in `blockedBy`, and an optional `assigneeId`.",
		"- Use `blockedBy` only for hard blockers that must be done first.",
		"- Prefer `plan_task` blocker references for dependencies within the same plan.",
		"- Use `existing_task` blocker references only for clear same-project dependencies, ideally after checking with `searchTasks`.",
		"- Before setting `assigneeId`, call `listAssignmentCandidates` and only choose from those candidates.",
		"- Leave `assigneeId` empty when there is no strong match.",
		"- Be honest about feasibility and complexity. If something is difficult or risky, say so clearly.",
		"- Keep responses concise and focused. Avoid unnecessary filler.",
		"- After calling `proposePlan`, briefly summarize what you proposed and ask the user to review the plan card.",
		"- If the user requests changes to a plan, ask specifically what they'd like to change. Then incorporate their feedback and use `proposePlan` again with a revised plan.",
		"- You can propose multiple revised plans in a single conversation. Each new plan replaces the previous rejected one."
	);

	if (hasApprovedPlan) {
		parts.push(
			"",
			"### Phase 2: Execute (ACTIVE)",
			"The user has approved a plan. You now have access to write tools (`createTask`, `updateTask`).",
			"- Use `createTask` only if the user requests additional tasks beyond the approved plan.",
			"- Use `updateTask` to refine existing tasks if the user provides feedback or corrections.",
			"- Do NOT create tasks that were already created by the plan approval — those are handled automatically.",
			"- Summarize any changes you make so the user knows what was created or updated."
		);
	}

	return parts.join("\n");
}

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		const { conversation, project, hasApprovedPlan, proposedPlanSummary } =
			await ctx.runQuery(internal.chat.getConversationWithProject, {
				threadId,
			});

		const systemPrompt = project
			? buildSystemPrompt(project, hasApprovedPlan, proposedPlanSummary)
			: undefined;
		const tools = conversation
			? {
					...createSearchTools(conversation.projectId),
					...createAssignmentTools(conversation.projectId),
					...(project?.repoUrl
						? createCodebaseTools(conversation._id, conversation.projectId)
						: {}),
					...createPlanTools(conversation.projectId, conversation._id),
					...createDocTools(
						conversation.projectId,
						conversation._id,
						conversation.createdBy
					),
					...(hasApprovedPlan
						? createWriteTools(conversation.projectId, conversation._id)
						: {}),
				}
			: undefined;

		for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
			const result = await chatAgent.streamText(
				ctx,
				{ threadId },
				{
					promptMessageId,
					system: systemPrompt,
					tools,
					stopWhen: stepCountIs(STEPS_PER_ROUND),
				},
				{ saveStreamDeltas: true }
			);

			const finishReason = await result.finishReason;
			if (finishReason !== "tool-calls" || round === MAX_CONTINUATIONS) {
				break;
			}
		}

		// Schedule title generation if the conversation doesn't have one yet
		if (conversation && !conversation.title) {
			await ctx.scheduler.runAfter(0, internal.chat.generateTitleAsync, {
				threadId,
				conversationId: conversation._id,
			});
		}
	},
});

export const getConversationByThreadId = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		return await ctx.db
			.query("conversations")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();
	},
});

export const getConversationWithProject = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, { threadId }) => {
		const conversation = await ctx.db
			.query("conversations")
			.withIndex("by_threadId", (q) => q.eq("threadId", threadId))
			.unique();
		if (!conversation) {
			return {
				conversation: null,
				project: null,
				hasApprovedPlan: false,
				proposedPlanSummary: null,
			};
		}
		const [project, plans] = await Promise.all([
			ctx.db.get(conversation.projectId),
			ctx.db
				.query("plans")
				.withIndex("by_conversationId", (q) =>
					q.eq("conversationId", conversation._id)
				)
				.collect(),
		]);

		const approvedPlan =
			plans.find((plan) => plan.status === "approved") ?? null;
		const proposedPlan =
			plans
				.filter((plan) => plan.status === "proposed")
				.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
		let proposedPlanSummary: string | null = null;

		if (proposedPlan) {
			const assigneeIds = proposedPlan.tasks.flatMap((task) =>
				task.assigneeId ? [task.assigneeId] : []
			);
			const userMap = await resolveUserNames(ctx, assigneeIds);
			proposedPlanSummary = proposedPlan.tasks
				.map((task, index) => {
					const assigneeName = task.assigneeId
						? (userMap.get(task.assigneeId)?.name ?? "Unknown")
						: null;
					const assignmentLabel = assigneeName
						? `Assigned to ${assigneeName}`
						: "Unassigned";
					return `${index + 1}. ${task.title} (${task.urgency} urgency, ${assignmentLabel})`;
				})
				.join("\n");
		}

		return {
			conversation,
			project,
			hasApprovedPlan: approvedPlan !== null,
			proposedPlanSummary,
		};
	},
});

export const generateTitleAsync = internalAction({
	args: {
		threadId: v.string(),
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, { threadId, conversationId }) => {
		try {
			const messages: Array<{ role: string; text: string }> =
				await ctx.runQuery(internal.chat.getThreadMessages, {
					threadId,
				});

			if (messages.length === 0) {
				return;
			}

			const transcript = messages.map((m) => `${m.role}: ${m.text}`).join("\n");

			const { text: title } = await generateText({
				model: languageModel,
				system:
					"Generate a short, descriptive title (max 6 words) for this conversation. Return ONLY the title text, nothing else. No quotes, no punctuation at the end.",
				prompt: transcript,
			});

			await ctx.runMutation(internal.chat.updateConversationTitle, {
				conversationId,
				title: title.trim(),
			});
		} catch {
			// Title generation is non-critical; fail silently
		}
	},
});

export const getThreadMessages = internalQuery({
	args: {
		threadId: v.string(),
	},
	handler: async (ctx, args) => {
		const { page } = await listUIMessages(ctx, components.agent, {
			threadId: args.threadId,
			paginationOpts: { cursor: null, numItems: 5 },
		});
		return page.map((m) => ({ role: m.role, text: m.text ?? "" }));
	},
});

export const updateConversationTitle = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		title: v.string(),
	},
	handler: async (ctx, { conversationId, title }) => {
		await ctx.db.patch(conversationId, { title });
	},
});

export const deleteThreadData = internalAction({
	args: {
		threadIds: v.array(v.string()),
	},
	handler: async (ctx, { threadIds }) => {
		for (const threadId of threadIds) {
			try {
				await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, {
					threadId,
				});
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				console.error(`Failed to delete thread ${threadId}: ${message}`);
			}
		}
	},
});
