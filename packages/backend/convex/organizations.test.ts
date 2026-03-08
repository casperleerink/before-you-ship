import { describe, expect, test } from "vitest";
import { createActor, createOrganizationGraph } from "../test/fixtures";
import { api } from "./_generated/api";
import { initConvexTest } from "./test.setup";

describe("organizations", () => {
	test("create creates an owner membership and generated slug", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});

		const { orgId, slug } = await actor.as.mutation(api.organizations.create, {
			name: "Platform Team",
		});

		const state = await t.run(async (ctx) => {
			const organization = await ctx.db.get(orgId);
			const membership = await ctx.db
				.query("organizationMembers")
				.withIndex("by_org_and_user", (q) =>
					q.eq("organizationId", orgId).eq("userId", actor.appUser._id)
				)
				.unique();
			return { membership, organization };
		});

		expect(slug).toBe("platform-team");
		expect(state.organization).toMatchObject({ name: "Platform Team", slug });
		expect(state.membership).toMatchObject({ role: "owner" });
	});

	test("update trims the new name and regenerates the slug", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "owner@example.com",
			name: "Owner",
		});
		const { organizationId } = await createOrganizationGraph(t, actor, {
			name: "Acme",
			slug: "acme",
		});

		const updated = await actor.as.mutation(api.organizations.update, {
			name: "  Product Operations  ",
			orgId: organizationId,
		});

		const organization = await t.run((ctx) => ctx.db.get(organizationId));

		expect(updated).toEqual({
			name: "Product Operations",
			slug: "product-operations",
		});
		expect(organization).toMatchObject(updated);
	});

	test("update rejects non-owner members", async () => {
		const t = initConvexTest();
		const actor = await createActor(t, {
			email: "member@example.com",
			name: "Member",
		});
		const { organizationId } = await createOrganizationGraph(t, actor, {
			role: "member",
		});

		await expect(
			actor.as.mutation(api.organizations.update, {
				name: "Renamed",
				orgId: organizationId,
			})
		).rejects.toThrow("Only owners can rename organizations");
	});
});
