import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
	testDir: "./e2e",
	expect: {
		timeout: 10_000,
	},
	forbidOnly: Boolean(process.env.CI),
	fullyParallel: false,
	globalSetup: "./e2e/global-setup.ts",
	outputDir: "./test-results",
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }]]
		: [["list"], ["html", { open: "never" }]],
	retries: process.env.CI ? 1 : 0,
	testMatch: "*.spec.ts",
	timeout: 60_000,
	use: {
		baseURL,
		screenshot: "only-on-failure",
		storageState: "./e2e/.auth/owner.json",
		trace: "retain-on-failure",
		video: "retain-on-failure",
	},
	webServer: {
		command: "bun run dev",
		cwd: repoRoot,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		url: `${baseURL}/sign-in`,
	},
	workers: 1,
});
