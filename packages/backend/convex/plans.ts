import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
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
import {
	planTaskDependencyRefValidator,
	planTaskValidator,
	taskUrgencyValidator,
} from "./schema";
import { insertTask } from "./tasks";
import { removeTriageForConversation } from "./triageItems";

type PlanTask = Doc<"plans">["tasks"][number];
type PlanBlockerRef = PlanTask["blockedBy"][number];

function isSameBlockerRef(
	left:
		| { kind: "plan_task"; clientId: string }
		| { kind: "existing_task"; taskId: Id<"tasks"> },
	right:
		| { kind: "plan_task"; clientId: string }
		| { kind: "existing_task"; taskId: Id<"tasks"> }
) {
	if (left.kind === "plan_task" && right.kind === "plan_task") {
		return left.clientId === right.clientId;
	}

	if (left.kind === "existing_task" && right.kind === "existing_task") {
		return left.taskId === right.taskId;
	}

	return false;
}

async function validatePlanTasks(
	ctx: MutationCtx,
	projectId: Id<"projects">,
	tasks: PlanTask[]
) {
	await validatePlanAssignees(ctx, projectId, tasks);
	const existingTaskMap = await getExistingBlockerTaskMap(ctx, tasks);
	validatePlanBlockerRefs(projectId, tasks, existingTaskMap);
}

async function validatePlanAssignees(
	ctx: MutationCtx,
	projectId: Id<"projects">,
	tasks: PlanTask[]
) {
	for (const task of tasks) {
		if (
			task.assigneeId &&
			!(await isProjectAssignmentCandidate(ctx, projectId, task.assigneeId))
		) {
			throw new Error("Plan contains an invalid assignee");
		}
	}
}

async function getExistingBlockerTaskMap(ctx: MutationCtx, tasks: PlanTask[]) {
	const existingTaskIds = [
		...new Set(
			tasks.flatMap((task) =>
				task.blockedBy.flatMap((blockerRef) =>
					blockerRef.kind === "existing_task" ? [blockerRef.taskId] : []
				)
			)
		),
	];
	const existingTasks = await Promise.all(
		existingTaskIds.map((taskId) => ctx.db.get(taskId))
	);

	return new Map(
		existingTasks
			.filter((task): task is NonNullable<typeof task> => task !== null)
			.map((task) => [task._id, task])
	);
}

function validatePlanBlockerRefs(
	projectId: Id<"projects">,
	tasks: PlanTask[],
	existingTaskMap: Map<Id<"tasks">, Doc<"tasks">>
) {
	const clientIds = new Set<string>();
	for (const task of tasks) {
		if (clientIds.has(task.clientId)) {
			throw new Error("Plan contains duplicate task client IDs");
		}
		clientIds.add(task.clientId);
	}

	for (const task of tasks) {
		for (const blockerRef of task.blockedBy) {
			validatePlanBlockerRef(
				projectId,
				task,
				blockerRef,
				clientIds,
				existingTaskMap
			);
		}
	}
}

function validatePlanBlockerRef(
	projectId: Id<"projects">,
	task: PlanTask,
	blockerRef: PlanBlockerRef,
	clientIds: Set<string>,
	existingTaskMap: Map<Id<"tasks">, Doc<"tasks">>
) {
	if (blockerRef.kind === "plan_task") {
		if (
			blockerRef.clientId === task.clientId ||
			!clientIds.has(blockerRef.clientId)
		) {
			throw new Error("Plan contains an invalid internal blocker reference");
		}
		return;
	}

	const existingTask = existingTaskMap.get(blockerRef.taskId);
	if (!existingTask || existingTask.projectId !== projectId) {
		throw new Error("Plan contains an invalid existing blocker reference");
	}
}

export const create = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		projectId: v.id("projects"),
		tasks: v.array(planTaskValidator),
	},
	handler: async (ctx, args) => {
		await validatePlanTasks(ctx, args.projectId, args.tasks);

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

		const existingTaskIds = [
			...new Set(
				plan.tasks.flatMap((task) =>
					task.blockedBy.flatMap((blockerRef) =>
						blockerRef.kind === "existing_task" ? [blockerRef.taskId] : []
					)
				)
			),
		];
		const existingTasks = await Promise.all(
			existingTaskIds.map((taskId) => ctx.db.get(taskId))
		);

		return {
			...plan,
			existingTaskTitles: Object.fromEntries(
				existingTasks
					.filter((task): task is NonNullable<typeof task> => task !== null)
					.map((task) => [task._id, task.title])
			),
		};
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

export const updateTaskUrgency = mutation({
	args: {
		planId: v.id("plans"),
		taskIndex: v.number(),
		urgency: taskUrgencyValidator,
	},
	handler: async (ctx, args) => {
		const { plan } = await getProposedPlanWithAuth(ctx, args.planId);
		if (args.taskIndex < 0 || args.taskIndex >= plan.tasks.length) {
			throw new Error("Task not found in plan");
		}

		const nextTasks = plan.tasks.map((task, index) =>
			index === args.taskIndex ? { ...task, urgency: args.urgency } : task
		);

		await ctx.db.patch(args.planId, { tasks: nextTasks });
	},
});

export const removeTaskBlocker = mutation({
	args: {
		planId: v.id("plans"),
		taskIndex: v.number(),
		blockerRef: planTaskDependencyRefValidator,
	},
	handler: async (ctx, args) => {
		const { plan } = await getProposedPlanWithAuth(ctx, args.planId);
		if (args.taskIndex < 0 || args.taskIndex >= plan.tasks.length) {
			throw new Error("Task not found in plan");
		}

		const nextTasks = plan.tasks.map((task, index) =>
			index === args.taskIndex
				? {
						...task,
						blockedBy: task.blockedBy.filter(
							(blockerRef) => !isSameBlockerRef(blockerRef, args.blockerRef)
						),
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
		const createdTasks: Array<{ clientId: string; taskId: Id<"tasks"> }> = [];
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
				affectedAreas: task.affectedAreas,
				assigneeId: task.assigneeId,
				brief: task.brief,
				complexity: task.complexity,
				conversationId: plan.conversationId,
				effort: task.effort,
				projectId: plan.projectId,
				risk: task.risk,
				title: task.title,
				urgency: task.urgency,
			});
			taskIds.push(taskId);
			createdTasks.push({
				clientId: task.clientId,
				taskId,
			});
			activityEntries.push({
				projectId: plan.projectId,
				userId: appUser._id,
				action: "created",
				entityType: "task",
				entityId: taskId,
				description: task.title,
			});
		}

		await ctx.runMutation(internal.taskDependencies.createForApprovedPlan, {
			createdTasks,
			projectId: plan.projectId,
			proposedTasks: plan.tasks,
		});

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
