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

export const conversationStatusValidator = v.union(
	v.literal("active"),
	v.literal("completed"),
	v.literal("abandoned")
);

export const taskStatusValidator = v.union(
	v.literal("ready"),
	v.literal("in_progress"),
	v.literal("done")
);

export const taskLevelValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high")
);

export const inviteStatusValidator = v.union(
	v.literal("pending"),
	v.literal("accepted"),
	v.literal("cancelled")
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
	})
		.index("by_betterAuthId", ["betterAuthId"])
		.index("by_email", ["email"]),

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

	organizationInvites: defineTable({
		organizationId: v.id("organizations"),
		email: v.string(),
		role: orgRoleValidator,
		status: inviteStatusValidator,
		invitedBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_organizationId", ["organizationId"])
		.index("by_email", ["email"]),

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

	conversations: defineTable({
		projectId: v.id("projects"),
		threadId: v.string(),
		title: v.optional(v.string()),
		status: conversationStatusValidator,
		createdBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"]),

	tasks: defineTable({
		projectId: v.id("projects"),
		conversationId: v.id("conversations"),
		title: v.string(),
		brief: v.string(),
		affectedAreas: v.array(v.string()),
		risk: taskLevelValidator,
		complexity: taskLevelValidator,
		effort: taskLevelValidator,
		status: taskStatusValidator,
		assigneeId: v.optional(v.id("users")),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"])
		.index("by_assigneeId", ["assigneeId"]),

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

	docs: defineTable({
		projectId: v.id("projects"),
		title: v.string(),
		content: v.string(),
		createdBy: v.id("users"),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_updatedAt", ["projectId", "updatedAt"]),
});
