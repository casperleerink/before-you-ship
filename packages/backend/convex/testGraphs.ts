import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type DbCtx = Pick<MutationCtx, "db">;

export function insertOrganizationGraph(
	ctx: DbCtx,
	{
		createdAt = Date.now(),
		createdBy,
		name,
		role = "owner",
		slug,
		userId,
	}: {
		createdAt?: number;
		createdBy: Id<"users">;
		name: string;
		role?: Doc<"organizationMembers">["role"];
		slug: string;
		userId: Id<"users">;
	}
) {
	return (async () => {
		const organizationId = await ctx.db.insert("organizations", {
			createdAt,
			createdBy,
			name,
			slug,
		});

		const membershipId = await ctx.db.insert("organizationMembers", {
			joinedAt: createdAt,
			organizationId,
			role,
			userId,
		});

		return { membershipId, organizationId };
	})();
}

export function insertOrganizationMember(
	ctx: DbCtx,
	{
		joinedAt = Date.now(),
		organizationId,
		profile,
		role,
		userId,
	}: {
		joinedAt?: number;
		organizationId: Id<"organizations">;
		profile?: Doc<"organizationMembers">["profile"];
		role: Doc<"organizationMembers">["role"];
		userId: Id<"users">;
	}
) {
	return ctx.db.insert("organizationMembers", {
		joinedAt,
		organizationId,
		profile,
		role,
		userId,
	});
}

export function insertProjectGraph(
	ctx: DbCtx,
	{
		createdAt = Date.now(),
		createdBy,
		description = "Test project",
		name = "Project Alpha",
		organizationId,
		repoProvider,
		repoUrl,
	}: {
		createdAt?: number;
		createdBy: Id<"users">;
		description?: string;
		name?: string;
		organizationId: Id<"organizations">;
		repoProvider?: Doc<"projects">["repoProvider"];
		repoUrl?: string;
	}
) {
	return ctx.db.insert("projects", {
		createdAt,
		createdBy,
		description,
		name,
		organizationId,
		repoProvider,
		repoUrl,
	});
}

export function insertProjectMember(
	ctx: DbCtx,
	{
		assignment,
		createdAt = Date.now(),
		projectId,
		updatedAt = createdAt,
		userId,
	}: {
		assignment?: Doc<"projectMembers">["assignment"];
		createdAt?: number;
		projectId: Id<"projects">;
		updatedAt?: number;
		userId: Id<"users">;
	}
) {
	return ctx.db.insert("projectMembers", {
		assignment,
		createdAt,
		projectId,
		updatedAt,
		userId,
	});
}

export function insertConversationGraph(
	ctx: DbCtx,
	{
		createdAt = Date.now(),
		createdBy,
		projectId,
		status = "active",
		threadId = `thread_${crypto.randomUUID()}`,
		title = "Conversation",
	}: {
		createdAt?: number;
		createdBy: Id<"users">;
		projectId: Id<"projects">;
		status?: Doc<"conversations">["status"];
		threadId?: string;
		title?: string;
	}
) {
	return ctx.db.insert("conversations", {
		createdAt,
		createdBy,
		projectId,
		status,
		threadId,
		title,
	});
}

export function insertTriageItem(
	ctx: DbCtx,
	{
		content = "Investigate flaky behavior",
		conversationId,
		createdAt = Date.now(),
		createdBy,
		projectId,
		status = "pending",
	}: {
		content?: string;
		conversationId?: Id<"conversations">;
		createdAt?: number;
		createdBy: Id<"users">;
		projectId: Id<"projects">;
		status?: Doc<"triageItems">["status"];
	}
) {
	return ctx.db.insert("triageItems", {
		content,
		conversationId,
		createdAt,
		createdBy,
		projectId,
		status,
	});
}

export function insertTask(
	ctx: DbCtx,
	{
		affectedAreas = ["backend"],
		assigneeId,
		brief = "Initial task brief",
		complexity = "medium",
		conversationId,
		createdAt = Date.now(),
		effort = "medium",
		projectId,
		risk = "low",
		status = "ready",
		title = "Investigate tests",
		urgency = "medium",
	}: {
		affectedAreas?: string[];
		assigneeId?: Id<"users">;
		brief?: string;
		complexity?: Doc<"tasks">["complexity"];
		conversationId: Id<"conversations">;
		createdAt?: number;
		effort?: Doc<"tasks">["effort"];
		projectId: Id<"projects">;
		risk?: Doc<"tasks">["risk"];
		status?: Doc<"tasks">["status"];
		title?: string;
		urgency?: Doc<"tasks">["urgency"];
	}
) {
	return ctx.db.insert("tasks", {
		affectedAreas,
		assigneeId,
		brief,
		complexity,
		conversationId,
		createdAt,
		effort,
		projectId,
		risk,
		status,
		title,
		urgency,
	});
}

export function insertDoc(
	ctx: DbCtx,
	{
		content = "",
		createdAt = Date.now(),
		createdBy,
		projectId,
		title,
		updatedAt = createdAt,
	}: {
		content?: string;
		createdAt?: number;
		createdBy: Id<"users">;
		projectId: Id<"projects">;
		title: string;
		updatedAt?: number;
	}
) {
	return ctx.db.insert("docs", {
		content,
		createdAt,
		createdBy,
		projectId,
		title,
		updatedAt,
	});
}

export function insertPlan(
	ctx: DbCtx,
	{
		conversationId,
		createdAt = Date.now(),
		projectId,
	}: {
		conversationId: Id<"conversations">;
		createdAt?: number;
		projectId: Id<"projects">;
	}
) {
	return ctx.db.insert("plans", {
		conversationId,
		createdAt,
		projectId,
		status: "proposed",
		tasks: [
			{
				affectedAreas: ["backend", "convex"],
				blockedBy: [],
				brief: "Add backend tests",
				clientId: "task-1",
				complexity: "medium",
				effort: "medium",
				risk: "low",
				title: "Build test harness",
				urgency: "medium",
			},
			{
				affectedAreas: ["web"],
				blockedBy: [
					{
						clientId: "task-1",
						kind: "plan_task" as const,
					},
				],
				brief: "Add smoke test",
				clientId: "task-2",
				complexity: "low",
				effort: "low",
				risk: "low",
				title: "Wire root runner",
				urgency: "low",
			},
		],
	});
}

export function insertTaskDependency(
	ctx: DbCtx,
	{
		blockedTaskId,
		blockerTaskId,
		createdAt = Date.now(),
		projectId,
		state = "active",
		updatedAt = createdAt,
	}: {
		blockedTaskId: Id<"tasks">;
		blockerTaskId: Id<"tasks">;
		createdAt?: number;
		projectId: Id<"projects">;
		state?: Doc<"taskDependencies">["state"];
		updatedAt?: number;
	}
) {
	return ctx.db.insert("taskDependencies", {
		blockedTaskId,
		blockerTaskId,
		createdAt,
		projectId,
		source: "ai",
		state,
		updatedAt,
	});
}
