import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { sendMessageToThread } from "./chat";
import { getAppUser, getOrgMembership } from "./helpers";
import { conversationStatusValidator } from "./schema";

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
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
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

		const threadId = await createThread(ctx, components.agent, {});

		return ctx.db.insert("conversations", {
			projectId: args.projectId,
			threadId,
			status: "active",
			createdBy: appUser._id,
			createdAt: Date.now(),
		});
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

		const threadId = await createThread(ctx, components.agent, {});

		const conversationId = await ctx.db.insert("conversations", {
			projectId: triageItem.projectId,
			threadId,
			status: "active",
			createdBy: appUser._id,
			createdAt: Date.now(),
		});

		await ctx.db.patch(triageItem._id, {
			status: "converted",
			conversationId,
		});

		await sendMessageToThread(ctx, threadId, triageItem.content);

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
	},
});
