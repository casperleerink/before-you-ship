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

export const listByAssignee = query({
	args: {
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership) {
			return [];
		}

		const tasks = await ctx.db
			.query("tasks")
			.withIndex("by_assigneeId", (q) => q.eq("assigneeId", appUser._id))
			.order("desc")
			.collect();

		// Filter to only tasks belonging to projects in this org and collect names
		const projectIds = [...new Set(tasks.map((t) => t.projectId))];
		const projects = await Promise.all(projectIds.map((id) => ctx.db.get(id)));
		const projectMap = new Map<(typeof tasks)[number]["projectId"], string>();
		for (const p of projects) {
			if (p && p.organizationId === args.orgId) {
				projectMap.set(p._id, p.name);
			}
		}

		const orgTasks = tasks.filter((t) => projectMap.has(t.projectId));

		return orgTasks.map((task) => ({
			...task,
			projectName: projectMap.get(task.projectId) ?? "Unknown",
		}));
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
