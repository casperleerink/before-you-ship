import { expect, test } from "vitest";

import {
	buildProjectTasksSearch,
	statusLabel,
	statusVariant,
} from "./task-utils";

test("task status helpers map known statuses to UI labels and variants", () => {
	expect(statusLabel("in_progress")).toBe("In Progress");
	expect(statusVariant("ready")).toBe("outline");
	expect(statusVariant("done")).toBe("secondary");
});

test("project task search can deep-link to a selected task while resetting filters", () => {
	expect(buildProjectTasksSearch("task_123")).toEqual({
		complexity: [],
		effort: [],
		risk: [],
		status: [],
		taskId: "task_123",
	});
});
