import type { Doc } from "@project-manager/backend/convex/_generated/dataModel";
import type { BadgeVariant } from "@/components/ui/badge";

export type TaskStatus = Doc<"tasks">["status"];
export type TaskLevel = Doc<"tasks">["risk"];
export type TaskUrgency = Doc<"tasks">["urgency"];

export const TASK_STATUS_VALUES = ["ready", "in_progress", "done"] as const;
export const TASK_LEVEL_VALUES = ["low", "medium", "high"] as const;
export const TASK_URGENCY_VALUES = ["low", "medium", "high"] as const;

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
	{ value: "ready", label: "Ready" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "done", label: "Done" },
];

export const LEVEL_OPTIONS: { value: TaskLevel; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

export const URGENCY_OPTIONS: { value: TaskUrgency; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

export function statusVariant(status: TaskStatus): BadgeVariant {
	switch (status) {
		case "ready":
			return "outline";
		case "in_progress":
			return "default";
		case "done":
			return "secondary";
		default:
			return "outline";
	}
}

export function statusLabel(status: TaskStatus): string {
	return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
}

export function urgencyVariant(urgency: TaskUrgency): BadgeVariant {
	switch (urgency) {
		case "high":
			return "destructive";
		case "medium":
			return "default";
		default:
			return "secondary";
	}
}

export function urgencyLabel(urgency: TaskUrgency): string {
	return URGENCY_OPTIONS.find((opt) => opt.value === urgency)?.label ?? urgency;
}

export function buildProjectTasksSearch(taskId?: string) {
	return {
		complexity: [],
		effort: [],
		risk: [],
		status: [],
		taskId,
	};
}
