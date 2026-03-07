import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { logActivity } from "./activity";
import { getAppUser, getOrgMembership, requireProjectMember } from "./helpers";

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
			.query("triageItems")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.collect();
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

		await logActivity(ctx, {
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
