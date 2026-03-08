import { describe, expect, test } from "vitest";
import { createActor, createProjectGraph } from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("projects", () => {
	test("list and getById only return projects to organization members", async () => {
		const t = initConvexTest();
		const owner = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const stranger = await createActor(t, {
			email: "stranger@example.com",
			name: "Stranger",
		});
		const { organizationId, projectId } = await createProjectGraph(t, owner, {
			name: "Roadmap",
		});

		const [anonymousList, strangerList, memberList] = await Promise.all([
			t.query(api.projects.list, { orgId: organizationId }),
			stranger.as.query(api.projects.list, { orgId: organizationId }),
			owner.as.query(api.projects.list, { orgId: organizationId }),
		]);

		const [anonymousProject, strangerProject, memberProject] =
			await Promise.all([
				t.query(api.projects.getById, { projectId }),
				stranger.as.query(api.projects.getById, { projectId }),
				owner.as.query(api.projects.getById, { projectId }),
			]);

		expect(anonymousList).toEqual([]);
		expect(strangerList).toEqual([]);
		expect(memberList).toHaveLength(1);
		expect(memberList[0]).toMatchObject({ _id: projectId, name: "Roadmap" });

		expect(anonymousProject).toBeNull();
		expect(strangerProject).toBeNull();
		expect(memberProject).toMatchObject({ _id: projectId, name: "Roadmap" });
	});
});
