import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	httpAction,
	internalMutation,
	type MutationCtx,
} from "./_generated/server";
import { createAuth } from "./auth";
import {
	insertConversationGraph,
	insertDoc,
	insertOrganizationGraph,
	insertOrganizationMember,
	insertProjectGraph,
	insertProjectMember,
	insertTask,
	insertTaskDependency,
	insertTriageItem,
} from "./testGraphs";

const E2E_EMAIL_PREFIX = "e2e+";
const E2E_ORG_SLUG_PREFIX = "e2e-";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);

function json(data: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(data), {
		headers: {
			"content-type": "application/json",
		},
		...init,
	});
}

function unauthorizedResponse(message: string, status: number) {
	return json({ error: message }, { status });
}

function isLoopbackHost(hostname: string) {
	return LOOPBACK_HOSTS.has(hostname);
}

function isLoopbackRequest(request: Request) {
	try {
		const { hostname } = new URL(request.url);
		return isLoopbackHost(hostname);
	} catch {
		return false;
	}
}

function hasLocalSiteUrl() {
	const configuredSiteUrl = process.env.SITE_URL;
	if (!configuredSiteUrl) {
		return false;
	}

	try {
		return isLoopbackHost(new URL(configuredSiteUrl).hostname);
	} catch {
		return false;
	}
}

function authorizeE2ERequest(request: Request) {
	const configuredSecret = process.env.CONVEX_E2E_SECRET;
	if (configuredSecret) {
		const requestSecret = request.headers.get("x-e2e-secret");
		if (requestSecret !== configuredSecret) {
			return { error: unauthorizedResponse("Invalid E2E secret", 403) };
		}
		return { mode: "secret" as const };
	}

	if (hasLocalSiteUrl()) {
		return { mode: "local-site" as const };
	}

	if (isLoopbackRequest(request)) {
		return { mode: "loopback-request" as const };
	}

	return {
		error: unauthorizedResponse(
			"E2E routes require CONVEX_E2E_SECRET or localhost access",
			403
		),
	};
}

async function readJsonBody(
	request: Request
): Promise<Record<string, unknown> | null> {
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return null;
	}

	return (await request.json()) as Record<string, unknown>;
}

interface BootstrapResult {
	conversationIds: {
		abandoned: Id<"conversations">;
		active: Id<"conversations">;
		completed: Id<"conversations">;
		secondary: Id<"conversations">;
	};
	docId: Id<"docs">;
	orgSlug: string;
	projectIds: {
		primary: Id<"projects">;
		secondary: Id<"projects">;
	};
	taskIds: {
		blocked: Id<"tasks">;
		blocker: Id<"tasks">;
		secondary: Id<"tasks">;
	};
	triageItemId: Id<"triageItems">;
}

type RunMutationFn<Args, Result> = (
	mutation: ReturnType<typeof makeFunctionReference>,
	args: Args
) => Promise<Result>;

function runInternalMutation<Args, Result>(
	ctx: ActionCtx,
	path: string,
	args: Args
) {
	const runMutation = ctx.runMutation as unknown as RunMutationFn<Args, Result>;
	return runMutation(makeFunctionReference(path), args);
}

