import { internalMutation } from "./_generated/server";
import { generateUniqueSlug } from "./slugUtils";

export const backfillSlugs = internalMutation({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db.query("organizations").collect();
		let patched = 0;

		for (const org of orgs) {
			if (!org.slug) {
				const slug = await generateUniqueSlug(ctx, org.name);
				await ctx.db.patch(org._id, { slug });
				patched++;
			}
		}

		return { patched, total: orgs.length };
	},
});
