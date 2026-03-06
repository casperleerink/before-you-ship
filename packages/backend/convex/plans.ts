import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { logActivity } from "./activity";
import { getAppUser, getOrgMembership } from "./helpers";
import { taskLevelValidator } from "./schema";
import { insertTask } from "./tasks";

const proposedTaskValidator = v.object({
	title: v.string(),
	brief: v.string(),
	affectedAreas: v.array(v.string()),
	risk: taskLevelValidator,
	complexity: taskLevelValidator,
	effort: taskLevelValidator,
});

export const create = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		projectId: v.id("projects"),
		tasks: v.array(proposedTaskValidator),
	},
	handler: async (ctx, args) => {
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
	const [appUser, plan] = await Promise.all([
		getAppUser(ctx),
		ctx.db.get(planId),
	]);
	if (!appUser) {
		throw new Error("Not authenticated");
	}
	if (!plan) {
		throw new Error("Plan not found");
	}
	if (plan.status !== "proposed") {
		throw new Error("Plan is not in proposed status");
	}

	const project = await ctx.db.get(plan.projectId);
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

	return { plan, appUser };
}

export const approve = mutation({
	args: {
		planId: v.id("plans"),
	},
	handler: async (ctx, args) => {
		const { plan, appUser } = await getProposedPlanWithAuth(ctx, args.planId);

		const taskIds: Id<"tasks">[] = [];
		for (const task of plan.tasks) {
			const taskId = await insertTask(ctx, {
				projectId: plan.projectId,
				conversationId: plan.conversationId,
				...task,
			});
			taskIds.push(taskId);

			await logActivity(ctx, {
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

		await logActivity(ctx, {
			projectId: plan.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "plan",
			entityId: args.planId,
			description: `approved plan with ${taskIds.length} tasks`,
		});

		return plan._id;
	},
});

export const reject = mutation({
	args: {
		planId: v.id("plans"),
	},
	handler: async (ctx, args) => {
		const { plan, appUser } = await getProposedPlanWithAuth(ctx, args.planId);
		await ctx.db.patch(args.planId, { status: "rejected" });

		await logActivity(ctx, {
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
