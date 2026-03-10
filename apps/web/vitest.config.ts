import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			coverage: {
				exclude: ["src/**/*.test.ts"],
				include: [
					"src/features/**/*.ts",
					"src/lib/conversation-utils.ts",
					"src/lib/form-schemas.ts",
					"src/lib/list-input.ts",
					"src/lib/router-search.ts",
					"src/lib/task-utils.ts",
					"src/lib/utils.ts",
				],
				thresholds: {
					branches: 80,
					functions: 90,
					lines: 90,
					statements: 90,
				},
				provider: "v8",
			},
			environment: "node",
			include: ["src/features/**/*.test.ts", "src/lib/**/*.test.ts"],
		},
	})
);
