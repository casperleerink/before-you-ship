import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { detectRepoProviderFromUrl } from "./gitUtils";
import {
	getAppUser,
	getOrgMembership,
	isProjectAssignmentCandidate,
	listProjectAssignmentCandidates,
	requireOrgMember,
	requireProjectMember,
} from "./helpers";
import {
	projectMemberAssignmentValidator,
	projectRepoProviderValidator,
} from "./schema";

async function deleteRecords<
	T extends
		| "activity"
		| "conversations"
		| "docs"
		| "fileTreeCache"
		| "plans"
		| "projectMembers"
		| "tasks"
		| "triageItems"
		| "webhooks",
>(ctx: MutationCtx, ids: Id<T>[]) {
	await Promise.all(ids.map((id) => ctx.db.delete(id)));
}

async function deleteProjectCascade(
	ctx: MutationCtx,
	project: Doc<"projects">,
	actorUserId: Id<"users">
) {
	const [
		conversations,
		tasks,
		triageItems,
		docs,
		activity,
		fileTreeEntries,
		projectMembers,
		webhook,
	] = await Promise.all([
		ctx.db
			.query("conversations")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("tasks")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("triageItems")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("docs")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("activity")
			.withIndex("by_projectId_createdAt", (q) =>
				q.eq("projectId", project._id)
			)
			.collect(),
		ctx.db
			.query("fileTreeCache")
			.withIndex("by_projectId_path", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("projectMembers")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.collect(),
		ctx.db
			.query("webhooks")
			.withIndex("by_projectId", (q) => q.eq("projectId", project._id))
			.first(),
	]);

	const plans = (
		await Promise.all(
			conversations.map((conversation) =>
				ctx.db
					.query("plans")
					.withIndex("by_conversationId", (q) =>
						q.eq("conversationId", conversation._id)
					)
					.collect()
			)
		)
	).flat();

	const threadIds = conversations.map((conversation) => conversation.threadId);

	if (project.repoProvider === "github" && project.repoUrl && webhook) {
		const gitConnection = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", actorUserId).eq("provider", "github")
			)
			.first();

		if (gitConnection) {
			await ctx.scheduler.runAfter(0, internal.webhooks.deleteGithubByDetails, {
				repoUrl: project.repoUrl,
				gitConnectionId: gitConnection._id,
				providerWebhookId: webhook.providerWebhookId,
			});
		}
	}

	if (project.sandboxId) {
		await ctx.scheduler.runAfter(0, internal.daytonaActions.deleteSandbox, {
			sandboxId: project.sandboxId,
		});
	}

	if (threadIds.length > 0) {
		await ctx.scheduler.runAfter(0, internal.chat.deleteThreadData, {
			threadIds,
		});
	}

	await deleteRecords(
		ctx,
		plans.map((plan) => plan._id)
	);
	await deleteRecords(
		ctx,
		tasks.map((task) => task._id)
	);
	await deleteRecords(
		ctx,
		triageItems.map((item) => item._id)
	);
	await deleteRecords(
		ctx,
		docs.map((doc) => doc._id)
	);
	await deleteRecords(
		ctx,
		activity.map((entry) => entry._id)
	);
	await deleteRecords(
		ctx,
		fileTreeEntries.map((entry) => entry._id)
	);
	await deleteRecords(
		ctx,
		projectMembers.map((member) => member._id)
	);
	if (webhook) {
		await ctx.db.delete(webhook._id);
	}
	await deleteRecords(
		ctx,
		conversations.map((conversation) => conversation._id)
	);
	await ctx.db.delete(project._id);
}

export const list = query({
	args: {
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return [];
		}

		const membership = await getOrgMembership(ctx, args.orgId, appUser._id);
		if (!membership) {
			return [];
		}

		return ctx.db
			.query("projects")
			.withIndex("by_organizationId", (q) => q.eq("organizationId", args.orgId))
			.collect();
	},
});

export const getById = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const appUser = await getAppUser(ctx);
		if (!appUser) {
			return null;
		}

		const project = await ctx.db.get(args.projectId);
		if (!project) {
			return null;
		}

		const membership = await getOrgMembership(
			ctx,
			project.organizationId,
			appUser._id
		);
		if (!membership) {
			return null;
		}

		return project;
	},
});

export const update = mutation({
	args: {
		projectId: v.id("projects"),
		name: v.string(),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await requireProjectMember(ctx, args.projectId);

		await ctx.db.patch(args.projectId, {
			name: args.name,
			description: args.description,
		});
	},
});

