import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership, requireProjectMember } from "./helpers";

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
		const { appUser } = await requireProjectMember(ctx, args.projectId);

		const now = Date.now();
		const docId = await ctx.db.insert("docs", {
			projectId: args.projectId,
			title: args.title,
			content: "",
			createdBy: appUser._id,
			createdAt: now,
			updatedAt: now,
		});

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: args.projectId,
			userId: appUser._id,
			action: "created",
			entityType: "doc",
			entityId: docId,
			description: args.title,
		});

		return docId;
	},
});

export const createFromAgent = internalMutation({
	args: {
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
		createdBy: v.id("users"),
		title: v.string(),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const docId = await ctx.db.insert("docs", {
			projectId: args.projectId,
			conversationId: args.conversationId,
			title: args.title,
			content: args.content,
			createdBy: args.createdBy,
			createdAt: now,
			updatedAt: now,
		});

		await ctx.scheduler.runAfter(0, internal.embeddings.generateDocEmbedding, {
			docId,
		});

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: args.projectId,
			userId: args.createdBy,
			action: "created",
			entityType: "doc",
			entityId: docId,
			description: args.title,
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
		const doc = await ctx.db.get(args.docId);
		if (!doc) {
			throw new Error("Doc not found");
		}
		const { appUser } = await requireProjectMember(ctx, doc.projectId);

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

			await ctx.scheduler.runAfter(0, internal.activity.recordIfNoRecent, {
				entry: {
					projectId: doc.projectId,
					userId: appUser._id,
					action: "updated",
					entityType: "doc",
					entityId: args.docId,
					description:
						args.title !== undefined && args.title !== doc.title
							? `renamed to "${args.title}"`
							: `updated "${doc.title}"`,
				},
			});
		}
	},
});

export const remove = mutation({
	args: {
		docId: v.id("docs"),
	},
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.docId);
		if (!doc) {
			throw new Error("Doc not found");
		}
		const { appUser } = await requireProjectMember(ctx, doc.projectId);

		await ctx.db.delete(args.docId);

		await ctx.scheduler.runAfter(0, internal.activity.record, {
			projectId: doc.projectId,
			userId: appUser._id,
			action: "deleted",
			entityType: "doc",
			entityId: args.docId,
			description: doc.title,
		});
	},
});
