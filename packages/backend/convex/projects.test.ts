import { describe, expect, test } from "vitest";
import {
	createActor,
	createProjectGraph,
	scheduledJobNames,
} from "../test/fixtures";
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

	test("connectRepo schedules Azure sandbox creation and webhook registration", async () => {
		const t = initConvexTest();
		const owner = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const { projectId } = await createProjectGraph(t, owner);

		await t.run(async (ctx) => {
			await ctx.db.insert("gitConnections", {
				accessToken: "pat-token",
				createdAt: Date.now(),
				displayName: "acme",
				gitUsername: "azure-devops",
				instanceUrl: "https://dev.azure.com/acme",
				provider: "azure_devops",
				providerAccountId: "https://dev.azure.com/acme",
				updatedAt: Date.now(),
				userId: owner.appUser._id,
			});
		});

		await owner.as.mutation(api.projects.connectRepo, {
			projectId,
			repoProvider: "azure_devops",
			repoUrl: "https://dev.azure.com/acme/platform/_git/project",
		});

		const jobs = await scheduledJobNames(t);
		expect(jobs).toContain("daytonaActions:createSandbox");
		expect(jobs).toContain("webhooks:registerAzureDevOps");
	});

	test("disconnectRepo clears Azure repo state and removes local webhook when no connection exists", async () => {
		const t = initConvexTest();
		const owner = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const { projectId } = await createProjectGraph(t, owner, {
			repoProvider: "azure_devops",
			repoUrl: "https://dev.azure.com/acme/platform/_git/project",
		});

		await t.run(async (ctx) => {
			await ctx.db.patch(projectId, {
				sandboxId: "sandbox-123",
			});
			await ctx.db.insert("webhooks", {
				createdAt: Date.now(),
				projectId,
				provider: "azure_devops",
				providerWebhookId: "subscription-1",
				secret: "secret",
			});
		});

		await owner.as.mutation(api.projects.disconnectRepo, { projectId });

		const [jobs, project, webhook] = await Promise.all([
			scheduledJobNames(t),
			t.run((ctx) => ctx.db.get(projectId)),
			t.run((ctx) =>
				ctx.db
					.query("webhooks")
					.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
					.first()
			),
		]);

		expect(jobs).toContain("daytonaActions:deleteSandbox");
		expect(project).not.toHaveProperty("repoProvider");
		expect(project).not.toHaveProperty("repoUrl");
		expect(project).not.toHaveProperty("sandboxId");
		expect(webhook).toBeNull();
	});
});
