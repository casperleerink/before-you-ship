import { expect, test } from "vitest";
import {
	createActor,
	createConversationGraph,
	createPlan,
	createTriageItem,
	scheduledJobNames,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

test("plans.approve creates tasks, updates state, removes triage, and schedules follow-up work", async () => {
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
		const [plan, conversation, tasks, triageItems] = await Promise.all([
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

		return { conversation, plan, tasks, triageItems };
	});

	expect(state.plan).toMatchObject({
		createdTaskIds: expect.arrayContaining(state.tasks.map((task) => task._id)),
		status: "approved",
	});
	expect(state.conversation).toMatchObject({ status: "completed" });
	expect(state.tasks).toHaveLength(2);
	expect(state.triageItems).toEqual([]);
	expect(await scheduledJobNames(t)).toEqual([
		"activity:record",
		"activity:recordMany",
		"embeddings:generateTaskEmbedding",
		"embeddings:generateTaskEmbedding",
	]);
});
