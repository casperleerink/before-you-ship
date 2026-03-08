import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

type AuthCtx = QueryCtx | MutationCtx;

export async function getAppUser(ctx: AuthCtx) {
	const authUser = await authComponent.safeGetAuthUser(ctx);
	if (!authUser) {
		return null;
	}
	return ctx.db
		.query("users")
		.withIndex("by_betterAuthId", (q) => q.eq("betterAuthId", authUser._id))
		.first();
}

export function getOrgMembership(
	ctx: AuthCtx,
	orgId: Id<"organizations">,
	userId: Id<"users">
) {
	return ctx.db
		.query("organizationMembers")
		.withIndex("by_org_and_user", (q) =>
			q.eq("organizationId", orgId).eq("userId", userId)
		)
		.first();
}

export async function requireUser(ctx: AuthCtx) {
	const appUser = await getAppUser(ctx);
	if (!appUser) {
		throw new Error("Not authenticated");
	}
	return appUser;
}

export async function requireOrgMember(
	ctx: AuthCtx,
	orgId: Id<"organizations">
) {
	const appUser = await requireUser(ctx);
	const membership = await getOrgMembership(ctx, orgId, appUser._id);
	if (!membership) {
		throw new Error("Not a member of this organization");
	}
	return { appUser, membership };
}

export async function requireProjectMember(
	ctx: AuthCtx,
	projectId: Id<"projects">
) {
	const [appUser, project] = await Promise.all([
		requireUser(ctx),
		ctx.db.get(projectId),
	]);
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

	return { appUser, membership, project };
}

export async function resolveUserNames(ctx: QueryCtx, userIds: Id<"users">[]) {
	const uniqueIds = [...new Set(userIds)];
	const users = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
	const userMap = new Map<Id<"users">, { name: string }>();
	for (const u of users) {
		if (u) {
			userMap.set(u._id, { name: u.name });
		}
	}
	return userMap;
}
