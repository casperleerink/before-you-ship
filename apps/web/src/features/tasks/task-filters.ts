import type { TaskLevel, TaskStatus } from "@/lib/task-utils";

interface TaskLike {
	_id: string;
	affectedAreas: readonly string[];
	brief: string;
	complexity: TaskLevel;
	effort: TaskLevel;
	risk: TaskLevel;
	status: TaskStatus;
	title: string;
}

export interface TaskFilterState {
	complexityFilter: Set<TaskLevel>;
	effortFilter: Set<TaskLevel>;
	riskFilter: Set<TaskLevel>;
	searchQuery: string;
	statusFilter: Set<TaskStatus>;
}

export interface TaskSearchState {
	complexity?: TaskLevel[];
	effort?: TaskLevel[];
	q?: string;
	risk?: TaskLevel[];
	status?: TaskStatus[];
	taskId?: string;
}

export function normalizeTaskSearchQuery(query?: string) {
	return query?.trim().toLowerCase() ?? "";
}

export function createTaskFilterState(
	search: TaskSearchState
): TaskFilterState {
	return {
		complexityFilter: new Set<TaskLevel>(search.complexity ?? []),
		effortFilter: new Set<TaskLevel>(search.effort ?? []),
		riskFilter: new Set<TaskLevel>(search.risk ?? []),
		searchQuery: normalizeTaskSearchQuery(search.q),
		statusFilter: new Set<TaskStatus>(search.status ?? []),
	};
}

export function countActiveTaskFilters(filters: TaskFilterState) {
	return (
		filters.statusFilter.size +
		filters.riskFilter.size +
		filters.complexityFilter.size +
		filters.effortFilter.size +
		(filters.searchQuery ? 1 : 0)
	);
}

export function matchesTaskFilters(task: TaskLike, filters: TaskFilterState) {
	if (filters.statusFilter.size > 0 && !filters.statusFilter.has(task.status)) {
		return false;
	}
	if (filters.riskFilter.size > 0 && !filters.riskFilter.has(task.risk)) {
		return false;
	}
	if (
		filters.complexityFilter.size > 0 &&
		!filters.complexityFilter.has(task.complexity)
	) {
		return false;
	}
	if (filters.effortFilter.size > 0 && !filters.effortFilter.has(task.effort)) {
		return false;
	}
	if (!filters.searchQuery) {
		return true;
	}

	const searchableText = [task.title, task.brief, ...task.affectedAreas]
		.join(" ")
		.toLowerCase();
	return searchableText.includes(filters.searchQuery);
}

export function filterTasks<T extends TaskLike>(
	tasks: T[] | undefined,
	search: TaskSearchState
) {
	if (!tasks) {
		return [];
	}

	const filters = createTaskFilterState(search);
	return tasks.filter((task) => matchesTaskFilters(task, filters));
}

export function findSelectedTask<T extends { _id: string }>(
	tasks: T[] | undefined,
	taskId?: string
) {
	if (!(tasks && taskId)) {
		return null;
	}

	return tasks.find((task) => task._id === taskId) ?? null;
}
