import { expect, test } from "vitest";

import { filterRepositories, getGitHubConnectionToast } from "./repo-selection";

const repos = [
	{
		description: "Main frontend app",
		fullName: "acme/web",
		htmlUrl: "https://github.com/acme/web",
		id: 1,
		isPrivate: false,
	},
	{
		description: "Background jobs",
		fullName: "acme/worker",
		htmlUrl: "https://github.com/acme/worker",
		id: 2,
		isPrivate: true,
	},
] as const;

test("filters repositories case-insensitively", () => {
	expect(filterRepositories([...repos], "")).toEqual(repos);
	expect(filterRepositories([...repos], "WORK")).toEqual([repos[1]]);
});

test("maps GitHub callback states to toast payloads", () => {
	expect(getGitHubConnectionToast({ github: "connected" })).toEqual({
		message: "GitHub account connected",
		type: "success",
	});
	expect(getGitHubConnectionToast({ error: "invalid_state" })).toEqual({
		message: "Connection failed — please try again",
		type: "error",
	});
	expect(getGitHubConnectionToast({ error: "unexpected" })).toEqual({
		message: "Connection error",
		type: "error",
	});
	expect(getGitHubConnectionToast({})).toBeNull();
});
