import { describe, expect, test } from "vitest";

import {
	detectRepoProviderFromUrl,
	normalizeAzureDevOpsInstanceUrl,
	parseAzureDevOpsRepoUrl,
	parseGitHubRepoUrl,
} from "./gitUtils";

describe("gitUtils", () => {
	test("detectRepoProviderFromUrl identifies GitHub URLs", () => {
		expect(detectRepoProviderFromUrl("https://github.com/acme/project")).toBe(
			"github"
		);
		expect(
			detectRepoProviderFromUrl(
				"https://dev.azure.com/acme/platform/_git/project"
			)
		).toBe("azure_devops");
		expect(detectRepoProviderFromUrl("not-a-url")).toBeUndefined();
	});

	test("parseGitHubRepoUrl extracts owner and repo names", () => {
		expect(parseGitHubRepoUrl("https://github.com/acme/project.git")).toEqual({
			owner: "acme",
			repo: "project",
		});
		expect(parseGitHubRepoUrl("https://gitlab.com/acme/project")).toBeNull();
	});

	test("normalizeAzureDevOpsInstanceUrl canonicalizes cloud URLs", () => {
		expect(normalizeAzureDevOpsInstanceUrl("https://dev.azure.com/acme")).toBe(
			"https://dev.azure.com/acme"
		);
		expect(
			normalizeAzureDevOpsInstanceUrl("https://acme.visualstudio.com")
		).toBe("https://dev.azure.com/acme");
		expect(
			normalizeAzureDevOpsInstanceUrl(
				"https://dev.azure.com/acme/platform/_git/project"
			)
		).toBe("https://dev.azure.com/acme");
		expect(
			normalizeAzureDevOpsInstanceUrl("https://example.com/acme")
		).toBeNull();
	});

	test("parseAzureDevOpsRepoUrl extracts organization, project, and repo", () => {
		expect(
			parseAzureDevOpsRepoUrl(
				"https://dev.azure.com/acme/platform/_git/project.git"
			)
		).toEqual({
			instanceUrl: "https://dev.azure.com/acme",
			organization: "acme",
			project: "platform",
			repo: "project",
		});
		expect(
			parseAzureDevOpsRepoUrl(
				"https://acme.visualstudio.com/platform/_git/project"
			)
		).toEqual({
			instanceUrl: "https://dev.azure.com/acme",
			organization: "acme",
			project: "platform",
			repo: "project",
		});
		expect(
			parseAzureDevOpsRepoUrl("https://github.com/acme/project")
		).toBeNull();
	});
});
