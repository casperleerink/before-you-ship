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

export const taskUrgencyValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high")
);

export const assignmentAvailabilityStatusValidator = v.union(
	v.literal("available"),
	v.literal("limited"),
	v.literal("unavailable")
);

export const planStatusValidator = v.union(
	v.literal("proposed"),
	v.literal("approved"),
	v.literal("rejected")
);

export const taskDependencyStateValidator = v.union(
	v.literal("active"),
	v.literal("dismissed")
);

export const taskDependencySourceValidator = v.literal("ai");

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

export const organizationMemberProfileValidator = v.object({
	jobTitle: v.optional(v.string()),
	department: v.optional(v.string()),
	workDescription: v.optional(v.string()),
	strengths: v.array(v.string()),
	preferredTaskTypes: v.array(v.string()),
	ownedDomains: v.array(v.string()),
	avoids: v.array(v.string()),
	availabilityStatus: assignmentAvailabilityStatusValidator,
	availabilityNotes: v.optional(v.string()),
	timezone: v.optional(v.string()),
	assignmentEnabled: v.boolean(),
});

export const projectMemberAssignmentValidator = v.object({
	eligibleForAssignment: v.boolean(),
	projectRoleLabel: v.optional(v.string()),
	ownedAreas: v.array(v.string()),
	ownedSystems: v.array(v.string()),
	notesForAI: v.optional(v.string()),
});

export const planTaskDependencyRefValidator = v.union(
	v.object({
		kind: v.literal("plan_task"),
		clientId: v.string(),
	}),
	v.object({
		kind: v.literal("existing_task"),
		taskId: v.id("tasks"),
	})
);

export const planTaskValidator = v.object({
	clientId: v.string(),
	title: v.string(),
	brief: v.string(),
	affectedAreas: v.array(v.string()),
	risk: taskLevelValidator,
	complexity: taskLevelValidator,
	effort: taskLevelValidator,
	urgency: taskUrgencyValidator,
	blockedBy: v.array(planTaskDependencyRefValidator),
	assigneeId: v.optional(v.id("users")),
});

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
		profile: v.optional(organizationMemberProfileValidator),
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
		createdBy: v.id("users"),
		createdAt: v.number(),
	})
		.index("by_organizationId", ["organizationId"])
		.index("by_repoUrl", ["repoUrl"]),

	projectMembers: defineTable({
		projectId: v.id("projects"),
		userId: v.id("users"),
		assignment: v.optional(projectMemberAssignmentValidator),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_projectId", ["projectId"])
		.index("by_userId", ["userId"])
		.index("by_projectId_userId", ["projectId", "userId"]),

	conversations: defineTable({
		projectId: v.id("projects"),
		threadId: v.string(),
		title: v.optional(v.string()),
		sandboxId: v.optional(v.string()),
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
		urgency: taskUrgencyValidator,
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

	taskDependencies: defineTable({
		projectId: v.id("projects"),
		blockedTaskId: v.id("tasks"),
		blockerTaskId: v.id("tasks"),
		source: taskDependencySourceValidator,
		state: taskDependencyStateValidator,
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_blockedTaskId", ["blockedTaskId"])
		.index("by_blockerTaskId", ["blockerTaskId"])
		.index("by_projectId", ["projectId"])
		.index("by_projectId_blockedTaskId", ["projectId", "blockedTaskId"])
		.index("by_projectId_blockerTaskId", ["projectId", "blockerTaskId"]),

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
		tasks: v.array(planTaskValidator),
		createdTaskIds: v.optional(v.array(v.id("tasks"))),
		createdAt: v.number(),
	}).index("by_conversationId", ["conversationId"]),

	gitConnections: defineTable({
		userId: v.id("users"),
		provider: projectRepoProviderValidator,
		providerAccountId: v.string(),
		accessToken: v.string(),
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