export const seedScenario = internalMutation({
	args: {
		memberEmail: v.string(),
		ownerEmail: v.string(),
		runId: v.string(),
	},
	handler: async (ctx, args): Promise<BootstrapResult> => {
		const owner = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.ownerEmail))
			.unique();
		const member = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", args.memberEmail))
			.unique();

		if (!(owner && member)) {
			throw new Error("E2E users were not created");
		}

		const orgSlug = `${E2E_ORG_SLUG_PREFIX}${args.runId}`;
		const { organizationId } = await insertOrganizationGraph(ctx, {
			createdBy: owner._id,
			name: `E2E Org ${args.runId}`,
			slug: orgSlug,
			userId: owner._id,
		});
		await insertOrganizationMember(ctx, {
			organizationId,
			role: "member",
			userId: member._id,
		});

		const primaryProjectId = await insertProjectGraph(ctx, {
			createdBy: owner._id,
			description: "Seeded E2E project",
			name: `E2E Product ${args.runId}`,
			organizationId,
		});
		const secondaryProjectId = await insertProjectGraph(ctx, {
			createdBy: owner._id,
			description: "Seeded E2E project",
			name: `E2E Ops ${args.runId}`,
			organizationId,
		});

		for (const projectId of [primaryProjectId, secondaryProjectId]) {
			await insertProjectMember(ctx, {
				assignment: {
					eligibleForAssignment: true,
					notesForAI: "Available for seeded tests",
					ownedAreas: ["Frontend"],
					ownedSystems: ["Web"],
					projectRoleLabel: "Owner",
				},
				projectId,
				userId: owner._id,
			});
			await insertProjectMember(ctx, {
				assignment: {
					eligibleForAssignment: true,
					notesForAI: "Limited access",
					ownedAreas: ["Support"],
					ownedSystems: ["Operations"],
					projectRoleLabel: "Member",
				},
				projectId,
				userId: member._id,
			});
		}

		const activeConversationId = await insertConversationGraph(ctx, {
			createdBy: owner._id,
			projectId: primaryProjectId,
			title: `Seeded active conversation ${args.runId}`,
		});
		const completedConversationId = await insertConversationGraph(ctx, {
			createdBy: owner._id,
			projectId: primaryProjectId,
			status: "completed",
			title: `Seeded completed conversation ${args.runId}`,
		});
		const abandonedConversationId = await insertConversationGraph(ctx, {
			createdBy: owner._id,
			projectId: primaryProjectId,
			status: "abandoned",
			title: `Seeded abandoned conversation ${args.runId}`,
		});
		const secondaryConversationId = await insertConversationGraph(ctx, {
			createdBy: owner._id,
			projectId: secondaryProjectId,
			title: `Seeded secondary conversation ${args.runId}`,
		});

		const blockerTaskId = await insertTask(ctx, {
			affectedAreas: ["frontend", "save-flow"],
			assigneeId: owner._id,
			brief: "Fix the flaky save mutation path",
			conversationId: activeConversationId,
			projectId: primaryProjectId,
			risk: "high",
			title: `Seed blocker ${args.runId}`,
			urgency: "high",
		});
		const blockedTaskId = await insertTask(ctx, {
			affectedAreas: ["frontend", "tasks"],
			assigneeId: owner._id,
			brief: "Follow-up task that depends on the blocker",
			conversationId: activeConversationId,
			projectId: primaryProjectId,
			status: "in_progress",
			title: `Seed blocked ${args.runId}`,
			urgency: "medium",
		});
		await insertTaskDependency(ctx, {
			blockedTaskId,
			blockerTaskId,
			projectId: primaryProjectId,
		});
		const secondaryTaskId = await insertTask(ctx, {
			affectedAreas: ["ops"],
			assigneeId: owner._id,
			brief: "Secondary project task for project filtering",
			conversationId: secondaryConversationId,
			projectId: secondaryProjectId,
			title: `Seed secondary ${args.runId}`,
		});

		const docId = await insertDoc(ctx, {
			content: "# Seeded doc\n\nThis document exists for Playwright coverage.",
			createdBy: owner._id,
			projectId: primaryProjectId,
			title: `Seeded Runbook ${args.runId}`,
		});

		const triageItemId = await insertTriageItem(ctx, {
			content: `Seeded triage item ${args.runId}`,
			createdBy: owner._id,
			projectId: primaryProjectId,
		});

		return {
			conversationIds: {
				abandoned: abandonedConversationId,
				active: activeConversationId,
				completed: completedConversationId,
				secondary: secondaryConversationId,
			},
			docId,
			orgSlug,
			projectIds: {
				primary: primaryProjectId,
				secondary: secondaryProjectId,
			},
			taskIds: {
				blocked: blockedTaskId,
				blocker: blockerTaskId,
				secondary: secondaryTaskId,
			},
			triageItemId,
		};
	},
});

