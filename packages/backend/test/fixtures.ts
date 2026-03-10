import type { Doc, Id } from "../convex/_generated/dataModel";
import { authComponent } from "../convex/auth";
import type { AppTestConvex } from "../convex/test.setup";
import {
	insertConversationGraph,
	insertOrganizationGraph,
	insertPlan,
	insertProjectGraph,
	insertTask,
	insertTaskDependency,
	insertTriageItem,
} from "../convex/testGraphs";

interface ActorInput {
	email: string;
	image?: string;
	name: string;
}

interface OrganizationGraphInput {
	name?: string;
	role?: Doc<"organizationMembers">["role"];
	slug?: string;
}

type ProjectGraphInput = OrganizationGraphInput & {
	description?: string;
	name?: string;
	repoProvider?: Doc<"projects">["repoProvider"];
	repoUrl?: string;
};

type ConversationGraphInput = ProjectGraphInput & {
	status?: Doc<"conversations">["status"];
	title?: string;
};

export interface TestActor {
	appUser: Doc<"users">;
	as: ReturnType<AppTestConvex["withIdentity"]>;
	authUserId: string;
	sessionId: string;
}

export async function createActor(
	t: AppTestConvex,
	{ email, image, name }: ActorInput
): Promise<TestActor> {
	const { appUser, authUserId, sessionId } = await t.run(async (ctx) => {
		const adapter = authComponent.adapter(ctx)({});
		const now = Date.now();

		const authUser = await adapter.create({
			data: {
				createdAt: now,
				email,
				emailVerified: true,
				image,
				name,
				updatedAt: now,
			},
			model: "user",
		});

		const session = await adapter.create({
			data: {
				createdAt: now,
				expiresAt: now + 60_000,
				ipAddress: "127.0.0.1",
				token: `token_${crypto.randomUUID()}`,
				updatedAt: now,
				userAgent: "vitest",
				userId: authUser.id,
			},
			model: "session",
		});

		const createdUser = await ctx.db
			.query("users")
			.withIndex("by_betterAuthId", (q) => q.eq("betterAuthId", authUser.id))
			.first();

		if (!createdUser) {
			throw new Error("App user was not created");
		}

		return {
			appUser: createdUser,
			authUserId: authUser.id,
			sessionId: session.id,
		};
	});

	return {
		appUser,
		as: t.withIdentity({
			issuer: "https://tests.local",
			sessionId,
			subject: authUserId,
			tokenIdentifier: `test|${authUserId}`,
		}),
		authUserId,
		sessionId,
	};
}

export function createOrganizationGraph(
	t: AppTestConvex,
	actor: TestActor,
	{ name = "Acme", role = "owner", slug = "acme" }: OrganizationGraphInput = {}
) {
	return t.run((ctx) => {
		return insertOrganizationGraph(ctx, {
			createdBy: actor.appUser._id,
			name,
			role,
			slug,
			userId: actor.appUser._id,
		});
	});
}

export async function createProjectGraph(
	t: AppTestConvex,
	actor: TestActor,
	{
		description = "Test project",
		name = "Project Alpha",
		repoProvider,
		repoUrl,
		...organization
	}: ProjectGraphInput = {}
) {
	const { organizationId } = await createOrganizationGraph(
		t,
		actor,
		organization
	);

	return t.run(async (ctx) => {
		const projectId = await insertProjectGraph(ctx, {
			createdBy: actor.appUser._id,
			description,
			name,
			organizationId,
			repoProvider,
			repoUrl,
		});

		return { organizationId, projectId };
	});
}

export async function createConversationGraph(
	t: AppTestConvex,
	actor: TestActor,
	{
		status = "active",
		title = "Conversation",
		...project
	}: ConversationGraphInput = {}
) {
	const { organizationId, projectId } = await createProjectGraph(
		t,
		actor,
		project
	);

	return t.run(async (ctx) => {
		const conversationId = await insertConversationGraph(ctx, {
			createdBy: actor.appUser._id,
			projectId,
			status,
			title,
		});

		return { conversationId, organizationId, projectId };
	});
}

export function createTriageItem(
	t: AppTestConvex,
	actor: TestActor,
	projectId: Id<"projects">,
	content = "Investigate flaky behavior"
) {
	return t.run((ctx) => {
		return insertTriageItem(ctx, {
			content,
			createdBy: actor.appUser._id,
			projectId,
		});
	});
}

export function createTask(
	t: AppTestConvex,
	_actor: TestActor,
	{
		assigneeId,
		conversationId,
		projectId,
		risk = "low",
		status = "ready",
		title = "Investigate tests",
		urgency = "medium",
	}: {
		assigneeId?: Id<"users">;
		conversationId: Id<"conversations">;
		projectId: Id<"projects">;
		risk?: Doc<"tasks">["risk"];
		status?: Doc<"tasks">["status"];
		title?: string;
		urgency?: "low" | "medium" | "high";
	}
) {
	return t.run((ctx) => {
		return insertTask(ctx, {
			assigneeId,
			conversationId,
			projectId,
			risk,
			status,
			title,
			urgency,
		});
	});
}

export function createPlan(
	t: AppTestConvex,
	{
		conversationId,
		projectId,
	}: {
		conversationId: Id<"conversations">;
		projectId: Id<"projects">;
	}
) {
	return t.run((ctx) => {
		return insertPlan(ctx, {
			conversationId,
			projectId,
		});
	});
}

export function createTaskDependency(
	t: AppTestConvex,
	{
		blockedTaskId,
		blockerTaskId,
		projectId,
		state = "active",
	}: {
		blockedTaskId: Id<"tasks">;
		blockerTaskId: Id<"tasks">;
		projectId: Id<"projects">;
		state?: "active" | "dismissed";
	}
) {
	return t.run((ctx) => {
		return insertTaskDependency(ctx, {
			blockedTaskId,
			blockerTaskId,
			projectId,
			state,
		});
	});
}

export function scheduledJobNames(t: AppTestConvex) {
	return t.run(async (ctx) => {
		const jobs = await ctx.db.system.query("_scheduled_functions").collect();
		return jobs.map((job) => job.name).sort();
	});
}
