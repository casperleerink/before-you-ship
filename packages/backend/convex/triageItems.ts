import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
	getAppUser,
	getOrgMembership,
	requireProjectMember,
	resolveUserNames,
} from "./helpers";

/**
 * Remove the triage item connected to a conversation, if any.
 */
export async function removeTriageForConversation(
	ctx: MutationCtx,
	conversationId: Id<"conversations">,
	userId: Id<"users">
) {
	const triageItem = await ctx.db
		.query("triageItems")
		.withIndex("by_conversationId", (q) =>
			q.eq("conversationId", conversationId)
		)
		.unique();

	if (triageItem) {
		await ctx.db.delete(triageItem._id);
		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: triageItem.projectId,
			userId,
			action: "deleted",
			entityType: "triage",
			entityId: triageItem._id,
			description: triageItem.content.slice(0, 100),
		});
	}
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
			.query("triageItems")
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

export const create = mutation({
	args: {
		projectId: v.id("projects"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireProjectMember(ctx, args.projectId);

		const triageId = await ctx.db.insert("triageItems", {
			projectId: args.projectId,
			content: args.content,
			status: "pending",
			createdBy: appUser._id,
			createdAt: Date.now(),
		});

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: args.projectId,
			userId: appUser._id,
			action: "created",
			entityType: "triage",
			entityId: triageId,
			description: args.content,
		});

		return triageId;
	},
});

export const update = mutation({
	args: {
		id: v.id("triageItems"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const triageItem = await ctx.db.get(args.id);
		if (!triageItem) {
			throw new Error("Triage item not found");
		}

		const { appUser } = await requireProjectMember(ctx, triageItem.projectId);

		await ctx.db.patch(args.id, { content: args.content });

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: triageItem.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "triage",
			entityId: args.id,
			description: args.content.slice(0, 100),
		});
	},
});
