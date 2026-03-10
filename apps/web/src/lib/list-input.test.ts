import { expect, test } from "vitest";

import { parseListInput, stringifyListInput } from "./list-input";

test("parses comma-separated input into a trimmed list", () => {
	expect(parseListInput(" api, frontend , , ux ")).toEqual([
		"api",
		"frontend",
		"ux",
	]);
});

test("stringifies list input predictably", () => {
	expect(stringifyListInput(["api", "frontend"])).toBe("api, frontend");
	expect(stringifyListInput()).toBe("");
});
