import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";
import { taskStatusValidator } from "./schema";

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
			.query("tasks")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.collect();
	},
});

export const getById = query({
	args: {
		taskId: v.id("tasks"),
	},
	handler: async (ctx, args) => {
		const [appUser, task] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.taskId),
		]);
		if (!(appUser && task)) {
			return null;
		}

		const project = await ctx.db.get(task.projectId);
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

		return task;
	},
});

export const update = mutation({
	args: {
		taskId: v.id("tasks"),
		status: v.optional(taskStatusValidator),
		assigneeId: v.optional(v.union(v.id("users"), v.null())),
	},
	handler: async (ctx, args) => {
		const [appUser, task] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.taskId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!task) {
			throw new Error("Task not found");
		}

		const project = await ctx.db.get(task.projectId);
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

		const updates: Partial<Pick<typeof task, "status" | "assigneeId">> = {};
		if (args.status !== undefined) {
			updates.status = args.status;
		}
		if (args.assigneeId !== undefined) {
			updates.assigneeId =
				args.assigneeId === null ? undefined : args.assigneeId;
		}

		await ctx.db.patch(args.taskId, updates);
	},
});
