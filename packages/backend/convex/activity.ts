import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { getAppUser, getOrgMembership } from "./helpers";

const activityEntryValidator = v.object({
	projectId: v.id("projects"),
	userId: v.id("users"),
	action: v.union(
		v.literal("created"),
		v.literal("updated"),
		v.literal("deleted")
	),
	entityType: v.union(
		v.literal("triage"),
		v.literal("conversation"),
		v.literal("task"),
		v.literal("doc"),
		v.literal("plan")
	),
	entityId: v.string(),
	description: v.optional(v.string()),
});

interface ActivityEntry {
	action: "created" | "updated" | "deleted";
	description?: string;
	entityId: string;
	entityType: "triage" | "conversation" | "task" | "doc" | "plan";
	projectId: Id<"projects">;
	userId: Id<"users">;
}

async function insertActivity(ctx: MutationCtx, entry: ActivityEntry) {
	await ctx.db.insert("activity", {
		...entry,
		createdAt: Date.now(),
	});
}

const DEBOUNCE_MS = 60_000;

async function hasRecentActivity(
	ctx: MutationCtx,
	entry: Pick<ActivityEntry, "entityType" | "entityId">,
	debounceMs: number
): Promise<boolean> {
	const recent = await ctx.db
		.query("activity")
		.withIndex("by_entityType_entityId_createdAt", (q) =>
			q.eq("entityType", entry.entityType).eq("entityId", entry.entityId)
		)
		.order("desc")
		.first();
	return !!recent && Date.now() - recent.createdAt < debounceMs;
}

export const record = internalMutation({
	args: activityEntryValidator,
	handler: async (ctx, args) => {
		await insertActivity(ctx, args);
	},
});

export const recordMany = internalMutation({
	args: {
		entries: v.array(activityEntryValidator),
	},
	handler: async (ctx, { entries }) => {
		for (const entry of entries) {
			await insertActivity(ctx, entry);
		}
	},
});

export const recordIfNoRecent = internalMutation({
	args: {
		entry: activityEntryValidator,
		debounceMs: v.optional(v.number()),
	},
	handler: async (ctx, { entry, debounceMs }) => {
		const recent = await hasRecentActivity(
			ctx,
			entry,
			debounceMs ?? DEBOUNCE_MS
		);
		if (recent) {
			return false;
		}

		await insertActivity(ctx, entry);
		return true;
	},
});

export const list = query({
	args: {
		projectId: v.id("projects"),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const [appUser, project] = await Promise.all([
			getAppUser(ctx),
			ctx.db.get(args.projectId),
		]);
		if (!(appUser && project)) {
			return emptyActivityPage();
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return emptyActivityPage();
		}

		const page = await ctx.db
			.query("activity")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", args.projectId)
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const userIds = [...new Set(page.page.map((item) => item.userId))];
		const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
		const userMap = new Map(
			users
				.filter((u) => u !== null)
				.map((u) => [u._id, { name: u.name, avatarUrl: u.avatarUrl }])
		);

		return {
			...page,
			page: page.page.map((item) => ({
				...item,
				user: userMap.get(item.userId) ?? { name: "Unknown" },
			})),
		};
	},
});

function emptyActivityPage() {
	return {
		continueCursor: "",
		isDone: true,
		page: [],
	};
}
