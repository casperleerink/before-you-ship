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

export const generateResponseAsync = internalAction({
	args: {
		threadId: v.string(),
		promptMessageId: v.string(),
	},
	handler: async (ctx, { threadId, promptMessageId }) => {
		await chatAgent.streamText(
			ctx,
			{ threadId },
			{ promptMessageId },
			{ saveStreamDeltas: true }
		);

		// Schedule title generation if the conversation doesn't have one yet
		const conversation = await ctx.runQuery(
			internal.chat.getConversationByThreadId,
			{ threadId }
		);

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
