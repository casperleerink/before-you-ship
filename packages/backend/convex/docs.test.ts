import { describe, expect, test } from "vitest";
import {
	createActor,
	createProjectGraph,
	scheduledJobNames,
} from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("docs.update", () => {
	test("updates updatedAt without scheduling follow-up work when content is unchanged", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const { projectId } = await createProjectGraph(t, actor);
		const before = Date.now() - 5000;

		const docId = await t.run(async (ctx) => {
			return await ctx.db.insert("docs", {
				content: "Original body",
				createdAt: before,
				createdBy: actor.appUser._id,
				projectId,
				title: "Design",
				updatedAt: before,
			});
		});

		await actor.as.mutation(api.docs.update, {
			content: "Original body",
			docId,
			title: "Design",
		});

		const [doc, jobs] = await Promise.all([
			t.run((ctx) => ctx.db.get(docId)),
			scheduledJobNames(t),
		]);

		expect(doc?.updatedAt).toBeGreaterThan(before);
		expect(jobs).toEqual([]);
	});

	test("schedules embeddings and activity recording when content changes", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const { projectId } = await createProjectGraph(t, actor);

		const docId = await t.run(async (ctx) => {
			return await ctx.db.insert("docs", {
				content: "Original body",
				createdAt: Date.now(),
				createdBy: actor.appUser._id,
				projectId,
				title: "Design",
				updatedAt: Date.now(),
			});
		});

		await actor.as.mutation(api.docs.update, {
			content: "Updated body",
			docId,
		});

		expect(await scheduledJobNames(t)).toEqual([
			"activity:recordIfNoRecent",
			"embeddings:generateDocEmbedding",
		]);
	});
});
