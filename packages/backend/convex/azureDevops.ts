import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import {
	getAzureDevOpsOrganizationSlug,
	normalizeAzureDevOpsInstanceUrl,
	parseAzureDevOpsRepoUrl,
	stripGitSuffix,
} from "./gitUtils";

const AZURE_DEVOPS_API_VERSION = "7.1";

function getAzureDevOpsAuthorizationHeader(
	personalAccessToken: string
): string {
	return `Basic ${btoa(`:${personalAccessToken}`)}`;
}

export function buildAzureDevOpsHeaders(
	personalAccessToken: string,
	headers?: HeadersInit
): HeadersInit {
	return {
		...headers,
		Authorization: getAzureDevOpsAuthorizationHeader(personalAccessToken),
	};
}

function getAzureDevOpsDisplayName(instanceUrl: string): string {
	return getAzureDevOpsOrganizationSlug(instanceUrl) ?? "Azure DevOps";
}

function getAzureDevOpsProjectsUrl(instanceUrl: string): string {
	return `${instanceUrl}/_apis/projects?$top=1&api-version=${AZURE_DEVOPS_API_VERSION}`;
}

interface AzureDevOpsConnectionValidation {
	displayName: string;
	instanceUrl: string;
}

export async function validateAzureDevOpsPat(
	organizationUrl: string,
	personalAccessToken: string
): Promise<AzureDevOpsConnectionValidation> {
	const instanceUrl = normalizeAzureDevOpsInstanceUrl(organizationUrl);
	if (!instanceUrl) {
		throw new Error(
			"Organization URL must be a valid Azure DevOps Services URL"
		);
	}

	const response = await fetch(getAzureDevOpsProjectsUrl(instanceUrl), {
		headers: buildAzureDevOpsHeaders(personalAccessToken),
	});

	if (!response.ok) {
		throw new Error(
			"Invalid Azure DevOps organization URL or personal access token"
		);
	}

	return {
		displayName: getAzureDevOpsDisplayName(instanceUrl),
		instanceUrl,
	};
}

export const connectAzureDevOpsPat: ReturnType<typeof action> = action({
	args: {
		organizationUrl: v.string(),
		personalAccessToken: v.string(),
	},
	handler: async (ctx, args): Promise<Id<"gitConnections">> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const appUser: Doc<"users"> | null = await ctx.runQuery(
			internal.helpers.getUserByBetterAuthId,
			{
				betterAuthId: identity.subject,
			}
		);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const connection = await validateAzureDevOpsPat(
			args.organizationUrl,
			args.personalAccessToken
		);

		return ctx.runMutation(internal.gitConnections.upsertConnection, {
			userId: appUser._id,
			provider: "azure_devops",
			providerAccountId: connection.instanceUrl,
			accessToken: args.personalAccessToken,
			instanceUrl: connection.instanceUrl,
			gitUsername: "azure-devops",
			displayName: connection.displayName,
			avatarUrl: undefined,
		});
	},
});

interface AzureDevOpsRepositoryResponse {
	id: string;
	name: string;
	project?: {
		id: string;
		name: string;
	};
	remoteUrl: string;
	webUrl: string;
}

function getRepositoriesUrl(instanceUrl: string, top: number): string {
	return `${instanceUrl}/_apis/git/repositories?$top=${top}&api-version=${AZURE_DEVOPS_API_VERSION}`;
}

async function fetchAzureDevOpsRepositories(
	connection: Pick<Doc<"gitConnections">, "accessToken" | "instanceUrl">
): Promise<AzureDevOpsRepositoryResponse[]> {
	if (!connection.instanceUrl) {
		throw new Error("Azure DevOps connection is missing an organization URL");
	}

	const response = await fetch(
		getRepositoriesUrl(connection.instanceUrl, 100),
		{
			headers: buildAzureDevOpsHeaders(connection.accessToken),
		}
	);

	if (!response.ok) {
		throw new Error(`Azure DevOps API error: ${response.statusText}`);
	}

	const data = (await response.json()) as
		| AzureDevOpsRepositoryResponse[]
		| { value?: AzureDevOpsRepositoryResponse[] };
	return Array.isArray(data) ? data : (data.value ?? []);
}

