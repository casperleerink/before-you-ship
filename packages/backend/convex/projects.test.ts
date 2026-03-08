import { describe, expect, test } from "vitest";
import { createActor, createProjectGraph } from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("projects", () => {
	test("list and getById only return projects to organization members", async () => {
		const t = initConvexTest();
		const owner = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const stranger = await createActor(t, {
			email: "stranger@example.com",
			name: "Stranger",
		});
		const { organizationId, projectId } = await createProjectGraph(t, owner, {
			name: "Roadmap",
		});

		const [anonymousList, strangerList, memberList] = await Promise.all([
			t.query(api.projects.list, { orgId: organizationId }),
			stranger.as.query(api.projects.list, { orgId: organizationId }),
			owner.as.query(api.projects.list, { orgId: organizationId }),
		]);

		const [anonymousProject, strangerProject, memberProject] =
			await Promise.all([
				t.query(api.projects.getById, { projectId }),
				stranger.as.query(api.projects.getById, { projectId }),
				owner.as.query(api.projects.getById, { projectId }),
			]);

		expect(anonymousList).toEqual([]);
		expect(strangerList).toEqual([]);
		expect(memberList).toHaveLength(1);
		expect(memberList[0]).toMatchObject({ _id: projectId, name: "Roadmap" });

		expect(anonymousProject).toBeNull();
		expect(strangerProject).toBeNull();
		expect(memberProject).toMatchObject({ _id: projectId, name: "Roadmap" });
	});

	test("assignment candidate queries only include eligible project members", async () => {
		const t = initConvexTest();
		const owner = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const eligible = await createActor(t, {
			email: "eligible@example.com",
			name: "Eligible",
		});
		const unavailable = await createActor(t, {
			email: "unavailable@example.com",
			name: "Unavailable",
		});
		const { organizationId, projectId } = await createProjectGraph(t, owner);

		await t.run(async (ctx) => {
			await ctx.db.insert("organizationMembers", {
				joinedAt: Date.now(),
				organizationId,
				profile: {
					assignmentEnabled: true,
					availabilityStatus: "available",
					avoids: [],
					ownedDomains: ["Checkout"],
					preferredTaskTypes: ["UI"],
					strengths: ["React"],
				},
				role: "member",
				userId: eligible.appUser._id,
			});
			await ctx.db.insert("organizationMembers", {
				joinedAt: Date.now(),
				organizationId,
				profile: {
					assignmentEnabled: true,
					availabilityStatus: "unavailable",
					avoids: [],
					ownedDomains: ["Billing"],
					preferredTaskTypes: ["Backend"],
					strengths: ["Node"],
				},
				role: "member",
				userId: unavailable.appUser._id,
			});
		});

		await owner.as.mutation(api.projects.upsertProjectMember, {
			assignment: {
				eligibleForAssignment: true,
				ownedAreas: ["Checkout page"],
				ownedSystems: ["web-checkout"],
				projectRoleLabel: "Frontend owner",
			},
			projectId,
			userId: eligible.appUser._id,
		});
		await owner.as.mutation(api.projects.upsertProjectMember, {
			assignment: {
				eligibleForAssignment: true,
				ownedAreas: ["Billing"],
				ownedSystems: ["billing-service"],
				projectRoleLabel: "Billing owner",
			},
			projectId,
			userId: unavailable.appUser._id,
		});

		const [projectMembers, candidates] = await Promise.all([
			owner.as.query(api.projects.listProjectMembersForAssignment, {
				projectId,
			}),
			owner.as.query(api.projects.listAssignmentCandidates, { projectId }),
		]);

		expect(projectMembers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					_id: eligible.appUser._id,
					isEligibleForAssignment: true,
				}),
				expect.objectContaining({
					_id: unavailable.appUser._id,
					isEligibleForAssignment: false,
				}),
			])
		);
		expect(candidates).toEqual([
			{
				_id: eligible.appUser._id,
				name: "Eligible",
			},
		]);
	});
});
