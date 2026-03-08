import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import {
	getAppUser,
	getOrgMembership,
	isProjectAssignmentCandidate,
	requireProjectMember,
} from "./helpers";
import {
	taskLevelValidator,
	taskStatusValidator,
	taskUrgencyValidator,
} from "./schema";

type TaskLevel = "low" | "medium" | "high";
type TaskUrgency = "low" | "medium" | "high";

function levelWeight(level: TaskLevel | TaskUrgency) {
	switch (level) {
		case "high":
			return 3;
		case "medium":
			return 2;
		default:
			return 1;
	}
}

function urgencyReason(urgency: TaskUrgency) {
	switch (urgency) {
		case "high":
			return "High urgency";
		case "medium":
			return "Medium urgency";
		default:
			return "Low urgency";
	}
}

function compareQueueTasks(
	a: {
		blocksMyTasksCount: number;
		createdAt: number;
		isBlocked: boolean;
		risk: TaskLevel;
		status: "ready" | "in_progress" | "done";
		urgency: TaskUrgency;
	},
	b: {
		blocksMyTasksCount: number;
		createdAt: number;
		isBlocked: boolean;
		risk: TaskLevel;
		status: "ready" | "in_progress" | "done";
		urgency: TaskUrgency;
	}
) {
	let blockedComparison = 0;
	if (a.isBlocked !== b.isBlocked) {
		blockedComparison = a.isBlocked ? 1 : -1;
	}
	const aUnblocks = a.blocksMyTasksCount > 0;
	const bUnblocks = b.blocksMyTasksCount > 0;
	let unblockComparison = 0;
	if (aUnblocks !== bUnblocks) {
		unblockComparison = aUnblocks ? -1 : 1;
	}
	const comparisons = [
		blockedComparison,
		unblockComparison,
		levelWeight(b.urgency) - levelWeight(a.urgency),
		levelWeight(b.risk) - levelWeight(a.risk),
		(b.status === "in_progress" ? 1 : 0) - (a.status === "in_progress" ? 1 : 0),
		b.blocksMyTasksCount - a.blocksMyTasksCount,
		a.createdAt - b.createdAt,
	];

	return comparisons.find((comparison) => comparison !== 0) ?? 0;
}

