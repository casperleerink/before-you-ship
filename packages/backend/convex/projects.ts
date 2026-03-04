import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";
import { projectRepoProviderValidator } from "./schema";

export const list = query({
	args: {
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership) {
			return [];
		}

		return ctx.db
			.query("projects")
			.withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
			.collect();
	},
});

export const getById = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return null;
		}

		const project = await ctx.db.get(args.projectId);
		if (!project) {
			return null;
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return null;
		}

		return project;
	},
});

export const update = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

		await ctx.db.patch(args.projectId, {
			name: args.name,
			description: args.description,
		});
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		repoUrl: v.optional(v.string()),
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

		return ctx.db.insert("projects", {
			name: args.name,
			description: args.description,
			repoUrl: args.repoUrl,
			organizationId: args.orgId,
			createdBy: appUser._id,
			createdAt: Date.now(),
		});
	},
});

export const connectRepo = mutation({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		repoProvider: projectRepoProviderValidator,
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

		await ctx.db.patch(args.projectId, {
			repoUrl: args.repoUrl,
			repoProvider: args.repoProvider,
		});

		// Look up user's git connection for this provider to pass OAuth token
		const gitConnection = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", appUser._id).eq("provider", args.repoProvider)
			)
			.first();

		await ctx.scheduler.runAfter(0, internal.daytona.createSandbox, {
			projectId: args.projectId,
			repoUrl: args.repoUrl,
			gitConnectionId: gitConnection?._id,
		});
	},
});

export const connectSelfHostedRepo = mutation({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		accessToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

		await ctx.db.patch(args.projectId, {
			repoUrl: args.repoUrl,
			repoProvider: "self_hosted" as const,
		});

		// Store credentials as a gitConnection if access token provided
		const existingConnection = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", appUser._id).eq("provider", "self_hosted")
			)
			.first();

		let gitConnectionId = existingConnection?._id;

		if (args.accessToken) {
			const now = Date.now();
			if (existingConnection) {
				await ctx.db.patch(existingConnection._id, {
					accessToken: args.accessToken,
					updatedAt: now,
				});
				gitConnectionId = existingConnection._id;
			} else {
				gitConnectionId = await ctx.db.insert("gitConnections", {
					userId: appUser._id,
					provider: "self_hosted",
					providerAccountId: "self_hosted",
					accessToken: args.accessToken,
					displayName: "Self-hosted Git",
					createdAt: now,
					updatedAt: now,
				});
			}
		}

		await ctx.scheduler.runAfter(0, internal.daytona.createSandbox, {
			projectId: args.projectId,
			repoUrl: args.repoUrl,
			gitConnectionId,
		});
	},
});

export const disconnectRepo = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!project) {
			throw new Error("Project not found");
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			throw new Error("Not a member of this organization");
		}

		if (project.sandboxId) {
			await ctx.scheduler.runAfter(0, internal.daytona.deleteSandbox, {
				sandboxId: project.sandboxId,
			});
		}

		// Clear cached file tree
		await ctx.runMutation(internal.daytona.clearFileTreeCache, {
			projectId: args.projectId,
		});

		await ctx.db.patch(args.projectId, {
			repoUrl: undefined,
			repoProvider: undefined,
			sandboxId: undefined,
		});
	},
});
