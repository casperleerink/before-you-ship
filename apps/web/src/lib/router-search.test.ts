import { expect, test } from "vitest";

import { toggleSearchListValue } from "./router-search";

test("toggleSearchListValue adds and removes values predictably", () => {
	expect(toggleSearchListValue(undefined, "alpha")).toEqual(["alpha"]);
	expect(toggleSearchListValue(["alpha"], "alpha")).toEqual([]);
	expect(toggleSearchListValue(["alpha"], "beta")).toEqual(["alpha", "beta"]);
});
