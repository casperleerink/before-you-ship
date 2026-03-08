const GIT_SUFFIX_RE = /\.git$/;
const VISUAL_STUDIO_HOST_SUFFIX_RE = /\.visualstudio\.com$/u;

export function detectRepoProviderFromUrl(
	repoUrl?: string
): "github" | "azure_devops" | undefined {
	if (!repoUrl) {
		return undefined;
	}

	try {
		const { hostname } = new URL(repoUrl);
		if (hostname.includes("github.com")) {
			return "github";
		}
		if (
			hostname === "dev.azure.com" ||
			hostname.endsWith(".visualstudio.com")
		) {
			return "azure_devops";
		}
	} catch {
		return undefined;
	}

	return undefined;
}

export function normalizeAzureDevOpsInstanceUrl(
	instanceUrl: string
): string | null {
	try {
		const url = new URL(instanceUrl);
		const hostname = url.hostname.toLowerCase();
		if (url.protocol !== "https:") {
			return null;
		}

		if (hostname === "dev.azure.com") {
			const [organization] = url.pathname.split("/").filter(Boolean);
			if (!organization) {
				return null;
			}
			return `https://dev.azure.com/${organization}`;
		}

		if (hostname.endsWith(".visualstudio.com")) {
			const organization = hostname.replace(VISUAL_STUDIO_HOST_SUFFIX_RE, "");
			if (!organization) {
				return null;
			}
			return `https://dev.azure.com/${organization}`;
		}
	} catch {
		return null;
	}

	return null;
}

export function getAzureDevOpsOrganizationSlug(
	instanceUrl: string
): string | null {
	const normalized = normalizeAzureDevOpsInstanceUrl(instanceUrl);
	if (!normalized) {
		return null;
	}

	return new URL(normalized).pathname.split("/").filter(Boolean)[0] ?? null;
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

export function parseAzureDevOpsRepoUrl(repoUrl: string): {
	instanceUrl: string;
	organization: string;
	project: string;
	repo: string;
} | null {
	try {
		const url = new URL(repoUrl);
		const hostname = url.hostname.toLowerCase();
		if (
			hostname !== "dev.azure.com" &&
			!hostname.endsWith(".visualstudio.com")
		) {
			return null;
		}

		const parts = url.pathname.split("/").filter(Boolean);
		if (hostname === "dev.azure.com") {
			if (parts.length < 4 || parts[2] !== "_git") {
				return null;
			}

			const organization = parts[0];
			const project = parts[1];
			const repo = parts[3];
			const instanceUrl = normalizeAzureDevOpsInstanceUrl(
				`https://dev.azure.com/${organization}`
			);

			if (!(organization && project && repo && instanceUrl)) {
				return null;
			}

			return {
				instanceUrl,
				organization,
				project,
				repo: repo.replace(GIT_SUFFIX_RE, ""),
			};
		}

		if (parts.length < 3 || parts[1] !== "_git") {
			return null;
		}

		const organization = hostname.replace(VISUAL_STUDIO_HOST_SUFFIX_RE, "");
		const project = parts[0];
		const repo = parts[2];
		const instanceUrl = normalizeAzureDevOpsInstanceUrl(url.toString());
		if (!(organization && project && repo && instanceUrl)) {
			return null;
		}

		return {
			instanceUrl,
			organization,
			project,
			repo: repo.replace(GIT_SUFFIX_RE, ""),
		};
	} catch {
		return null;
	}
}

export function stripGitSuffix(repoUrl: string): string {
	return repoUrl.replace(GIT_SUFFIX_RE, "");
}