function getQueueReasons(args: {
	blockedBy: { title: string }[];
	blocksMyTasksCount: number;
	risk: TaskLevel;
	status: "ready" | "in_progress" | "done";
	urgency: TaskUrgency;
}) {
	const reasons: string[] = [];

	if (args.blockedBy.length > 0) {
		reasons.push(`Blocked by ${args.blockedBy[0]?.title ?? "another task"}`);
	}
	if (args.blocksMyTasksCount > 0) {
		reasons.push(
			`Unblocks ${args.blocksMyTasksCount} of your task${args.blocksMyTasksCount === 1 ? "" : "s"}`
		);
	}
	if (args.urgency !== "low") {
		reasons.push(urgencyReason(args.urgency));
	}
	if (args.risk === "high") {
		reasons.push("High risk");
	}
	if (args.status === "in_progress") {
		reasons.push("Already in progress");
	}
	if (reasons.length === 0) {
		reasons.push("Ready to pick up");
	}

	return reasons.slice(0, 3);
}

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
		urgency: TaskUrgency;
		assigneeId?: Id<"users">;
	}
): Promise<Id<"tasks">> {
	const taskId = await ctx.db.insert("tasks", {
		...args,
		status: "ready",
		createdAt: Date.now(),
	});
	await ctx.scheduler.runAfter(1, internal.embeddings.generateTaskEmbedding, {
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

export const listMyRankedQueue = query({
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

		const assignedTasks = await ctx.db
			.query("tasks")
			.withIndex("by_assigneeId", (q) => q.eq("assigneeId", appUser._id))
			.order("desc")
			.collect();

		const projectIds = [
			...new Set(assignedTasks.map((task) => task.projectId)),
		];
		const projects = await Promise.all(
			projectIds.map((projectId) => ctx.db.get(projectId))
		);
		const projectNameMap = new Map<Id<"projects">, string>();
		for (const project of projects) {
			if (project && project.organizationId === args.orgId) {
				projectNameMap.set(project._id, project.name);
			}
		}

		const openTasks = assignedTasks.filter(
			(task) => task.status !== "done" && projectNameMap.has(task.projectId)
		);
		const dependencyLists = await Promise.all(
			openTasks.map((task) =>
				ctx.db
					.query("taskDependencies")
					.withIndex("by_projectId_blockedTaskId", (q) =>
						q.eq("projectId", task.projectId).eq("blockedTaskId", task._id)
					)
					.collect()
			)
		);
		const dependencies = dependencyLists
			.flat()
			.filter((dependency) => dependency.state === "active");
		const blockerTaskIds = [
			...new Set(dependencies.map((dependency) => dependency.blockerTaskId)),
		];
		const blockerTasks = await Promise.all(
			blockerTaskIds.map((taskId) => ctx.db.get(taskId))
		);
		const blockerMap = new Map(
			blockerTasks
				.filter((task): task is NonNullable<typeof task> => task !== null)
				.map((task) => [task._id, task])
		);
		const blockerAssigneeIds = [
			...new Set(
				blockerTasks.flatMap((task) =>
					task?.assigneeId ? [task.assigneeId] : []
				)
			),
		];
		const blockerAssignees = await Promise.all(
			blockerAssigneeIds.map((assigneeId) => ctx.db.get(assigneeId))
		);
		const blockerAssigneeMap = new Map(
			blockerAssignees
				.filter((user): user is NonNullable<typeof user> => user !== null)
				.map((user) => [user._id, user.name])
		);
		const blockersByTask = new Map<
			Id<"tasks">,
			Array<{
				assigneeId?: Id<"users">;
				assigneeName?: string;
				status: (typeof openTasks)[number]["status"];
				taskId: Id<"tasks">;
				title: string;
			}>
		>();

		for (const [index, task] of openTasks.entries()) {
			const unresolvedBlockers = dependencyLists[index]
				.filter((dependency) => dependency.state === "active")
				.flatMap((dependency) => {
					const blockerTask = blockerMap.get(dependency.blockerTaskId);
					if (!blockerTask || blockerTask.status === "done") {
						return [];
					}
					return [
						{
							assigneeId: blockerTask.assigneeId,
							assigneeName: blockerTask.assigneeId
								? blockerAssigneeMap.get(blockerTask.assigneeId)
								: undefined,
							status: blockerTask.status,
							taskId: blockerTask._id,
							title: blockerTask.title,
						},
					];
				});
			blockersByTask.set(task._id, unresolvedBlockers);
		}

		const myTaskIds = new Set(openTasks.map((task) => task._id));
		const blocksMyTasksCount = new Map(openTasks.map((task) => [task._id, 0]));
		for (const blockers of blockersByTask.values()) {
			for (const blocker of blockers) {
				if (myTaskIds.has(blocker.taskId)) {
					blocksMyTasksCount.set(
						blocker.taskId,
						(blocksMyTasksCount.get(blocker.taskId) ?? 0) + 1
					);
				}
			}
		}

		const rankedTasks = openTasks
			.map((task) => {
				const blockedBy = blockersByTask.get(task._id) ?? [];
				const blocksCount = blocksMyTasksCount.get(task._id) ?? 0;
				return {
					...task,
					blockedBy,
					blocksMyTasksCount: blocksCount,
					isBlocked: blockedBy.length > 0,
					projectName: projectNameMap.get(task.projectId) ?? "Unknown",
					rankReasons: getQueueReasons({
						blockedBy,
						blocksMyTasksCount: blocksCount,
						risk: task.risk,
						status: task.status,
						urgency: task.urgency,
					}),
				};
			})
			.sort(compareQueueTasks);

		return rankedTasks.map((task, index) => ({
			...task,
			rank: index + 1,
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
		urgency: v.optional(taskUrgencyValidator),
	},
	handler: async (ctx, args) => {
		const task = await ctx.db.get(args.taskId);
		if (!task) {
			throw new Error("Task not found");
		}
		const { appUser } = await requireProjectMember(ctx, task.projectId);

		const updates: Partial<
			Pick<typeof task, "status" | "assigneeId" | "urgency">
		> = {};
		if (args.status !== undefined) {
			updates.status = args.status;
		}
		if (args.assigneeId !== undefined) {
			if (
				args.assigneeId !== null &&
				!(await isProjectAssignmentCandidate(
					ctx,
					task.projectId,
					args.assigneeId
				))
			) {
				throw new Error("Selected assignee is not eligible for this project");
			}
			updates.assigneeId =
				args.assigneeId === null ? undefined : args.assigneeId;
		}
		if (args.urgency !== undefined) {
			updates.urgency = args.urgency;
		}

		await ctx.db.patch(args.taskId, updates);

		const parts: string[] = [];
		if (args.status !== undefined) {
			parts.push(`changed status to ${args.status}`);
		}
		if (args.assigneeId !== undefined) {
			parts.push(args.assigneeId === null ? "unassigned" : "reassigned");
		}
		if (args.urgency !== undefined) {
			parts.push(`changed urgency to ${args.urgency}`);
		}

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: task.projectId,
			userId: appUser._id,
			action: "updated",
			entityType: "task",
			entityId: args.taskId,
			description: parts.join(", "),
		});
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
		urgency: taskUrgencyValidator,
		assigneeId: v.optional(v.id("users")),
	},
	handler: async (ctx, args) => {
		if (
			args.assigneeId &&
			!(await isProjectAssignmentCandidate(
				ctx,
				args.projectId,
				args.assigneeId
			))
		) {
			throw new Error("Selected assignee is not eligible for this project");
		}
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
		urgency: v.optional(taskUrgencyValidator),
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
				| "status"
				| "brief"
				| "affectedAreas"
				| "risk"
				| "complexity"
				| "effort"
				| "urgency"
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
		if (args.urgency !== undefined) {
			updates.urgency = args.urgency;
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
