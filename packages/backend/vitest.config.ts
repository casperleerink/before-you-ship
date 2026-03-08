import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			exclude: [
				"convex/**/*.test.ts",
				"convex/**/_generated/**",
				"convex/test.setup.ts",
				"convex/test/**",
			],
			include: ["convex/**/*.ts"],
			provider: "v8",
		},
		environment: "edge-runtime",
		include: ["convex/**/*.test.ts"],
		server: {
			deps: {
				inline: ["convex-test"],
			},
		},
	},
});