export async function findAzureDevOpsRepositoryByUrl(
	connection: Pick<Doc<"gitConnections">, "accessToken" | "instanceUrl">,
	repoUrl: string
): Promise<AzureDevOpsRepositoryResponse | null> {
	const parsedRepo = parseAzureDevOpsRepoUrl(repoUrl);
	if (!parsedRepo) {
		return null;
	}

	const repositories = await fetchAzureDevOpsRepositories(connection);
	const normalizedRemoteUrl = stripGitSuffix(repoUrl);

	return (
		repositories.find(
			(repository) =>
				stripGitSuffix(repository.remoteUrl) === normalizedRemoteUrl
		) ?? null
	);
}

export const listRepos = action({
	args: {
		connectionId: v.id("gitConnections"),
		top: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const connection = await ctx.runQuery(
			internal.gitConnections.getConnectionById,
			{ connectionId: args.connectionId }
		);

		if (!connection || connection.provider !== "azure_devops") {
			throw new Error("No Azure DevOps connection found");
		}

		const repositories = await fetchAzureDevOpsRepositories(connection);
		const top = Math.max(1, Math.min(args.top ?? 100, 100));

		return repositories.slice(0, top).map((repository) => ({
			id: repository.id,
			name: repository.name,
			projectName: repository.project?.name ?? "Unknown project",
			remoteUrl: repository.remoteUrl,
			webUrl: repository.webUrl,
		}));
	},
});

export async function deleteAzureDevOpsSubscription(
	connection: Pick<Doc<"gitConnections">, "accessToken" | "instanceUrl">,
	subscriptionId: string
): Promise<void> {
	if (!connection.instanceUrl) {
		return;
	}

	const response = await fetch(
		`${connection.instanceUrl}/_apis/hooks/subscriptions/${subscriptionId}?api-version=${AZURE_DEVOPS_API_VERSION}`,
		{
			method: "DELETE",
			headers: buildAzureDevOpsHeaders(connection.accessToken),
		}
	);

	if (!response.ok && response.status !== 404) {
		const text = await response.text();
		throw new Error(
			`Azure DevOps subscription deletion failed (${response.status}): ${text}`
		);
	}
}

interface AzureDevOpsSubscriptionArgs {
	connection: Pick<Doc<"gitConnections">, "accessToken" | "instanceUrl">;
	projectId: Id<"projects">;
	repoUrl: string;
	secret: string;
	webhookBaseUrl: string;
}

export async function createAzureDevOpsPushSubscription({
	connection,
	projectId,
	repoUrl,
	secret,
	webhookBaseUrl,
}: AzureDevOpsSubscriptionArgs): Promise<string> {
	const repository = await findAzureDevOpsRepositoryByUrl(connection, repoUrl);
	if (!(repository?.project?.id && connection.instanceUrl)) {
		throw new Error(
			"Azure DevOps repository not found for webhook registration"
		);
	}

	const callbackUrl = new URL(webhookBaseUrl);
	callbackUrl.searchParams.set("projectId", projectId);
	callbackUrl.searchParams.set("secret", secret);

	const response = await fetch(
		`${connection.instanceUrl}/_apis/hooks/subscriptions?api-version=${AZURE_DEVOPS_API_VERSION}`,
		{
			method: "POST",
			headers: buildAzureDevOpsHeaders(connection.accessToken, {
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				consumerActionId: "httpRequest",
				consumerId: "webHooks",
				consumerInputs: {
					url: callbackUrl.toString(),
				},
				eventType: "git.push",
				publisherId: "tfs",
				publisherInputs: {
					projectId: repository.project.id,
					repository: repository.id,
				},
				resourceVersion: "1.0",
			}),
		}
	);

	if (!response.ok) {
		const text = await response.text();
		throw new Error(
			`Azure DevOps webhook registration failed (${response.status}): ${text}`
		);
	}

	const subscription = (await response.json()) as { id?: string };
	if (!subscription.id) {
		throw new Error(
			"Azure DevOps webhook registration returned no subscription id"
		);
	}

	return subscription.id;
}
