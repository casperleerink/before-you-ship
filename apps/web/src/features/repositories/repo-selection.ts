export interface RepoSearchResult {
	description: string | null;
	fullName: string;
	htmlUrl: string;
	id: number;
	isPrivate: boolean;
}

export interface GitHubCallbackSearchState {
	error?: string;
	github?: string;
}

export function filterRepositories(repos: RepoSearchResult[], search: string) {
	if (!search) {
		return repos;
	}

	const normalizedSearch = search.toLowerCase();
	return repos.filter((repo) =>
		repo.fullName.toLowerCase().includes(normalizedSearch)
	);
}

export function getGitHubConnectionToast(search: GitHubCallbackSearchState) {
	if (search.github === "connected") {
		return {
			message: "GitHub account connected",
			type: "success" as const,
		};
	}
	if (!search.error) {
		return null;
	}

	const messages: Record<string, string> = {
		expired: "Connection request expired — please try again",
		invalid_state: "Connection failed — please try again",
		oauth_failed: "GitHub authentication failed",
	};

	return {
		message: messages[search.error] ?? "Connection error",
		type: "error" as const,
	};
}
