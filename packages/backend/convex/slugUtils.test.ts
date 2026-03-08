import { describe, expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";

import { generateUniqueSlug, slugify } from "./slugUtils";
import { initConvexTest } from "./test.setup";

describe("slugUtils", () => {
	test("slugify normalizes punctuation and trims length", () => {
		expect(slugify("  Hello, World!  ")).toBe("hello-world");
		expect(slugify("A".repeat(60))).toHaveLength(48);
	});

	test("generateUniqueSlug skips reserved slugs and collisions", async () => {
		const t = initConvexTest();

		const slug = await t.run(async (ctx) => {
			const fakeUserId = "10000;users" as Id<"users">;
			await ctx.db.insert("organizations", {
				createdAt: Date.now(),
				createdBy: fakeUserId,
				name: "Acme",
				slug: "acme",
			});
			await ctx.db.insert("organizations", {
				createdAt: Date.now(),
				createdBy: fakeUserId,
				name: "Acme Two",
				slug: "acme-2",
			});

			const reserved = await generateUniqueSlug(ctx, "AI");
			const collision = await generateUniqueSlug(ctx, "Acme");
			return { collision, reserved };
		});

		expect(slug.reserved).toBe("ai-2");
		expect(slug.collision).toBe("acme-3");
	});
});
