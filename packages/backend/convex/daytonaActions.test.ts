import { describe, expect, test } from "vitest";

import { resolveGitCloneCredentials } from "./daytonaActions";

describe("resolveGitCloneCredentials", () => {
	test("uses provider-specific usernames", () => {
		expect(
			resolveGitCloneCredentials({
				accessToken: "github-token",
				gitUsername: "x-access-token",
				provider: "github",
			})
		).toEqual({
			password: "github-token",
			username: "x-access-token",
		});

		expect(
			resolveGitCloneCredentials({
				accessToken: "azure-token",
				gitUsername: "azure-devops",
				provider: "azure_devops",
			})
		).toEqual({
			password: "azure-token",
			username: "azure-devops",
		});

		expect(
			resolveGitCloneCredentials({
				accessToken: "self-hosted-token",
				gitUsername: undefined,
				provider: "self_hosted",
			})
		).toEqual({
			password: "self-hosted-token",
			username: "git",
		});
	});
});