async function deleteOrganizationsForUsers(
	ctx: MutationCtx,
	userIds: Set<Id<"users">>
) {
	const organizations = (await ctx.db.query("organizations").collect()).filter(
		(organization) =>
			organization.slug.startsWith(E2E_ORG_SLUG_PREFIX) &&
			userIds.has(organization.createdBy)
	);

	for (const organization of organizations) {
		const projects = await ctx.db
			.query("projects")
			.withIndex("by_organizationId", (q) =>
				q.eq("organizationId", organization._id)
			)
			.collect();

		for (const project of projects) {
			await ctx.runMutation(internal.projects.deleteProjectCascadeInternal, {
				projectId: project._id,
			});
		}

		const [memberships, invites] = await Promise.all([
			ctx.db
				.query("organizationMembers")
				.withIndex("by_organizationId", (q) =>
					q.eq("organizationId", organization._id)
				)
				.collect(),
			ctx.db
				.query("organizationInvites")
				.withIndex("by_organizationId", (q) =>
					q.eq("organizationId", organization._id)
				)
				.collect(),
		]);

		await Promise.all(
			memberships.map((membership) => ctx.db.delete(membership._id))
		);
		await Promise.all(invites.map((invite) => ctx.db.delete(invite._id)));
		await ctx.db.delete(organization._id);
	}
}

export const resetAppData = internalMutation({
	args: {},
	handler: async (ctx) => {
		const users = (await ctx.db.query("users").collect()).filter((user) =>
			user.email.startsWith(E2E_EMAIL_PREFIX)
		);
		const userIds = new Set(users.map((user) => user._id));

		await deleteOrganizationsForUsers(ctx, userIds);

		const [connections, requests, projectMembers] = await Promise.all([
			ctx.db.query("gitConnections").collect(),
			ctx.db.query("gitConnectionRequests").collect(),
			ctx.db.query("projectMembers").collect(),
		]);

		await Promise.all(
			connections
				.filter((connection) => userIds.has(connection.userId))
				.map((connection) => ctx.db.delete(connection._id))
		);
		await Promise.all(
			requests
				.filter((request) => userIds.has(request.userId))
				.map((request) => ctx.db.delete(request._id))
		);
		await Promise.all(
			projectMembers
				.filter((member) => userIds.has(member.userId))
				.map((member) => ctx.db.delete(member._id))
		);
		await Promise.all(users.map((user) => ctx.db.delete(user._id)));

		return { removedUsers: users.length };
	},
});

export const bootstrap = httpAction(async (ctx, request) => {
	const authResult = authorizeE2ERequest(request);
	if (authResult.error) {
		return authResult.error;
	}

	const body = await readJsonBody(request);
	const runId =
		typeof body?.runId === "string" ? body.runId : crypto.randomUUID();
	const ownerEmail = `${E2E_EMAIL_PREFIX}owner-${runId}@example.com`;
	const memberEmail = `${E2E_EMAIL_PREFIX}member-${runId}@example.com`;
	const ownerPassword = `E2EOwner-${runId}`;
	const memberPassword = `E2EMember-${runId}`;

	const auth = createAuth(ctx);
	await auth.api.signUpEmail({
		body: {
			email: ownerEmail,
			name: `E2E Owner ${runId}`,
			password: ownerPassword,
		},
	});
	await auth.api.signUpEmail({
		body: {
			email: memberEmail,
			name: `E2E Member ${runId}`,
			password: memberPassword,
		},
	});

	const scenario = await runInternalMutation<
		{
			memberEmail: string;
			ownerEmail: string;
			runId: string;
		},
		BootstrapResult
	>(ctx, "e2e:seedScenario", {
		memberEmail,
		ownerEmail,
		runId,
	});

	return json({
		member: {
			email: memberEmail,
			name: `E2E Member ${runId}`,
			password: memberPassword,
		},
		owner: {
			email: ownerEmail,
			name: `E2E Owner ${runId}`,
			password: ownerPassword,
		},
		runId,
		scenario,
	});
});

export const reset = httpAction(async (ctx, request) => {
	const authResult = authorizeE2ERequest(request);
	if (authResult.error) {
		return authResult.error;
	}

	const result = await runInternalMutation<
		Record<string, never>,
		{ removedUsers: number }
	>(ctx, "e2e:resetAppData", {});

	return json(result);
});