export const listProjectMembersForAssignment = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { project } = await requireProjectMember(ctx, args.projectId);
		const [orgMemberships, projectMembers] = await Promise.all([
			ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) =>
					q.eq("organizationId", project.organizationId)
				)
				.collect(),
			ctx.db
				.query("projectMembers")
				.withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
				.collect(),
		]);

		const projectMemberMap = new Map(
			projectMembers.map((projectMember) => [
				projectMember.userId,
				projectMember,
			])
		);

		const rows = await Promise.all(
			orgMemberships.map(async (membership) => {
				const user = await ctx.db.get(membership.userId);
				if (!user) {
					return null;
				}

				const projectMember = projectMemberMap.get(membership.userId) ?? null;
				return {
					_id: user._id,
					assignment: projectMember?.assignment,
					avatarUrl: user.avatarUrl,
					email: user.email,
					isEligibleForAssignment:
						projectMember?.assignment?.eligibleForAssignment === true &&
						membership.profile?.assignmentEnabled !== false &&
						membership.profile?.availabilityStatus !== "unavailable",
					isProjectMember: projectMember !== null,
					name: user.name,
					profile: membership.profile,
					projectMemberId: projectMember?._id,
					role: membership.role,
				};
			})
		);

		return rows
			.filter((row): row is NonNullable<typeof row> => row !== null)
			.sort((a, b) => a.name.localeCompare(b.name));
	},
});

export const listAssignmentCandidates = query({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		await requireProjectMember(ctx, args.projectId);
		const candidates = await listProjectAssignmentCandidates(
			ctx,
			args.projectId
		);

		return candidates.map((candidate) => ({
			_id: candidate.user._id,
			name: candidate.user.name,
		}));
	},
});

export const listAssignmentCandidatesInternal = internalQuery({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const candidates = await listProjectAssignmentCandidates(
			ctx,
			args.projectId
		);

		return candidates.map((candidate) => ({
			availabilityNotes: candidate.orgMembership.profile?.availabilityNotes,
			availabilityStatus:
				candidate.orgMembership.profile?.availabilityStatus ?? "available",
			department: candidate.orgMembership.profile?.department,
			jobTitle: candidate.orgMembership.profile?.jobTitle,
			name: candidate.user.name,
			notesForAI: candidate.assignment.notesForAI,
			ownedAreas: candidate.assignment.ownedAreas,
			ownedDomains: candidate.orgMembership.profile?.ownedDomains ?? [],
			ownedSystems: candidate.assignment.ownedSystems,
			preferredTaskTypes:
				candidate.orgMembership.profile?.preferredTaskTypes ?? [],
			projectRoleLabel: candidate.assignment.projectRoleLabel,
			strengths: candidate.orgMembership.profile?.strengths ?? [],
			userId: candidate.user._id,
			workDescription: candidate.orgMembership.profile?.workDescription,
		}));
	},
});

export const upsertProjectMember = mutation({
	args: {
		projectId: v.id("projects"),
		userId: v.id("users"),
		assignment: v.optional(projectMemberAssignmentValidator),
	},
	handler: async (ctx, args) => {
		const { membership, project } = await requireProjectMember(
			ctx,
			args.projectId
		);
		if (membership.role === "member") {
			throw new Error("Only owners and admins can manage assignment members");
		}

		const orgMembership = await getOrgMembership(
			ctx,
			project.organizationId,
			args.userId
		);
		if (!orgMembership) {
			throw new Error("User is not a member of this organization");
		}

		const existing = await ctx.db
			.query("projectMembers")
			.withIndex("by_projectId_userId", (q) =>
				q.eq("projectId", args.projectId).eq("userId", args.userId)
			)
			.unique();
		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				assignment: args.assignment,
				updatedAt: now,
			});
			return existing._id;
		}

		return ctx.db.insert("projectMembers", {
			assignment: args.assignment,
			createdAt: now,
			projectId: args.projectId,
			updatedAt: now,
			userId: args.userId,
		});
	},
});

export const removeProjectMember = mutation({
	args: {
		projectId: v.id("projects"),
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const { membership } = await requireProjectMember(ctx, args.projectId);
		if (membership.role === "member") {
			throw new Error("Only owners and admins can manage assignment members");
		}

		const existing = await ctx.db
			.query("projectMembers")
			.withIndex("by_projectId_userId", (q) =>
				q.eq("projectId", args.projectId).eq("userId", args.userId)
			)
			.unique();
		if (!existing) {
			return null;
		}

		await ctx.db.delete(existing._id);
		return existing._id;
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		repoUrl: v.optional(v.string()),
		orgId: v.id("organizations"),
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireOrgMember(ctx, args.orgId);

		const repoProvider = detectRepoProviderFromUrl(args.repoUrl);

		const projectId = await ctx.db.insert("projects", {
			name: args.name,
			description: args.description,
			repoUrl: args.repoUrl,
			repoProvider,
			organizationId: args.orgId,
			createdBy: appUser._id,
			createdAt: Date.now(),
		});

		// If a repo URL was provided, set up the sandbox
		if (args.repoUrl) {
			let gitConnectionId: Id<"gitConnections"> | undefined;

			if (repoProvider) {
				const gitConnection = await ctx.db
					.query("gitConnections")
					.withIndex("by_userId_provider", (q) =>
						q.eq("userId", appUser._id).eq("provider", repoProvider)
					)
					.first();
				gitConnectionId = gitConnection?._id;

				// Register webhook for push events (GitHub only, requires OAuth connection)
				if (repoProvider === "github" && gitConnection) {
					await ctx.scheduler.runAfter(0, internal.webhooks.registerGithub, {
						projectId,
						repoUrl: args.repoUrl,
						gitConnectionId: gitConnection._id,
					});
				}
			}

			await ctx.scheduler.runAfter(0, internal.daytonaActions.createSandbox, {
				projectId,
				repoUrl: args.repoUrl,
				gitConnectionId,
			});
		}

		return projectId;
	},
});

