import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";

export async function logActivity(
	ctx: MutationCtx,
	args: {
		projectId: Id<"projects">;
		userId: Id<"users">;
		action: "created" | "updated" | "deleted";
		entityType: "triage" | "conversation" | "task" | "doc" | "plan";
		entityId: string;
		description?: string;
	}
) {
	await ctx.db.insert("activity", {
		...args,
		createdAt: Date.now(),
	});
}

const DEBOUNCE_MS = 60_000;

export async function hasRecentActivity(
	ctx: MutationCtx,
	entityId: string
): Promise<boolean> {
	const recent = await ctx.db
		.query("activity")
		.order("desc")
		.filter((q) => q.eq(q.field("entityId"), entityId))
		.first();
	return !!recent && Date.now() - recent.createdAt < DEBOUNCE_MS;
}

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

		const items = await ctx.db
			.query("activity")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.take(30);

		const userIds = [...new Set(items.map((i) => i.userId))];
		const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
		const userMap = new Map(
			users
				.filter((u) => u !== null)
				.map((u) => [u._id, { name: u.name, avatarUrl: u.avatarUrl }])
		);

		return items.map((item) => ({
			...item,
			user: userMap.get(item.userId) ?? { name: "Unknown" },
		}));
	},
});
