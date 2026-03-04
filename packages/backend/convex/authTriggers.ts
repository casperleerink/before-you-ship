import type { GenericMutationCtx } from "convex/server";
import type { DataModel } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

type MutCtx = GenericMutationCtx<DataModel>;

async function handleUserCreate(ctx: MutCtx, doc: Record<string, unknown>) {
	await ctx.db.insert("users", {
		betterAuthId: doc._id as string,
		name: (doc.name as string) ?? "",
		email: doc.email as string,
		avatarUrl: (doc.image as string | null) ?? undefined,
		createdAt: Date.now(),
	});
}

async function handleUserUpdate(ctx: MutCtx, doc: Record<string, unknown>) {
	const appUser = await ctx.db
		.query("users")
		.withIndex("by_betterAuthId", (q) =>
			q.eq("betterAuthId", doc._id as string)
		)
		.first();

	if (appUser) {
		await ctx.db.patch(appUser._id, {
			name: (doc.name as string) ?? appUser.name,
			email: (doc.email as string) ?? appUser.email,
			avatarUrl: (doc.image as string | null) ?? appUser.avatarUrl,
		});
	}
}

export const onCreate = internalMutation({
	args: {},
	handler: async (ctx, args) => {
		const { model, doc } = args as {
			model: string;
			doc: Record<string, unknown>;
		};
		if (model === "user") {
			await handleUserCreate(ctx, doc);
		}
	},
});

export const onUpdate = internalMutation({
	args: {},
	handler: async (ctx, args) => {
		const { model, newDoc } = args as {
			model: string;
			newDoc: Record<string, unknown>;
		};
		if (model === "user") {
			await handleUserUpdate(ctx, newDoc);
		}
	},
});

export const onDelete = internalMutation({
	args: {},
	handler: async (_ctx, _args) => {
		// No-op for now — app user records are not deleted when auth user is deleted
	},
});
