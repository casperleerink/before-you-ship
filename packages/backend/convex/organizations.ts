import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";

export const list = query({
	args: {},
	handler: async (ctx) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const memberships = await ctx.db
			.query("organizationMembers")
			.withIndex("by_userId", (q) => q.eq("userId", appUser._id))
			.collect();

		const orgsWithNulls = await Promise.all(
			memberships.map(async (m) => {
				const org = await ctx.db.get(m.organizationId);
				return org ? { ...org, role: m.role } : null;
			})
		);

		return orgsWithNulls.filter((o): o is NonNullable<typeof o> => o !== null);
	},
});

export const getById = query({
	args: {
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return null;
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership) {
			return null;
		}

		const org = await ctx.db.get(args.orgId);
		if (!org) {
			return null;
		}

		return { ...org, role: membership.role };
	},
});

export const create = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const orgId = await ctx.db.insert("organizations", {
			name: args.name,
			createdBy: appUser._id,
			createdAt: Date.now(),
		});

		await ctx.db.insert("organizationMembers", {
			organizationId: orgId,
			userId: appUser._id,
			role: "owner",
			joinedAt: Date.now(),
		});

		return orgId;
	},
});
