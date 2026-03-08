import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orgRoleValidator = v.union(
	v.literal("owner"),
	v.literal("admin"),
	v.literal("member")
);

export const triageStatusValidator = v.union(
	v.literal("pending"),
	v.literal("converted"),
	v.literal("archived")
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

export const planStatusValidator = v.union(
	v.literal("proposed"),
	v.literal("approved"),
	v.literal("rejected")
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
		slug: v.string(),
		createdBy: v.id("users"),
		createdAt: v.number(),
	}).index("by_slug", ["slug"]),

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
	})
		.index("by_organizationId", ["organizationId"])
		.index("by_repoUrl", ["repoUrl"]),

	conversations: defineTable({
		projectId: v.id("projects"),
		threadId: v.string(),
		title: v.optional(v.string()),
		status: conversationStatusValidator,
		createdBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"])
		.index("by_threadId", ["threadId"]),

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
		embedding: v.optional(v.array(v.float64())),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"])
		.index("by_assigneeId", ["assigneeId"])
		.vectorIndex("by_embedding", {
			vectorField: "embedding",
			dimensions: 3072,
			filterFields: ["projectId"],
		}),

	triageItems: defineTable({
		projectId: v.id("projects"),
		content: v.string(),
		status: triageStatusValidator,
		conversationId: v.optional(v.id("conversations")),
		createdBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_createdAt", ["projectId", "createdAt"])
		.index("by_conversationId", ["conversationId"]),

	plans: defineTable({
		conversationId: v.id("conversations"),
		projectId: v.id("projects"),
		status: planStatusValidator,
		tasks: v.array(
			v.object({
				title: v.string(),
				brief: v.string(),
				affectedAreas: v.array(v.string()),
				risk: taskLevelValidator,
				complexity: taskLevelValidator,
				effort: taskLevelValidator,
			})
		),
		createdTaskIds: v.optional(v.array(v.id("tasks"))),
		createdAt: v.number(),
	}).index("by_conversationId", ["conversationId"]),

	gitConnections: defineTable({
		userId: v.id("users"),
		provider: projectRepoProviderValidator,
		providerAccountId: v.string(),
		accessToken: v.string(),
		instanceUrl: v.optional(v.string()),
		gitUsername: v.optional(v.string()),
		displayName: v.string(),
		avatarUrl: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_userId", ["userId"])
		.index("by_userId_provider", ["userId", "provider"]),

	gitConnectionRequests: defineTable({
		userId: v.id("users"),
		provider: projectRepoProviderValidator,
		state: v.string(),
		returnUrl: v.string(),
		createdAt: v.number(),
		expiresAt: v.number(),
	}).index("by_state", ["state"]),

	webhooks: defineTable({
		projectId: v.id("projects"),
		provider: projectRepoProviderValidator,
		providerWebhookId: v.string(),
		secret: v.string(),
		createdAt: v.number(),
	}).index("by_projectId", ["projectId"]),

	fileTreeCache: defineTable({
		projectId: v.id("projects"),
		path: v.string(),
		entries: v.array(
			v.object({
				name: v.string(),
				isDir: v.boolean(),
				size: v.number(),
			})
		),
		cachedAt: v.number(),
	}).index("by_projectId_path", ["projectId", "path"]),

	activity: defineTable({
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
		createdAt: v.number(),
	})
		.index("by_projectId_createdAt", ["projectId", "createdAt"])
		.index("by_entityType_entityId_createdAt", [
			"entityType",
			"entityId",
			"createdAt",
		]),

	docs: defineTable({
		projectId: v.id("projects"),
		title: v.string(),
		content: v.string(),
		embedding: v.optional(v.array(v.float64())),
		createdBy: v.id("users"),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_projectId_updatedAt", ["projectId", "updatedAt"])
		.vectorIndex("by_embedding", {
			vectorField: "embedding",
			dimensions: 3072,
			filterFields: ["projectId"],
		}),
});
