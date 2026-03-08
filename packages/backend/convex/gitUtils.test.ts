import { describe, expect, test } from "vitest";

import { detectRepoProviderFromUrl, parseGitHubRepoUrl } from "./gitUtils";

describe("gitUtils", () => {
	test("detectRepoProviderFromUrl identifies GitHub URLs", () => {
		expect(detectRepoProviderFromUrl("https://github.com/acme/project")).toBe(
			"github"
		);
		expect(detectRepoProviderFromUrl("not-a-url")).toBeUndefined();
	});

	test("parseGitHubRepoUrl extracts owner and repo names", () => {
		expect(parseGitHubRepoUrl("https://github.com/acme/project.git")).toEqual({
			owner: "acme",
			repo: "project",
		});
		expect(parseGitHubRepoUrl("https://gitlab.com/acme/project")).toBeNull();
	});
});
