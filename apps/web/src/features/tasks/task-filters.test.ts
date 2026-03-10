import { expect, test } from "vitest";

import {
	countActiveTaskFilters,
	createTaskFilterState,
	filterTasks,
	findSelectedTask,
	matchesTaskFilters,
	normalizeTaskSearchQuery,
} from "./task-filters";

const tasks = [
	{
		_id: "task_alpha",
		affectedAreas: ["frontend", "ux"],
		assigneeId: undefined,
		brief: "Investigate flaky save behavior",
		complexity: "medium",
		conversationId: "conversation_1",
		createdAt: 1,
		effort: "medium",
		projectId: "project_1",
		risk: "high",
		status: "ready",
		title: "Fix save button",
		urgency: "high",
	},
	{
		_id: "task_beta",
		affectedAreas: ["backend"],
		assigneeId: undefined,
		brief: "Queue recalculation cleanup",
		complexity: "low",
		conversationId: "conversation_1",
		createdAt: 2,
		effort: "low",
		projectId: "project_1",
		risk: "low",
		status: "done",
		title: "Rebuild queue scoring",
		urgency: "medium",
	},
] as const;

test("normalizes task search query input", () => {
	expect(normalizeTaskSearchQuery("  Save Button  ")).toBe("save button");
	expect(normalizeTaskSearchQuery()).toBe("");
});

test("counts active task filters across all filter groups", () => {
	const filters = createTaskFilterState({
		complexity: ["medium"],
		q: " save ",
		risk: ["high"],
		status: ["ready"],
	});

	expect(countActiveTaskFilters(filters)).toBe(4);
});

test("matches task filters using intersection semantics", () => {
	const filters = createTaskFilterState({
		complexity: ["medium"],
		q: "frontend",
		risk: ["high"],
		status: ["ready"],
	});

	expect(matchesTaskFilters(tasks[0], filters)).toBe(true);
	expect(matchesTaskFilters(tasks[1], filters)).toBe(false);
});

test("filters tasks and keeps empty queries non-restrictive", () => {
	expect(filterTasks([...tasks], { q: "   " })).toEqual(tasks);
	expect(filterTasks([...tasks], { q: "queue" })).toEqual([tasks[1]]);
});

test("finds selected task from search state and self-heals invalid ids", () => {
	expect(findSelectedTask([...tasks], "task_alpha")).toEqual(tasks[0]);
	expect(findSelectedTask([...tasks], "task_missing")).toBeNull();
	expect(findSelectedTask(undefined, "task_alpha")).toBeNull();
});
