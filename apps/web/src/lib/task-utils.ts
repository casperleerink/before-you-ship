import type { Doc } from "@project-manager/backend/convex/_generated/dataModel";
import type { BadgeVariant } from "@/components/ui/badge";

export type TaskStatus = Doc<"tasks">["status"];
export type TaskLevel = Doc<"tasks">["risk"];

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

export function levelVariant(level: TaskLevel): BadgeVariant {
	switch (level) {
		case "low":
			return "secondary";
		case "medium":
			return "outline";
		case "high":
			return "destructive";
		default:
			return "outline";
	}
}
