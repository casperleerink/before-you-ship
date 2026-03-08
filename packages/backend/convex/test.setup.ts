import agentTest from "@convex-dev/agent/test";
import betterAuthTest from "@convex-dev/better-auth/test";
import { convexTest, type TestConvex } from "convex-test";

import schema from "./schema";

type ImportMetaWithGlob = ImportMeta & {
	glob(pattern: string): Record<string, () => Promise<unknown>>;
};

export const modules = (import.meta as ImportMetaWithGlob).glob(
	"./**/!(*.*.*)*.*s"
);

export type AppTestConvex = TestConvex<typeof schema>;

export function initConvexTest(): AppTestConvex {
	process.env.CONVEX_SITE_URL ??= "https://tests.local";
	process.env.SITE_URL ??= "https://tests.local";

	const t = convexTest(schema, modules);
	agentTest.register(t);
	betterAuthTest.register(t);
	return t;
}
