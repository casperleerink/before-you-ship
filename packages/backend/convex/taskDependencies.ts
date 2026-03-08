import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership, requireProjectMember } from "./helpers";
import { planTaskValidator } from "./schema";

type PlanTask = Doc<"plans">["tasks"][number];

function buildDependencyKey(
	blockedTaskId: Id<"tasks">,
	blockerTaskId: Id<"tasks">
) {
	return `${blockedTaskId}:${blockerTaskId}`;
}

async function getValidatedBlockerTasks(
	ctx: MutationCtx,
	projectId: Id<"projects">,
	blockedTaskId: Id<"tasks">,
	blockerTaskIds: Id<"tasks">[]
) {
	const uniqueBlockerIds = [...new Set(blockerTaskIds)];
	for (const blockerTaskId of uniqueBlockerIds) {
		if (blockerTaskId === blockedTaskId) {
			throw new Error("Task cannot block itself");
		}
		const blockerTask = (await ctx.db.get(blockerTaskId)) as {
			projectId: Id<"projects">;
		} | null;
		if (!blockerTask) {
			throw new Error("Blocker task not found");
		}
		if (blockerTask.projectId !== projectId) {
			throw new Error("Blocker task must belong to the same project");
		}
	}
	return uniqueBlockerIds;
}

async function collectApprovedPlanDependencies(
	ctx: MutationCtx,
	args: {
		createdTasks: Array<{ clientId: string; taskId: Id<"tasks"> }>;
		projectId: Id<"projects">;
		proposedTasks: PlanTask[];
	}
) {
	const clientTaskMap = new Map(
		args.createdTasks.map((task) => [task.clientId, task.taskId])
	);
	const dependenciesToCreate = new Map<
		string,
		{ blockedTaskId: Id<"tasks">; blockerTaskId: Id<"tasks"> }
	>();

	for (const task of args.proposedTasks) {
		const blockedTaskId = clientTaskMap.get(task.clientId);
		if (!blockedTaskId) {
			throw new Error("Created task mapping is incomplete");
		}

		for (const blockerRef of task.blockedBy) {
			const blockerTaskId =
				blockerRef.kind === "plan_task"
					? clientTaskMap.get(blockerRef.clientId)
					: blockerRef.taskId;
			if (!blockerTaskId) {
				throw new Error("Plan blocker mapping is incomplete");
			}

			await validateApprovedDependencyPair(
				ctx,
				args.projectId,
				blockedTaskId,
				blockerTaskId
			);
			dependenciesToCreate.set(
				buildDependencyKey(blockedTaskId, blockerTaskId),
				{
					blockedTaskId,
					blockerTaskId,
				}
			);
		}
	}

	return dependenciesToCreate;
}

async function validateApprovedDependencyPair(
	ctx: MutationCtx,
	projectId: Id<"projects">,
	blockedTaskId: Id<"tasks">,
	blockerTaskId: Id<"tasks">
) {
	const [blockedTask, blockerTask] = await Promise.all([
		ctx.db.get(blockedTaskId),
		ctx.db.get(blockerTaskId),
	]);
	if (!(blockedTask && blockerTask)) {
		throw new Error("Task dependency references a missing task");
	}
	if (
		blockedTask.projectId !== projectId ||
		blockerTask.projectId !== projectId
	) {
		throw new Error("Task dependencies must stay within a project");
	}
	if (blockedTaskId === blockerTaskId) {
		throw new Error("Task cannot block itself");
	}
}

