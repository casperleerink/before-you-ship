import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			coverage: {
				exclude: ["src/**/*.test.ts"],
				include: ["src/lib/**/*.ts"],
				provider: "v8",
			},
			environment: "node",
			include: ["src/lib/**/*.test.ts"],
		},
	})
);
