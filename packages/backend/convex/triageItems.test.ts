import { expect, test } from "vitest";
import {
	createActor,
	createProjectGraph,
	scheduledJobNames,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

test("triageItems.create inserts a pending item and schedules activity recording", async () => {
	const t = initConvexTest();
	const actor = await createActor(t, {
		email: "owner@example.com",
		name: "Owner",
	});
	const { projectId } = await createProjectGraph(t, actor);

	const triageItemId = await actor.as.mutation(api.triageItems.create, {
		content: "Intermittent deploy failures",
		projectId,
	});

	const [triageItem, jobs] = await Promise.all([
		t.run((ctx) => ctx.db.get(triageItemId)),
		scheduledJobNames(t),
	]);

	expect(triageItem).toMatchObject({
		content: "Intermittent deploy failures",
		createdBy: actor.appUser._id,
		projectId,
		status: "pending",
	});
	expect(jobs).toEqual(["activity:record"]);
});