export const listForTask = query({
	args: {
		taskId: v.id("tasks"),
	},
	handler: async (ctx, args) => {
		const [appUser, task] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.taskId),
		]);
		if (!(appUser && task)) {
			return [];
		}

		const project = await ctx.db.get(task.projectId);
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

		const dependencies = await ctx.db
			.query("taskDependencies")
			.withIndex("by_projectId_blockedTaskId", (q) =>
				q.eq("projectId", task.projectId).eq("blockedTaskId", task._id)
			)
			.collect();

		const activeDependencies = dependencies.filter(
			(dependency) => dependency.state === "active"
		);
		const blockerTasks = await Promise.all(
			activeDependencies.map((dependency) =>
				ctx.db.get(dependency.blockerTaskId)
			)
		);
		const assignees = await Promise.all(
			blockerTasks.map((blockerTask) =>
				blockerTask?.assigneeId ? ctx.db.get(blockerTask.assigneeId) : null
			)
		);

		return activeDependencies
			.map((dependency, index) => {
				const blockerTask = blockerTasks[index];
				if (!blockerTask) {
					return null;
				}

				return {
					_id: dependency._id,
					blockerTask: {
						_id: blockerTask._id,
						assigneeId: blockerTask.assigneeId,
						assigneeName: assignees[index]?.name,
						status: blockerTask.status,
						title: blockerTask.title,
					},
					state: dependency.state,
				};
			})
			.filter(
				(dependency): dependency is NonNullable<typeof dependency> =>
					dependency !== null
			);
	},
});

export const dismiss = mutation({
	args: {
		dependencyId: v.id("taskDependencies"),
	},
	handler: async (ctx, args) => {
		const dependency = await ctx.db.get(args.dependencyId);
		if (!dependency) {
			throw new Error("Dependency not found");
		}

		await requireProjectMember(ctx, dependency.projectId);

		if (dependency.state === "dismissed") {
			return;
		}

		await ctx.db.patch(args.dependencyId, {
			state: "dismissed",
			updatedAt: Date.now(),
		});
	},
});

export const replaceForTask = internalMutation({
	args: {
		taskId: v.id("tasks"),
		blockerTaskIds: v.array(v.id("tasks")),
	},
	handler: async (ctx, args) => {
		const task = await ctx.db.get(args.taskId);
		if (!task) {
			throw new Error("Task not found");
		}

		const nextBlockerIds = await getValidatedBlockerTasks(
			ctx,
			task.projectId,
			task._id,
			args.blockerTaskIds
		);

		const existingDependencies = await ctx.db
			.query("taskDependencies")
			.withIndex("by_projectId_blockedTaskId", (q) =>
				q.eq("projectId", task.projectId).eq("blockedTaskId", task._id)
			)
			.collect();
		const now = Date.now();
		const existingByKey = new Map(
			existingDependencies.map((dependency) => [
				buildDependencyKey(dependency.blockedTaskId, dependency.blockerTaskId),
				dependency,
			])
		);
		const nextKeys = new Set(
			nextBlockerIds.map((blockerTaskId) =>
				buildDependencyKey(task._id, blockerTaskId)
			)
		);

		await Promise.all(
			existingDependencies.flatMap((dependency) => {
				const key = buildDependencyKey(
					dependency.blockedTaskId,
					dependency.blockerTaskId
				);
				if (dependency.state === "active" && !nextKeys.has(key)) {
					return [
						ctx.db.patch(dependency._id, {
							state: "dismissed",
							updatedAt: now,
						}),
					];
				}
				return [];
			})
		);

		await Promise.all(
			nextBlockerIds.flatMap((blockerTaskId) => {
				const key = buildDependencyKey(task._id, blockerTaskId);
				const existing = existingByKey.get(key);
				if (existing) {
					return [];
				}
				return [
					ctx.db.insert("taskDependencies", {
						blockedTaskId: task._id,
						blockerTaskId,
						createdAt: now,
						projectId: task.projectId,
						source: "ai",
						state: "active",
						updatedAt: now,
					}),
				];
			})
		);
	},
});

export const createForApprovedPlan = internalMutation({
	args: {
		createdTasks: v.array(
			v.object({
				clientId: v.string(),
				taskId: v.id("tasks"),
			})
		),
		projectId: v.id("projects"),
		proposedTasks: v.array(planTaskValidator),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const dependenciesToCreate = await collectApprovedPlanDependencies(
			ctx,
			args
		);

		await Promise.all(
			[...dependenciesToCreate.values()].map(
				({ blockedTaskId, blockerTaskId }) => {
					return ctx.db.insert("taskDependencies", {
						blockedTaskId,
						blockerTaskId,
						createdAt: now,
						projectId: args.projectId,
						source: "ai",
						state: "active",
						updatedAt: now,
					});
				}
			)
		);
	},
});
