import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";

export const REPO_ROOT = "/home/daytona/repo";

export const setSandboxId = internalMutation({
	args: {
		projectId: v.id("projects"),
		sandboxId: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.projectId, {
			sandboxId: args.sandboxId,
		});
	},
});

export const setProjectDescription = internalMutation({
	args: {
		projectId: v.id("projects"),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const project = await ctx.db.get(args.projectId);
		if (!project) {
			throw new Error(`Project ${args.projectId} not found`);
		}
		// Only set if no description exists (don't overwrite user edits)
		if (!project.description) {
			await ctx.db.patch(args.projectId, {
				description: args.description,
			});
		}
	},
});

// File tree cache

export const getFileTreeCache = internalQuery({
	args: {
		projectId: v.id("projects"),
		path: v.string(),
	},
	handler: (ctx, args) => {
		return ctx.db
			.query("fileTreeCache")
			.withIndex("by_projectId_path", (q) =>
				q.eq("projectId", args.projectId).eq("path", args.path)
			)
			.first();
	},
});

export const setFileTreeCache = internalMutation({
	args: {
		projectId: v.id("projects"),
		path: v.string(),
		entries: v.array(
			v.object({
				name: v.string(),
				isDir: v.boolean(),
				size: v.number(),
			})
		),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("fileTreeCache")
			.withIndex("by_projectId_path", (q) =>
				q.eq("projectId", args.projectId).eq("path", args.path)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				entries: args.entries,
				cachedAt: Date.now(),
			});
		} else {
			await ctx.db.insert("fileTreeCache", {
				projectId: args.projectId,
				path: args.path,
				entries: args.entries,
				cachedAt: Date.now(),
			});
		}
	},
});

export const clearFileTreeCache = internalMutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const entries = await ctx.db
			.query("fileTreeCache")
			.withIndex("by_projectId_path", (q) => q.eq("projectId", args.projectId))
			.collect();
		await Promise.all(entries.map((entry) => ctx.db.delete(entry._id)));
	},
});
