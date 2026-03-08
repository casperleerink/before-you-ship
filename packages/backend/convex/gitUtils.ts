const GIT_SUFFIX_RE = /\.git$/;

export function detectRepoProviderFromUrl(
	repoUrl?: string
): "github" | undefined {
	if (!repoUrl) {
		return undefined;
	}

	try {
		const { hostname } = new URL(repoUrl);
		if (hostname.includes("github.com")) {
			return "github";
		}
	} catch {
		return undefined;
	}

	return undefined;
}

export function parseGitHubRepoUrl(
	repoUrl: string
): { owner: string; repo: string } | null {
	try {
		const url = new URL(repoUrl);
		if (!url.hostname.includes("github.com")) {
			return null;
		}

		const parts = url.pathname.split("/").filter(Boolean);
		if (parts.length < 2) {
			return null;
		}

		return {
			owner: parts[0],
			repo: parts[1].replace(GIT_SUFFIX_RE, ""),
		};
	} catch {
		return null;
	}
}

export function stripGitSuffix(repoUrl: string): string {
	return repoUrl.replace(GIT_SUFFIX_RE, "");
}
