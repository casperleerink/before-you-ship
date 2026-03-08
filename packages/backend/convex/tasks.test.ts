import { expect, test } from "vitest";
import {
	createActor,
	createConversationGraph,
	createTask,
	scheduledJobNames,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

test("tasks.update patches requested fields and supports clearing assignee", async () => {
	const t = initConvexTest();
	const actor = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const assignee = await createActor(t, {
		email: "assignee@example.com",
		name: "Assignee",
	});
	const { conversationId, projectId } = await createConversationGraph(t, actor);
	const taskId = await createTask(t, actor, { conversationId, projectId });

	await t.run(async (ctx) => {
		await ctx.db.patch(taskId, { assigneeId: assignee.appUser._id });
	});

	await actor.as.mutation(api.tasks.update, {
		assigneeId: null,
		status: "done",
		taskId,
	});

	const [task, jobs] = await Promise.all([
		t.run((ctx) => ctx.db.get(taskId)),
		scheduledJobNames(t),
	]);

	expect(task).toMatchObject({ status: "done" });
	expect(task).not.toHaveProperty("assigneeId");
	expect(jobs).toEqual(["activity:record"]);
});
