import { afterEach, describe, expect, test, vi } from "vitest";

import { createActor } from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("azureDevops.connectAzureDevOpsPat", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("stores a normalized Azure DevOps PAT connection", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});

		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ value: [] }), {
				headers: { "Content-Type": "application/json" },
				status: 200,
			})
		);
		vi.stubGlobal("fetch", fetchMock);

		const connectionId = await actor.as.action(
			api.azureDevops.connectAzureDevOpsPat,
			{
				organizationUrl: "https://acme.visualstudio.com",
				personalAccessToken: "pat-token",
			}
		);

		const connection = await t.run((ctx) => ctx.db.get(connectionId));

		expect(fetchMock).toHaveBeenCalledWith(
			"https://dev.azure.com/acme/_apis/projects?$top=1&api-version=7.1",
			expect.anything()
		);
		expect(connection).toMatchObject({
			displayName: "acme",
			gitUsername: "azure-devops",
			instanceUrl: "https://dev.azure.com/acme",
			provider: "azure_devops",
			providerAccountId: "https://dev.azure.com/acme",
		});
	});

	test("rejects invalid Azure DevOps credentials", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
		);

		await expect(
			actor.as.action(api.azureDevops.connectAzureDevOpsPat, {
				organizationUrl: "https://dev.azure.com/acme",
				personalAccessToken: "bad-token",
			})
		).rejects.toThrow(
			"Invalid Azure DevOps organization URL or personal access token"
		);
	});
});
