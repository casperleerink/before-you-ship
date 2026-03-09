import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const REPO_ROOT = "/home/daytona/repo";

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

// Conversation-scoped sandbox helpers

export const getConversationSandboxId = internalQuery({
	args: {
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const conversation = await ctx.db.get(args.conversationId);
		return conversation?.sandboxId ?? null;
	},
});

export const setConversationSandboxId = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.conversationId, {
			sandboxId: args.sandboxId,
		});
	},
});

export const clearConversationSandboxId = internalMutation({
	args: {
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.conversationId, {
			sandboxId: undefined,
		});
	},
});
