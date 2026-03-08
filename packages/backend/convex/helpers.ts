import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalQuery,
	type MutationCtx,
	type QueryCtx,
} from "./_generated/server";
import { authComponent } from "./auth";

type AuthCtx = QueryCtx | MutationCtx;

interface AssignmentCandidate {
	assignment: {
		eligibleForAssignment: boolean;
		notesForAI?: string;
		ownedAreas: string[];
		ownedSystems: string[];
		projectRoleLabel?: string;
	};
	orgMembership: {
		_id: Id<"organizationMembers">;
		profile?: {
			assignmentEnabled: boolean;
			availabilityNotes?: string;
			availabilityStatus: "available" | "limited" | "unavailable";
			avoids: string[];
			department?: string;
			jobTitle?: string;
			ownedDomains: string[];
			preferredTaskTypes: string[];
			strengths: string[];
			timezone?: string;
			workDescription?: string;
		};
		role: "owner" | "admin" | "member";
		userId: Id<"users">;
	};
	projectId: Id<"projects">;
	projectMemberId: Id<"projectMembers">;
	user: {
		_id: Id<"users">;
		avatarUrl?: string;
		email: string;
		name: string;
	};
}

export async function getAppUser(ctx: AuthCtx) {
	const authUser = await authComponent.safeGetAuthUser(ctx);
	if (!authUser) {
		return null;
	}
	return ctx.db
		.query("users")
		.withIndex("by_betterAuthId", (q) => q.eq("betterAuthId", authUser._id))
		.first();
}

export function getOrgMembership(
	ctx: AuthCtx,
	orgId: Id<"organizations">,
	userId: Id<"users">
) {
	return ctx.db
		.query("organizationMembers")
		.withIndex("by_org_and_user", (q) =>
			q.eq("organizationId", orgId).eq("userId", userId)
		)
		.first();
}

export function getProjectAssignmentMembership(
	ctx: AuthCtx,
	projectId: Id<"projects">,
	userId: Id<"users">
) {
	return ctx.db
		.query("projectMembers")
		.withIndex("by_projectId_userId", (q) =>
			q.eq("projectId", projectId).eq("userId", userId)
		)
		.unique();
}

export async function requireUser(ctx: AuthCtx) {
	const appUser = await getAppUser(ctx);
	if (!appUser) {
		throw new Error("Not authenticated");
	}
	return appUser;
}

export async function requireOrgMember(
	ctx: AuthCtx,
	orgId: Id<"organizations">
) {
	const appUser = await requireUser(ctx);
	const membership = await getOrgMembership(ctx, orgId, appUser._id);
	if (!membership) {
		throw new Error("Not a member of this organization");
	}
	return { appUser, membership };
}

export async function requireProjectMember(
	ctx: AuthCtx,
	projectId: Id<"projects">
) {
	const [appUser, project] = await Promise.all([
		requireUser(ctx),
		ctx.db.get(projectId),
	]);
	if (!project) {
		throw new Error("Project not found");
	}

	const membership = await getOrgMembership(
		ctx,
		project.organizationId,
		appUser._id
	);
	if (!membership) {
		throw new Error("Not a member of this organization");
	}

	return { appUser, membership, project };
}

export async function resolveUserNames(ctx: QueryCtx, userIds: Id<"users">[]) {
	const uniqueIds = [...new Set(userIds)];
	const users = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
	const userMap = new Map<Id<"users">, { name: string }>();
	for (const u of users) {
		if (u) {
			userMap.set(u._id, { name: u.name });
		}
	}
	return userMap;
}

export async function listProjectAssignmentCandidates(
	ctx: AuthCtx,
	projectId: Id<"projects">
): Promise<AssignmentCandidate[]> {
	const project = await ctx.db.get(projectId);
	if (!project) {
		return [];
	}

	const projectMembers = await ctx.db
		.query("projectMembers")
		.withIndex("by_projectId", (q) => q.eq("projectId", projectId))
		.collect();

	const candidates = await Promise.all(
		projectMembers.map(async (projectMember) => {
			const assignment = projectMember.assignment;
			if (!assignment?.eligibleForAssignment) {
				return null;
			}

			const [user, orgMembership] = await Promise.all([
				ctx.db.get(projectMember.userId),
				getOrgMembership(ctx, project.organizationId, projectMember.userId),
			]);

			if (!(user && orgMembership)) {
				return null;
			}

			if (orgMembership.profile?.assignmentEnabled === false) {
				return null;
			}

			if (orgMembership.profile?.availabilityStatus === "unavailable") {
				return null;
			}

			return {
				assignment,
				orgMembership,
				projectId,
				projectMemberId: projectMember._id,
				user,
			};
		})
	);

	return candidates.filter(
		(candidate): candidate is NonNullable<typeof candidate> =>
			candidate !== null
	);
}

export async function isProjectAssignmentCandidate(
	ctx: AuthCtx,
	projectId: Id<"projects">,
	userId: Id<"users">
) {
	const projectAssignmentMember = await getProjectAssignmentMembership(
		ctx,
		projectId,
		userId
	);
	if (!projectAssignmentMember?.assignment?.eligibleForAssignment) {
		return false;
	}

	const project = await ctx.db.get(projectId);
	if (!project) {
		return false;
	}

	const orgMembership = await getOrgMembership(
		ctx,
		project.organizationId,
		userId
	);
	if (!orgMembership) {
		return false;
	}

	if (orgMembership.profile?.assignmentEnabled === false) {
		return false;
	}

	return orgMembership.profile?.availabilityStatus !== "unavailable";
}

export const getUserByBetterAuthId = internalQuery({
	args: {
		betterAuthId: v.string(),
	},
	handler: (ctx, args) => {
		return ctx.db
			.query("users")
			.withIndex("by_betterAuthId", (q) =>
				q.eq("betterAuthId", args.betterAuthId)
			)
			.first();
	},
});
