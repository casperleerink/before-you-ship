import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./activity";
import { sendMessageToThread } from "./chat";
import { getAppUser, getOrgMembership } from "./helpers";
import { conversationStatusValidator } from "./schema";

async function getAuthenticatedMember(
	ctx: MutationCtx,
	projectId: Id<"projects">
) {
	const [appUser, project] = await Promise.all([
		getAppUser(ctx),
		ctx.db.get(projectId),
	]);
	if (!appUser) {
		throw new Error("Not authenticated");
	}
	if (!project) {
		throw new Error("Project not found");
	}

	const membership = await getOrgMembership(
		ctx,
		project.organizationId,
		appUser._id
	);
	if (!membership) {
		throw new Error("Not a member of this organization");
	}

	return appUser;
}

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

		return ctx.db
			.query("conversations")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.collect();
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
		const appUser = await getAuthenticatedMember(ctx, args.projectId);
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
		const [appUser, triageItem] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.triageItemId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!triageItem) {
			throw new Error("Triage item not found");
		}
		if (triageItem.status === "converted") {
			throw new Error("Triage item already converted");
		}

		const project = await ctx.db.get(triageItem.projectId);
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

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
		const appUser = await getAuthenticatedMember(ctx, args.projectId);
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
		const [appUser, conversation] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.conversationId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!conversation) {
			throw new Error("Conversation not found");
		}

		const project = await ctx.db.get(conversation.projectId);
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

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
