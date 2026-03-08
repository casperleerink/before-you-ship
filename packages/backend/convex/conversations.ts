import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./activity";
import { sendMessageToThread } from "./chat";
import {
	getAppUser,
	getOrgMembership,
	requireProjectMember,
	resolveUserNames,
} from "./helpers";
import { conversationStatusValidator } from "./schema";

async function insertConversation(
	ctx: MutationCtx,
	projectId: Id<"projects">,
	userId: Id<"users">,
	description?: string
) {
	const threadId = await createThread(ctx, components.agent, {});

	const conversationId = await ctx.db.insert("conversations", {
		projectId,
		threadId,
		status: "active",
		createdBy: userId,
		createdAt: Date.now(),
	});

	await logActivity(ctx, {
		projectId,
		userId,
		action: "created",
		entityType: "conversation",
		entityId: conversationId,
		description,
	});

	return { conversationId, threadId };
}

export const list = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!(appUser && project)) {
			return [];
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return [];
		}

		const items = await ctx.db
			.query("conversations")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.collect();

		const userMap = await resolveUserNames(
			ctx,
			items.map((item) => item.createdBy)
		);

		return items.map((item) => ({
			...item,
			createdByUser: userMap.get(item.createdBy) ?? { name: "Unknown" },
		}));
	},
});

export const getById = query({
	args: {
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const [appUser, conversation] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.conversationId),
		]);
		if (!(appUser && conversation)) {
			return null;
		}

		const project = await ctx.db.get(conversation.projectId);
		if (!project) {
			return null;
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return null;
		}

		return conversation;
	},
});

export const create = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireProjectMember(ctx, args.projectId);
		const { conversationId } = await insertConversation(
			ctx,
			args.projectId,
			appUser._id
		);
		return conversationId;
	},
});

export const createFromTriageItem = mutation({
	args: {
		triageItemId: v.id("triageItems"),
	},
	handler: async (ctx, args) => {
		const triageItem = await ctx.db.get(args.triageItemId);
		if (!triageItem) {
			throw new Error("Triage item not found");
		}
		if (triageItem.status === "converted") {
			throw new Error("Triage item already converted");
		}

		const { appUser } = await requireProjectMember(ctx, triageItem.projectId);

		const { conversationId, threadId } = await insertConversation(
			ctx,
			triageItem.projectId,
			appUser._id,
			`from triage: ${triageItem.content.slice(0, 100)}`
		);

		await ctx.db.patch(triageItem._id, {
			status: "converted",
			conversationId,
		});

		await sendMessageToThread(ctx, threadId, triageItem.content);

		return conversationId;
	},
});

export const createWithMessage = mutation({
	args: {
		projectId: v.id("projects"),
		prompt: v.string(),
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireProjectMember(ctx, args.projectId);
		const { conversationId, threadId } = await insertConversation(
			ctx,
			args.projectId,
			appUser._id
		);
		await sendMessageToThread(ctx, threadId, args.prompt);
		return conversationId;
	},
});

export const updateStatus = mutation({
	args: {
		conversationId: v.id("conversations"),
		status: conversationStatusValidator,
	},
	handler: async (ctx, args) => {
		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) {
			throw new Error("Conversation not found");
		}
		const { appUser } = await requireProjectMember(ctx, conversation.projectId);

		await ctx.db.patch(conversation._id, { status: args.status });

		await logActivity(ctx, {
			projectId: conversation.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "conversation",
			entityId: conversation._id,
			description: `changed status to ${args.status}`,
		});
	},
});
