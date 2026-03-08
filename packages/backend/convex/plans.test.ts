import { expect, test, vi } from "vitest";
import {
	createActor,
	createConversationGraph,
	createPlan,
	createTask,
	createTriageItem,
	scheduledJobNames,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

test("plans.approve creates tasks, updates state, removes triage, and schedules follow-up work", async () => {
	vi.useFakeTimers();
	const t = initConvexTest();
	const actor = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const { conversationId, projectId } = await createConversationGraph(t, actor);
	const planId = await createPlan(t, { conversationId, projectId });

	await createTriageItem(t, actor, projectId, "Convert this request to work");
	await t.run(async (ctx) => {
		const triageItem = await ctx.db
			.query("triageItems")
			.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
			.first();
		if (!triageItem) {
			throw new Error("Missing triage item");
		}
		await ctx.db.patch(triageItem._id, { conversationId });
	});

	await actor.as.mutation(api.plans.approve, { planId });

	const state = await t.run(async (ctx) => {
		const [dependencies, plan, conversation, tasks, triageItems] =
			await Promise.all([
				ctx.db
					.query("taskDependencies")
					.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
					.collect(),
				ctx.db.get(planId),
				ctx.db.get(conversationId),
				ctx.db
					.query("tasks")
					.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
					.collect(),
				ctx.db
					.query("triageItems")
					.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
					.collect(),
			]);

		return { conversation, dependencies, plan, tasks, triageItems };
	});

	expect(state.plan).toMatchObject({
		createdTaskIds: expect.arrayContaining(state.tasks.map((task) => task._id)),
		status: "approved",
	});
	expect(state.conversation).toMatchObject({ status: "completed" });
	expect(state.tasks).toHaveLength(2);
	expect(state.dependencies).toHaveLength(1);
	expect(state.triageItems).toEqual([]);

	const jobs = await scheduledJobNames(t);
	expect(jobs).toEqual(
		expect.arrayContaining([
			"activity:recordMany",
			"activity:record",
			"embeddings:generateTaskEmbedding",
		])
	);

	vi.useRealTimers();
});

test("plans.updateTaskAssignee persists a draft assignee and approval carries it to tasks", async () => {
	vi.useFakeTimers();
	const t = initConvexTest();
	const owner = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const assignee = await createActor(t, {
		email: "assignee@example.com",
		name: "Assignee",
	});
	const { conversationId, organizationId, projectId } =
		await createConversationGraph(t, owner);
	const planId = await createPlan(t, { conversationId, projectId });

	await t.run(async (ctx) => {
		await ctx.db.insert("organizationMembers", {
			joinedAt: Date.now(),
			organizationId,
			profile: {
				assignmentEnabled: true,
				availabilityStatus: "available",
				avoids: [],
				ownedDomains: ["Planning"],
				preferredTaskTypes: ["Delivery"],
				strengths: ["Coordination"],
			},
			role: "member",
			userId: assignee.appUser._id,
		});
		await ctx.db.insert("projectMembers", {
			assignment: {
				eligibleForAssignment: true,
				ownedAreas: ["Planning"],
				ownedSystems: ["delivery"],
				projectRoleLabel: "Delivery owner",
			},
			createdAt: Date.now(),
			projectId,
			updatedAt: Date.now(),
			userId: assignee.appUser._id,
		});
	});

	await owner.as.mutation(api.plans.updateTaskAssignee, {
		assigneeId: assignee.appUser._id,
		planId,
		taskIndex: 0,
	});
	await owner.as.mutation(api.plans.approve, { planId });

	const [plan, tasks] = await Promise.all([
		t.run((ctx) => ctx.db.get(planId)),
		t.run((ctx) =>
			ctx.db
				.query("tasks")
				.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
				.collect()
		),
	]);

	expect(plan?.tasks[0]).toMatchObject({ assigneeId: assignee.appUser._id });
	expect(
		tasks.find((task) => task.title === "Build test harness")
	).toMatchObject({
		assigneeId: assignee.appUser._id,
	});

	vi.useRealTimers();
});

test("plans draft edits update urgency and blockers before approval", async () => {
	vi.useFakeTimers();
	const t = initConvexTest();
	const owner = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const { conversationId, projectId } = await createConversationGraph(t, owner);
	const planId = await createPlan(t, { conversationId, projectId });
	const existingTaskId = await createTask(t, owner, {
		conversationId,
		projectId,
		title: "Existing blocker",
	});

	await t.run(async (ctx) => {
		const plan = await ctx.db.get(planId);
		if (!plan) {
			throw new Error("Plan not found");
		}

		await ctx.db.patch(planId, {
			tasks: plan.tasks.map((task, index) =>
				index === 0
					? {
							...task,
							blockedBy: [
								{
									kind: "existing_task" as const,
									taskId: existingTaskId,
								},
							],
						}
					: task
			),
		});
	});

	await owner.as.mutation(api.plans.updateTaskUrgency, {
		planId,
		taskIndex: 0,
		urgency: "high",
	});
	await owner.as.mutation(api.plans.removeTaskBlocker, {
		blockerRef: {
			clientId: "task-1",
			kind: "plan_task",
		},
		planId,
		taskIndex: 1,
	});
	await owner.as.mutation(api.plans.approve, { planId });

	const state = await t.run(async (ctx) => {
		const [dependencies, plan, tasks] = await Promise.all([
			ctx.db
				.query("taskDependencies")
				.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
				.collect(),
			ctx.db.get(planId),
			ctx.db
				.query("tasks")
				.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
				.collect(),
		]);

		return { dependencies, plan, tasks };
	});

	expect(state.plan?.tasks[0]).toMatchObject({ urgency: "high" });
	expect(
		state.tasks.find((task) => task.title === "Build test harness")
	).toMatchObject({
		urgency: "high",
	});
	expect(state.dependencies).toHaveLength(1);
	expect(state.dependencies[0]).toMatchObject({
		blockerTaskId: existingTaskId,
		state: "active",
	});

	vi.useRealTimers();
});
