import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";
import { orgRoleValidator } from "./schema";

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

export const getBySlug = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return null;
		}

		const org = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();
		if (!org) {
			return null;
		}

		const membership = await getOrgMembership(ctx, org._id, appUser._id);
		if (!membership) {
			return null;
		}

		return { ...org, role: membership.role };
	},
});

export const listMembers = query({
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

		const memberships = await ctx.db
			.query("organizationMembers")
			.withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
			.collect();

		const members = await Promise.all(
			memberships.map(async (m) => {
				const user = await ctx.db.get(m.userId);
				if (!user) {
					return null;
				}
				return {
					_id: user._id,
					name: user.name,
					email: user.email,
					avatarUrl: user.avatarUrl,
					role: m.role,
				};
			})
		);

		return members.filter((m): m is NonNullable<typeof m> => m !== null);
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

		const { generateUniqueSlug } = await import("./slugUtils");
		const slug = await generateUniqueSlug(ctx, args.name);

		const orgId = await ctx.db.insert("organizations", {
			name: args.name,
			slug,
			createdBy: appUser._id,
			createdAt: Date.now(),
		});

		await ctx.db.insert("organizationMembers", {
			organizationId: orgId,
			userId: appUser._id,
			role: "owner",
			joinedAt: Date.now(),
		});

		return { orgId, slug };
	},
});

export const listInvites = query({
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

		const invites = await ctx.db
			.query("organizationInvites")
			.withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
			.collect();

		const invitesWithInviter = await Promise.all(
			invites
				.filter((invite) => invite.status === "pending")
				.map(async (invite) => {
					const inviter = await ctx.db.get(invite.invitedBy);
					return {
						...invite,
						inviterName: inviter?.name ?? "Unknown",
					};
				})
		);

		return invitesWithInviter;
	},
});

export const listPendingInvitesForUser = query({
	args: {},
	handler: async (ctx) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const invites = await ctx.db
			.query("organizationInvites")
			.withIndex("by_email", (q) => q.eq("email", appUser.email))
			.collect();

		const pendingInvites = await Promise.all(
			invites
				.filter((invite) => invite.status === "pending")
				.map(async (invite) => {
					const [org, inviter] = await Promise.all([
						ctx.db.get(invite.organizationId),
						ctx.db.get(invite.invitedBy),
					]);
					return {
						...invite,
						orgName: org?.name ?? "Unknown",
						inviterName: inviter?.name ?? "Unknown",
					};
				})
		);

		return pendingInvites;
	},
});

export const inviteMember = mutation({
	args: {
		orgId: v.id("organizations"),
		email: v.string(),
		role: orgRoleValidator,
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership || membership.role === "member") {
			throw new Error("Only owners and admins can invite members");
		}

		// Check if user is already a member
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.first();

		if (existingUser) {
			const existingMembership = await getOrgMembership(
				ctx,
				args.orgId,
				existingUser._id
			);
			if (existingMembership) {
				throw new Error("User is already a member of this organization");
			}
		}

		// Check for existing pending invite
		const existingInvites = await ctx.db
			.query("organizationInvites")
			.withIndex("by_email", (q) => q.eq("email", args.email))
			.collect();

		const existingPendingInvite = existingInvites.find(
			(inv) => inv.organizationId === args.orgId && inv.status === "pending"
		);

		if (existingPendingInvite) {
			throw new Error("An invite is already pending for this email");
		}

		return ctx.db.insert("organizationInvites", {
			organizationId: args.orgId,
			email: args.email,
			role: args.role,
			status: "pending",
			invitedBy: appUser._id,
			createdAt: Date.now(),
		});
	},
});

export const acceptInvite = mutation({
	args: {
		inviteId: v.id("organizationInvites"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const invite = await ctx.db.get(args.inviteId);
		if (!invite || invite.status !== "pending") {
			throw new Error("Invite not found or already used");
		}

		if (invite.email !== appUser.email) {
			throw new Error("This invite is for a different email address");
		}

		// Check not already a member
		const existingMembership = await getOrgMembership(
			ctx,
			invite.organizationId,
			appUser._id
		);
		if (!existingMembership) {
			await ctx.db.insert("organizationMembers", {
				organizationId: invite.organizationId,
				userId: appUser._id,
				role: invite.role,
				joinedAt: Date.now(),
			});
		}

		await ctx.db.patch(args.inviteId, { status: "accepted" });

		const org = await ctx.db.get(invite.organizationId);
		return { organizationId: invite.organizationId, slug: org?.slug ?? "" };
	},
});

export const cancelInvite = mutation({
	args: {
		inviteId: v.id("organizationInvites"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const invite = await ctx.db.get(args.inviteId);
		if (!invite || invite.status !== "pending") {
			throw new Error("Invite not found or already used");
		}

		const membership = await getOrgMembership(
			ctx,
			invite.organizationId,
			appUser._id
		);
		if (!membership || membership.role === "member") {
			throw new Error("Only owners and admins can cancel invites");
		}

		await ctx.db.patch(args.inviteId, { status: "cancelled" });
	},
});

export const removeMember = mutation({
	args: {
		orgId: v.id("organizations"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const callerMembership = await getOrgMembership(
			ctx,
			args.orgId,
			appUser._id
		);
		if (!callerMembership || callerMembership.role === "member") {
			throw new Error("Only owners and admins can remove members");
		}

		const targetMembership = await getOrgMembership(
			ctx,
			args.orgId,
			args.userId
		);
		if (!targetMembership) {
			throw new Error("User is not a member of this organization");
		}

		if (targetMembership.role === "owner") {
			throw new Error("Cannot remove the owner");
		}

		if (
			callerMembership.role === "admin" &&
			targetMembership.role === "admin"
		) {
			throw new Error("Admins cannot remove other admins");
		}

		await ctx.db.delete(targetMembership._id);
	},
});

export const updateMemberRole = mutation({
	args: {
		orgId: v.id("organizations"),
		userId: v.id("users"),
		role: orgRoleValidator,
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			throw new Error("Not authenticated");
		}

		const callerMembership = await getOrgMembership(
			ctx,
			args.orgId,
			appUser._id
		);
		if (!callerMembership || callerMembership.role !== "owner") {
			throw new Error("Only owners can change member roles");
		}

		if (args.userId === appUser._id) {
			throw new Error("Cannot change your own role");
		}

		const targetMembership = await getOrgMembership(
			ctx,
			args.orgId,
			args.userId
		);
		if (!targetMembership) {
			throw new Error("User is not a member of this organization");
		}

		await ctx.db.patch(targetMembership._id, { role: args.role });
	},
});
