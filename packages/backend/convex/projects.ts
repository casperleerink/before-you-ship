import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";

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

export const create = mutation({
	args: {
		name: v.string(),
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
			organizationId: args.orgId,
			createdBy: appUser._id,
			createdAt: Date.now(),
		});
	},
});
