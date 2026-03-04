import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orgRoleValidator = v.union(
	v.literal("owner"),
	v.literal("admin"),
	v.literal("member")
);

export const triageStatusValidator = v.union(
	v.literal("pending"),
	v.literal("converted")
);

export const projectRepoProviderValidator = v.union(
	v.literal("github"),
	v.literal("gitlab"),
	v.literal("azure_devops"),
	v.literal("bitbucket"),
	v.literal("self_hosted")
);

export default defineSchema({
	users: defineTable({
		betterAuthId: v.string(),
		name: v.string(),
		email: v.string(),
		avatarUrl: v.optional(v.string()),
		createdAt: v.number(),
	}).index("by_betterAuthId", ["betterAuthId"]),

	organizations: defineTable({
		name: v.string(),
		createdBy: v.id("users"),
		createdAt: v.number(),
	}),

	organizationMembers: defineTable({
		organizationId: v.id("organizations"),
		userId: v.id("users"),
		role: orgRoleValidator,
		joinedAt: v.number(),
	})
		.index("by_organizationId", ["organizationId"])
		.index("by_userId", ["userId"])
		.index("by_org_and_user", ["organizationId", "userId"]),

	projects: defineTable({
		name: v.string(),
		description: v.optional(v.string()),
		organizationId: v.id("organizations"),
		repoUrl: v.optional(v.string()),
		repoProvider: v.optional(projectRepoProviderValidator),
		sandboxId: v.optional(v.string()),
		createdBy: v.id("users"),
		createdAt: v.number(),
	}).index("by_organizationId", ["organizationId"]),

	triageItems: defineTable({
		projectId: v.id("projects"),
		content: v.string(),
		status: triageStatusValidator,
		conversationId: v.optional(v.id("conversations")),
		createdBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"]),
});
