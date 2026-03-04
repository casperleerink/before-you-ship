import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const GITHUB_API_URL = "https://api.github.com";

export const listRepos = action({
	args: {
		connectionId: v.id("gitConnections"),
		page: v.optional(v.number()),
		perPage: v.optional(v.number()),
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

		if (!connection) {
			throw new Error("No GitHub connection found");
		}

		const page = args.page ?? 1;
		const perPage = args.perPage ?? 30;

		const response = await fetch(
			`${GITHUB_API_URL}/user/repos?sort=updated&direction=desc&page=${page}&per_page=${perPage}&type=all`,
			{
				headers: {
					Authorization: `Bearer ${connection.accessToken}`,
					Accept: "application/vnd.github+json",
				},
			}
		);

		if (!response.ok) {
			throw new Error(`GitHub API error: ${response.statusText}`);
		}

		const repos: Array<{
			id: number;
			full_name: string;
			description: string | null;
			html_url: string;
			private: boolean;
		}> = await response.json();

		return repos.map((repo) => ({
			id: repo.id,
			fullName: repo.full_name,
			description: repo.description,
			htmlUrl: repo.html_url,
			isPrivate: repo.private,
		}));
	},
});
