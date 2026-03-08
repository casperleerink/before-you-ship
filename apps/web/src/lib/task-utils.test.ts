import { expect, test } from "vitest";

import { statusLabel, statusVariant } from "./task-utils";

test("task status helpers map known statuses to UI labels and variants", () => {
	expect(statusLabel("in_progress")).toBe("In Progress");
	expect(statusVariant("ready")).toBe("outline");
	expect(statusVariant("done")).toBe("secondary");
});
