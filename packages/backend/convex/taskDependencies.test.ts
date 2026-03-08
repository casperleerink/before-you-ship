import { expect, test } from "vitest";

import {
	createActor,
	createConversationGraph,
	createTask,
	createTaskDependency,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

test("listMyRankedQueue prioritizes actionable blockers over blocked urgent work", async () => {
	const t = initConvexTest();
	const owner = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const { conversationId, organizationId, projectId } =
		await createConversationGraph(t, owner);

	const blockerTaskId = await createTask(t, owner, {
		assigneeId: owner.appUser._id,
		conversationId,
		projectId,
		title: "Unblock data model",
		urgency: "medium",
	});
	await createTask(t, owner, {
		assigneeId: owner.appUser._id,
		conversationId,
		projectId,
		title: "Critical customer fix",
		urgency: "high",
	});
	const blockedTaskId = await createTask(t, owner, {
		assigneeId: owner.appUser._id,
		conversationId,
		projectId,
		title: "Ship dashboard polish",
		urgency: "high",
	});

	await createTaskDependency(t, {
		blockedTaskId,
		blockerTaskId,
		projectId,
	});

	const queue = await owner.as.query(api.tasks.listMyRankedQueue, {
		orgId: organizationId,
	});

	expect(queue.map((task) => task.title)).toEqual([
		"Unblock data model",
		"Critical customer fix",
		"Ship dashboard polish",
	]);
	expect(queue[0]).toMatchObject({
		blocksMyTasksCount: 1,
		isBlocked: false,
	});
	expect(queue[2]).toMatchObject({
		isBlocked: true,
		rankReasons: expect.arrayContaining(["Blocked by Unblock data model"]),
	});
});

test("dismissing a dependency removes the blocked state from task detail and queue", async () => {
	const t = initConvexTest();
	const owner = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const { conversationId, organizationId, projectId } =
		await createConversationGraph(t, owner);

	const blockerTaskId = await createTask(t, owner, {
		assigneeId: owner.appUser._id,
		conversationId,
		projectId,
		title: "Set up API contract",
		urgency: "medium",
	});
	const blockedTaskId = await createTask(t, owner, {
		assigneeId: owner.appUser._id,
		conversationId,
		projectId,
		title: "Implement frontend form",
		urgency: "high",
	});
	const dependencyId = await createTaskDependency(t, {
		blockedTaskId,
		blockerTaskId,
		projectId,
	});

	const before = await owner.as.query(api.taskDependencies.listForTask, {
		taskId: blockedTaskId,
	});
	expect(before).toHaveLength(1);

	await owner.as.mutation(api.taskDependencies.dismiss, { dependencyId });

	const [after, queue] = await Promise.all([
		owner.as.query(api.taskDependencies.listForTask, {
			taskId: blockedTaskId,
		}),
		owner.as.query(api.tasks.listMyRankedQueue, {
			orgId: organizationId,
		}),
	]);

	expect(after).toEqual([]);
	expect(queue[0]).toMatchObject({
		isBlocked: false,
		title: "Implement frontend form",
	});
});
