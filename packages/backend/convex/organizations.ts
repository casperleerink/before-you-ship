import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

async function getAppUser(ctx: QueryCtx) {
	const authUser = await authComponent.safeGetAuthUser(ctx);
	if (!authUser) {
		return null;
	}
	return ctx.db
		.query("users")
		.withIndex("by_betterAuthId", (q) => q.eq("betterAuthId", authUser._id))
		.first();
}

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

		const membership = await ctx.db
			.query("organizationMembers")
			.withIndex("by_org_and_user", (q) =>
				q.eq("organizationId", args.orgId).eq("userId", appUser._id)
			)
			.first();

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
