import {
	type AuthFunctions,
	createClient,
	type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { makeFunctionReference } from "convex/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL ?? "";

// Use makeFunctionReference to avoid circular type dependency with internal API
const authFunctions: AuthFunctions = {
	onCreate: makeFunctionReference(
		"authTriggers:onCreate"
	) as unknown as AuthFunctions["onCreate"],
	onUpdate: makeFunctionReference(
		"authTriggers:onUpdate"
	) as unknown as AuthFunctions["onUpdate"],
	onDelete: makeFunctionReference(
		"authTriggers:onDelete"
	) as unknown as AuthFunctions["onDelete"],
};

export const authComponent = createClient<DataModel>(components.betterAuth, {
	triggers: {
		user: {
			// No-op triggers — actual logic is in authTriggers.ts
			// These entries are required for the adapter to fire authFunctions
			onCreate: async () => undefined,
			onUpdate: async () => undefined,
			onDelete: async () => undefined,
		},
	},
	authFunctions,
});

function createAuth(ctx: GenericCtx<DataModel>) {
	return betterAuth({
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		plugins: [
			crossDomain({ siteUrl }),
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true,
			}),
		],
	});
}

export { createAuth };

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.safeGetAuthUser(ctx);
	},
});
