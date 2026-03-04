import {
	createThread,
	listUIMessages,
	saveMessage,
	syncStreams,
	vStreamArgs,
} from "@convex-dev/agent";
import { generateText } from "ai";
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
import { createSearchTools } from "./tools";

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

function buildSystemPrompt(project: {
	name: string;
	description?: string;
	repoUrl?: string;
}): string {
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

	parts.push(
		"",
		"## Available Tools",
		"- **searchTasks**: Search existing tasks in this project by semantic similarity. Use this to check for duplicates or related work before proposing new tasks.",
		"- **searchDocs**: Search project documentation by semantic similarity. Use this to find relevant context, requirements, or specifications.",
		"",
		"## Your Behavior",
		"- Ask 1-2 clarifying questions at a time to understand the user's intent. Do not overwhelm with many questions.",
		"- Use the search tools to check for existing tasks and relevant documentation when discussing features or bugs.",
		"- Surface technical insights in plain, non-technical language. Avoid jargon unless you explain it.",
		"- When you have enough context, bias toward proposing a structured plan with concrete tasks.",
		"- Each proposed task should include a title, brief description, complexity/risk/effort assessment, and affected areas of the codebase.",
		"- Be honest about feasibility and complexity. If something is difficult or risky, say so clearly.",
		"- Keep responses concise and focused. Avoid unnecessary filler."
	);

	return parts.join("\n");
}

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		const { conversation, project } = await ctx.runQuery(
			internal.chat.getConversationWithProject,
			{ threadId }
		);

		const systemPrompt = project ? buildSystemPrompt(project) : undefined;
		const tools = conversation
			? createSearchTools(conversation.projectId)
			: undefined;

		await chatAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId, system: systemPrompt, tools },
			{ saveStreamDeltas: true }
		);

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
			return { conversation: null, project: null };
		}
		const project = await ctx.db.get(conversation.projectId);
		return { conversation, project };
	},
});

export const generateTitleAsync = internalAction({
	args: {
		threadId: v.string(),
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, { threadId, conversationId }) => {
		try {
			const messages = await ctx.runQuery(internal.chat.getThreadMessages, {
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
