import type { QueryCtx } from "./_generated/server";

const RESERVED_SLUGS = new Set([
	"ai",
	"dashboard",
	"sign-in",
	"sign-up",
	"api",
	"admin",
	"settings",
	"organizations",
]);

export function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

export async function generateUniqueSlug(
	ctx: QueryCtx,
	name: string
): Promise<string> {
	const base = slugify(name) || "org";

	if (!RESERVED_SLUGS.has(base)) {
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", base))
			.first();
		if (!existing) {
			return base;
		}
	}

	for (let i = 2; i <= 100; i++) {
		const candidate = `${base}-${i}`;
		const existing = await ctx.db
			.query("organizations")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.first();
		if (!existing) {
			return candidate;
		}
	}

	return `${base}-${Date.now()}`;
}
