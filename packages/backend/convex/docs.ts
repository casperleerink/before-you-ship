import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";

export const list = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!(appUser && project)) {
			return [];
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return [];
		}

		return ctx.db
			.query("docs")
			.withIndex("by_projectId_updatedAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.collect();
	},
});

export const getById = query({
	args: {
		docId: v.id("docs"),
	},
	handler: async (ctx, args) => {
		const [appUser, doc] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.docId),
		]);
		if (!(appUser && doc)) {
			return null;
		}

		const project = await ctx.db.get(doc.projectId);
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

		return doc;
	},
});

export const create = mutation({
	args: {
		projectId: v.id("projects"),
		title: v.string(),
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

		const now = Date.now();
		const docId = await ctx.db.insert("docs", {
			projectId: args.projectId,
			title: args.title,
			content: "",
			createdBy: appUser._id,
			createdAt: now,
			updatedAt: now,
		});

		return docId;
	},
});

export const update = mutation({
	args: {
		docId: v.id("docs"),
		title: v.optional(v.string()),
		content: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const [appUser, doc] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.docId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!doc) {
			throw new Error("Doc not found");
		}

		const project = await ctx.db.get(doc.projectId);
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

		const updates: { updatedAt: number; title?: string; content?: string } = {
			updatedAt: Date.now(),
		};
		if (args.title !== undefined) {
			updates.title = args.title;
		}
		if (args.content !== undefined) {
			updates.content = args.content;
		}

		await ctx.db.patch(args.docId, updates);

		const contentChanged =
			(args.title !== undefined && args.title !== doc.title) ||
			(args.content !== undefined && args.content !== doc.content);
		if (contentChanged) {
			await ctx.scheduler.runAfter(
				0,
				internal.embeddings.generateDocEmbedding,
				{ docId: args.docId }
			);
		}
	},
});

export const remove = mutation({
	args: {
		docId: v.id("docs"),
	},
	handler: async (ctx, args) => {
		const [appUser, doc] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.docId),
		]);
		if (!appUser) {
			throw new Error("Not authenticated");
		}
		if (!doc) {
			throw new Error("Doc not found");
		}

		const project = await ctx.db.get(doc.projectId);
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

		await ctx.db.delete(args.docId);
	},
});
