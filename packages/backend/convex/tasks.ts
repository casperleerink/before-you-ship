import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";
import { taskLevelValidator, taskStatusValidator } from "./schema";

type TaskLevel = "low" | "medium" | "high";

export async function insertTask(
	ctx: MutationCtx,
	args: {
		projectId: Id<"projects">;
		conversationId: Id<"conversations">;
		title: string;
		brief: string;
		affectedAreas: string[];
		risk: TaskLevel;
		complexity: TaskLevel;
		effort: TaskLevel;
	}
): Promise<Id<"tasks">> {
	const taskId = await ctx.db.insert("tasks", {
		...args,
		status: "ready",
		createdAt: Date.now(),
	});
	await ctx.scheduler.runAfter(0, internal.embeddings.generateTaskEmbedding, {
		taskId,
	});
	return taskId;
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

export const createFromAgent = internalMutation({
	args: {
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
		title: v.string(),
		brief: v.string(),
		affectedAreas: v.array(v.string()),
		risk: taskLevelValidator,
		complexity: taskLevelValidator,
		effort: taskLevelValidator,
	},
	handler: (ctx, args) => {
		return insertTask(ctx, args);
	},
});

export const updateFromAgent = internalMutation({
	args: {
		taskId: v.id("tasks"),
		projectId: v.id("projects"),
		status: v.optional(taskStatusValidator),
		brief: v.optional(v.string()),
		affectedAreas: v.optional(v.array(v.string())),
		risk: v.optional(taskLevelValidator),
		complexity: v.optional(taskLevelValidator),
		effort: v.optional(taskLevelValidator),
	},
	handler: async (ctx, args) => {
		const task = await ctx.db.get(args.taskId);
		if (!task) {
			throw new Error("Task not found");
		}
		if (task.projectId !== args.projectId) {
			throw new Error("Task does not belong to this project");
		}

		const updates: Partial<
			Pick<
				typeof task,
				"status" | "brief" | "affectedAreas" | "risk" | "complexity" | "effort"
			>
		> = {};
		if (args.status !== undefined) {
			updates.status = args.status;
		}
		if (args.brief !== undefined) {
			updates.brief = args.brief;
		}
		if (args.affectedAreas !== undefined) {
			updates.affectedAreas = args.affectedAreas;
		}
		if (args.risk !== undefined) {
			updates.risk = args.risk;
		}
		if (args.complexity !== undefined) {
			updates.complexity = args.complexity;
		}
		if (args.effort !== undefined) {
			updates.effort = args.effort;
		}

		await ctx.db.patch(args.taskId, updates);

		if (args.brief !== undefined) {
			await ctx.scheduler.runAfter(
				0,
				internal.embeddings.generateTaskEmbedding,
				{ taskId: args.taskId }
			);
		}

		return args.taskId;
	},
});
