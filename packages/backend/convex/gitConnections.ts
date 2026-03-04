import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	type ActionCtx,
	httpAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { getAppUser } from "./helpers";
import { projectRepoProviderValidator } from "./schema";
import { GITHUB_API_URL, generateRandomHex, getConvexSiteUrl } from "./shared";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_SCOPES = "repo read:user";
const REQUEST_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function getGitHubCredentials() {
	const clientId = process.env.GITHUB_CLIENT_ID;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET;
	if (!(clientId && clientSecret)) {
		throw new Error(
			"GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set as Convex environment variables"
		);
	}
	return { clientId, clientSecret };
}

function getSiteUrl() {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) {
		throw new Error("SITE_URL must be set");
	}
	return siteUrl;
}

// --- Mutations & Queries ---

export const createRequest = mutation({
	args: {
		provider: projectRepoProviderValidator,
		returnUrl: v.string(),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const state = generateRandomHex();
		const now = Date.now();

		await ctx.db.insert("gitConnectionRequests", {
			userId: appUser._id,
			provider: args.provider,
			state,
			returnUrl: args.returnUrl,
			createdAt: now,
			expiresAt: now + REQUEST_EXPIRY_MS,
		});

		return { state };
	},
});

export const getByProvider = query({
	args: {
		provider: projectRepoProviderValidator,
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return null;
		}

		return ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", appUser._id).eq("provider", args.provider)
			)
			.first();
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		return ctx.db
			.query("gitConnections")
			.withIndex("by_userId", (q) => q.eq("userId", appUser._id))
			.collect();
	},
});

export const disconnect = mutation({
	args: {
		connectionId: v.id("gitConnections"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const connection = await ctx.db.get(args.connectionId);
		if (!connection || connection.userId !== appUser._id) {
			throw new Error("Connection not found");
		}

		await ctx.db.delete(args.connectionId);
	},
});

// --- Internal functions ---

export const getConnectionById = internalQuery({
	args: { connectionId: v.id("gitConnections") },
	handler: (ctx, args) => {
		return ctx.db.get(args.connectionId);
	},
});

// --- Internal functions for OAuth callback ---

export const getRequestByState = internalQuery({
	args: { state: v.string() },
	handler: (ctx, args) => {
		return ctx.db
			.query("gitConnectionRequests")
			.withIndex("by_state", (q) => q.eq("state", args.state))
			.first();
	},
});

export const deleteRequest = internalMutation({
	args: { requestId: v.id("gitConnectionRequests") },
	handler: async (ctx, args) => {
		await ctx.db.delete(args.requestId);
	},
});

export const upsertConnection = internalMutation({
	args: {
		userId: v.id("users"),
		provider: projectRepoProviderValidator,
		providerAccountId: v.string(),
		accessToken: v.string(),
		displayName: v.string(),
		avatarUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", args.userId).eq("provider", args.provider)
			)
			.first();

		const now = Date.now();
		if (existing) {
			await ctx.db.patch(existing._id, {
				providerAccountId: args.providerAccountId,
				accessToken: args.accessToken,
				displayName: args.displayName,
				avatarUrl: args.avatarUrl,
				updatedAt: now,
			});
			return existing._id;
		}

		return ctx.db.insert("gitConnections", {
			userId: args.userId,
			provider: args.provider,
			providerAccountId: args.providerAccountId,
			accessToken: args.accessToken,
			displayName: args.displayName,
			avatarUrl: args.avatarUrl,
			createdAt: now,
			updatedAt: now,
		});
	},
});

// --- HTTP Actions for OAuth flow ---

async function exchangeGitHubCode(
	code: string,
	clientId: string,
	clientSecret: string
): Promise<{ access_token: string; token_type: string; scope: string }> {
	const response = await fetch(GITHUB_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			code,
		}),
	});

	if (!response.ok) {
		throw new Error(`GitHub token exchange failed: ${response.statusText}`);
	}

	const data = await response.json();
	if (data.error) {
		throw new Error(
			`GitHub OAuth error: ${data.error_description || data.error}`
		);
	}

	return data;
}

async function fetchGitHubUser(
	accessToken: string
): Promise<{ id: number; login: string; avatar_url: string }> {
	const response = await fetch(`${GITHUB_API_URL}/user`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/vnd.github+json",
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub user fetch failed: ${response.statusText}`);
	}

	return response.json();
}

// biome-ignore lint/suspicious/useAwait: httpAction requires async handler
export const githubInitiate = httpAction(async (_ctx, request) => {
	const { clientId } = getGitHubCredentials();
	const convexSiteUrl = getConvexSiteUrl();

	const url = new URL(request.url);
	const state = url.searchParams.get("state");

	if (!state) {
		return new Response("Missing state parameter", { status: 400 });
	}

	const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
	authorizeUrl.searchParams.set("client_id", clientId);
	authorizeUrl.searchParams.set(
		"redirect_uri",
		`${convexSiteUrl}/api/github/callback`
	);
	authorizeUrl.searchParams.set("scope", GITHUB_SCOPES);
	authorizeUrl.searchParams.set("state", state);

	return new Response(null, {
		status: 302,
		headers: { Location: authorizeUrl.toString() },
	});
});

export const githubCallback = httpAction(async (ctx: ActionCtx, request) => {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const siteUrl = getSiteUrl();

	if (!(code && state)) {
		return new Response("Missing code or state parameter", { status: 400 });
	}

	// Look up the pending request
	const connectionRequest = await ctx.runQuery(
		internal.gitConnections.getRequestByState,
		{ state }
	);

	if (!connectionRequest) {
		return new Response(null, {
			status: 302,
			headers: {
				Location: `${siteUrl}?error=invalid_state`,
			},
		});
	}

	// Check expiry
	if (Date.now() > connectionRequest.expiresAt) {
		await ctx.runMutation(internal.gitConnections.deleteRequest, {
			requestId: connectionRequest._id,
		});
		return new Response(null, {
			status: 302,
			headers: {
				Location: `${connectionRequest.returnUrl}?error=expired`,
			},
		});
	}

	try {
		const { clientId, clientSecret } = getGitHubCredentials();

		// Exchange code for access token
		const tokenData = await exchangeGitHubCode(code, clientId, clientSecret);

		// Fetch GitHub user info
		const githubUser = await fetchGitHubUser(tokenData.access_token);

		// Store the connection
		await ctx.runMutation(internal.gitConnections.upsertConnection, {
			userId: connectionRequest.userId,
			provider: "github",
			providerAccountId: String(githubUser.id),
			accessToken: tokenData.access_token,
			displayName: githubUser.login,
			avatarUrl: githubUser.avatar_url,
		});

		// Clean up the request
		await ctx.runMutation(internal.gitConnections.deleteRequest, {
			requestId: connectionRequest._id,
		});

		return new Response(null, {
			status: 302,
			headers: {
				Location: `${connectionRequest.returnUrl}?github=connected`,
			},
		});
	} catch {
		// Clean up the request
		await ctx.runMutation(internal.gitConnections.deleteRequest, {
			requestId: connectionRequest._id,
		});

		return new Response(null, {
			status: 302,
			headers: {
				Location: `${connectionRequest.returnUrl}?error=oauth_failed`,
			},
		});
	}
});
