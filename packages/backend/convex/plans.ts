import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import {
	getAppUser,
	getOrgMembership,
	isProjectAssignmentCandidate,
	requireProjectMember,
} from "./helpers";
import { taskLevelValidator } from "./schema";
import { insertTask } from "./tasks";
import { removeTriageForConversation } from "./triageItems";

const proposedTaskValidator = v.object({
	title: v.string(),
	brief: v.string(),
	affectedAreas: v.array(v.string()),
	risk: taskLevelValidator,
	complexity: taskLevelValidator,
	effort: taskLevelValidator,
	assigneeId: v.optional(v.id("users")),
});

export const create = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		projectId: v.id("projects"),
		tasks: v.array(proposedTaskValidator),
	},
	handler: async (ctx, args) => {
		for (const task of args.tasks) {
			if (
				task.assigneeId &&
				!(await isProjectAssignmentCandidate(
					ctx,
					args.projectId,
					task.assigneeId
				))
			) {
				throw new Error("Plan contains an invalid assignee");
			}
		}

		const planId = await ctx.db.insert("plans", {
			conversationId: args.conversationId,
			projectId: args.projectId,
			status: "proposed",
			tasks: args.tasks,
			createdAt: Date.now(),
		});
		return planId;
	},
});

export const getById = query({
	args: {
		planId: v.id("plans"),
	},
	handler: async (ctx, args) => {
		const [appUser, plan] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.planId),
		]);
		if (!(appUser && plan)) {
			return null;
		}

		const project = await ctx.db.get(plan.projectId);
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

		return plan;
	},
});

export const getByIdInternal = internalQuery({
	args: {
		planId: v.id("plans"),
	},
	handler: (ctx, args) => {
		return ctx.db.get(args.planId);
	},
});

async function getProposedPlanWithAuth(ctx: MutationCtx, planId: Id<"plans">) {
	const plan = await ctx.db.get(planId);
	if (!plan) {
		throw new Error("Plan not found");
	}
	if (plan.status !== "proposed") {
		throw new Error("Plan is not in proposed status");
	}
	const { appUser } = await requireProjectMember(ctx, plan.projectId);

	return { plan, appUser };
}

export const updateTaskAssignee = mutation({
	args: {
		planId: v.id("plans"),
		taskIndex: v.number(),
		assigneeId: v.union(v.id("users"), v.null()),
	},
	handler: async (ctx, args) => {
		const { plan } = await getProposedPlanWithAuth(ctx, args.planId);
		if (args.taskIndex < 0 || args.taskIndex >= plan.tasks.length) {
			throw new Error("Task not found in plan");
		}

		if (
			args.assigneeId !== null &&
			!(await isProjectAssignmentCandidate(
				ctx,
				plan.projectId,
				args.assigneeId
			))
		) {
			throw new Error("Selected assignee is not eligible for this project");
		}

		const nextTasks = plan.tasks.map((task, index) =>
			index === args.taskIndex
				? {
						...task,
						assigneeId: args.assigneeId === null ? undefined : args.assigneeId,
					}
				: task
		);

		await ctx.db.patch(args.planId, { tasks: nextTasks });
	},
});

export const approve = mutation({
	args: {
		planId: v.id("plans"),
	},
	handler: async (ctx, args) => {
		const { plan, appUser } = await getProposedPlanWithAuth(ctx, args.planId);

		const taskIds: Id<"tasks">[] = [];
		const activityEntries: Array<{
			projectId: Id<"projects">;
			userId: Id<"users">;
			action: "created" | "updated" | "deleted";
			entityType: "task" | "plan";
			entityId: string;
			description: string;
		}> = [];
		for (const task of plan.tasks) {
			if (
				task.assigneeId &&
				!(await isProjectAssignmentCandidate(
					ctx,
					plan.projectId,
					task.assigneeId
				))
			) {
				throw new Error(
					`Assignee for "${task.title}" is no longer eligible for this project`
				);
			}

			const taskId = await insertTask(ctx, {
				projectId: plan.projectId,
				conversationId: plan.conversationId,
				...task,
			});
			taskIds.push(taskId);
			activityEntries.push({
				projectId: plan.projectId,
				userId: appUser._id,
				action: "created",
				entityType: "task",
				entityId: taskId,
				description: task.title,
			});
		}

		await ctx.db.patch(args.planId, {
			status: "approved",
			createdTaskIds: taskIds,
		});

		await ctx.db.patch(plan.conversationId, {
			status: "completed",
		});

		await removeTriageForConversation(ctx, plan.conversationId, appUser._id);

		activityEntries.push({
			projectId: plan.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "plan",
			entityId: args.planId,
			description: `approved plan with ${taskIds.length} tasks`,
		});
		await ctx.scheduler.runAfter(1, internal.activity.recordMany, {
			entries: activityEntries,
		});

		return plan._id;
	},
});

export const getCurrentProposedByConversationInternal = internalQuery({
	args: {
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const plans = await ctx.db
			.query("plans")
			.withIndex("by_conversationId", (q) =>
				q.eq("conversationId", args.conversationId)
			)
			.collect();

		return (
			plans
				.filter((plan) => plan.status === "proposed")
				.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
		);
	},
});

export const reject = mutation({
	args: {
		planId: v.id("plans"),
	},
	handler: async (ctx, args) => {
		const { plan, appUser } = await getProposedPlanWithAuth(ctx, args.planId);
		await ctx.db.patch(args.planId, { status: "rejected" });

		await ctx.scheduler.runAfter(1, internal.activity.record, {
			projectId: plan.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "plan",
			entityId: args.planId,
			description: "rejected plan",
		});

		return plan._id;
	},
});

export const listByConversation = query({
	args: {
		conversationId: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) {
			return [];
		}

		const project = await ctx.db.get(conversation.projectId);
		if (!project) {
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
			.query("plans")
			.withIndex("by_conversationId", (q) =>
				q.eq("conversationId", args.conversationId)
			)
			.collect();
	},
});
