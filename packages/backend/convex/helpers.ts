import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

export async function getAppUser(ctx: QueryCtx) {
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
	ctx: QueryCtx,
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
