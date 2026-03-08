import { afterEach, describe, expect, test, vi } from "vitest";

import { createActor } from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("azureDevops.listRepos", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("maps Azure DevOps repositories for the settings UI", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});

		const connectionId = await t.run(async (ctx) => {
			return await ctx.db.insert("gitConnections", {
				accessToken: "pat-token",
				createdAt: Date.now(),
				displayName: "acme",
				gitUsername: "azure-devops",
				instanceUrl: "https://dev.azure.com/acme",
				provider: "azure_devops",
				providerAccountId: "https://dev.azure.com/acme",
				updatedAt: Date.now(),
				userId: actor.appUser._id,
			});
		});

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						value: [
							{
								id: "repo-1",
								name: "platform",
								project: {
									id: "project-1",
									name: "Core",
								},
								remoteUrl: "https://dev.azure.com/acme/Core/_git/platform",
								webUrl: "https://dev.azure.com/acme/Core/_git/platform",
							},
						],
					}),
					{
						headers: { "Content-Type": "application/json" },
						status: 200,
					}
				)
			)
		);

		await expect(
			actor.as.action(api.azureDevops.listRepos, {
				connectionId,
				top: 100,
			})
		).resolves.toEqual([
			{
				id: "repo-1",
				name: "platform",
				projectName: "Core",
				remoteUrl: "https://dev.azure.com/acme/Core/_git/platform",
				webUrl: "https://dev.azure.com/acme/Core/_git/platform",
			},
		]);
	});
});