export const connectRepo = mutation({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		repoProvider: projectRepoProviderValidator,
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireProjectMember(ctx, args.projectId);

		await ctx.db.patch(args.projectId, {
			repoUrl: args.repoUrl,
			repoProvider: args.repoProvider,
		});

		// Look up user's git connection for this provider to pass OAuth token
		const gitConnection = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", appUser._id).eq("provider", args.repoProvider)
			)
			.first();

		await ctx.scheduler.runAfter(0, internal.daytonaActions.createSandbox, {
			projectId: args.projectId,
			repoUrl: args.repoUrl,
			gitConnectionId: gitConnection?._id,
		});

		// Register webhook for push events (GitHub only, requires OAuth connection)
		if (args.repoProvider === "github" && gitConnection) {
			await ctx.scheduler.runAfter(0, internal.webhooks.registerGithub, {
				projectId: args.projectId,
				repoUrl: args.repoUrl,
				gitConnectionId: gitConnection._id,
			});
		}
	},
});

export const connectSelfHostedRepo = mutation({
	args: {
		projectId: v.id("projects"),
		repoUrl: v.string(),
		accessToken: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { appUser } = await requireProjectMember(ctx, args.projectId);

		await ctx.db.patch(args.projectId, {
			repoUrl: args.repoUrl,
			repoProvider: "self_hosted" as const,
		});

		// Store credentials as a gitConnection if access token provided
		const existingConnection = await ctx.db
			.query("gitConnections")
			.withIndex("by_userId_provider", (q) =>
				q.eq("userId", appUser._id).eq("provider", "self_hosted")
			)
			.first();

		let gitConnectionId = existingConnection?._id;

		if (args.accessToken) {
			const now = Date.now();
			if (existingConnection) {
				await ctx.db.patch(existingConnection._id, {
					accessToken: args.accessToken,
					updatedAt: now,
				});
				gitConnectionId = existingConnection._id;
			} else {
				gitConnectionId = await ctx.db.insert("gitConnections", {
					userId: appUser._id,
					provider: "self_hosted",
					providerAccountId: "self_hosted",
					accessToken: args.accessToken,
					displayName: "Self-hosted Git",
					createdAt: now,
					updatedAt: now,
				});
			}
		}

		await ctx.scheduler.runAfter(0, internal.daytonaActions.createSandbox, {
			projectId: args.projectId,
			repoUrl: args.repoUrl,
			gitConnectionId,
		});
	},
});

export const disconnectRepo = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { appUser, project } = await requireProjectMember(
			ctx,
			args.projectId
		);

		// Unregister webhook before deleting sandbox (GitHub only)
		if (project.repoProvider === "github" && project.repoUrl) {
			const gitConnection = await ctx.db
				.query("gitConnections")
				.withIndex("by_userId_provider", (q) =>
					q.eq("userId", appUser._id).eq("provider", "github")
				)
				.first();

			if (gitConnection) {
				await ctx.scheduler.runAfter(0, internal.webhooks.unregisterGithub, {
					projectId: args.projectId,
					repoUrl: project.repoUrl,
					gitConnectionId: gitConnection._id,
				});
			}
		}

		if (project.sandboxId) {
			await ctx.scheduler.runAfter(0, internal.daytonaActions.deleteSandbox, {
				sandboxId: project.sandboxId,
			});
		}

		// Clear cached file tree
		await ctx.runMutation(internal.daytona.clearFileTreeCache, {
			projectId: args.projectId,
		});

		await ctx.db.patch(args.projectId, {
			repoUrl: undefined,
			repoProvider: undefined,
			sandboxId: undefined,
		});
	},
});

export const deleteProject = mutation({
	args: {
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		const { appUser, membership, project } = await requireProjectMember(
			ctx,
			args.projectId
		);
		if (membership.role === "member") {
			throw new Error("Only owners and admins can delete projects");
		}

		await deleteProjectCascade(ctx, project, appUser._id);
	},
});

export const deleteProjectCascadeInternal = internalMutation({
	args: {
		projectId: v.id("projects"),
		actorUserId: v.id("users"),
	},
	handler: async (ctx, args) => {
		const project = await ctx.db.get(args.projectId);
		if (!project) {
			return;
		}

		await deleteProjectCascade(ctx, project, args.actorUserId);
	},
});

export const validateAssignmentCandidateInternal = internalQuery({
	args: {
		projectId: v.id("projects"),
		userId: v.id("users"),
	},
	handler: (ctx, args) =>
		isProjectAssignmentCandidate(ctx, args.projectId, args.userId),
});
