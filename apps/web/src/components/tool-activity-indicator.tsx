import { Loader2 } from "lucide-react";

const TOOL_LABELS: Record<string, { active: string; done: string }> = {
	searchTasks: {
		active: "Searching tasks...",
		done: "Searched tasks",
	},
	searchDocs: {
		active: "Searching documentation...",
		done: "Searched documentation",
	},
	listFiles: {
		active: "Analyzing codebase...",
		done: "Analyzed file tree",
	},
	readFile: {
		active: "Analyzing codebase...",
		done: "Read file",
	},
	searchCode: {
		active: "Analyzing codebase...",
		done: "Searched codebase",
	},
	createTask: {
		active: "Creating task...",
		done: "Created task",
	},
	updateTask: {
		active: "Updating task...",
		done: "Updated task",
	},
	createDoc: {
		active: "Writing document...",
		done: "Created document",
	},
};

const DEFAULT_LABEL = { active: "Processing...", done: "Done" } as const;

function getLabel(toolName: string) {
	return TOOL_LABELS[toolName] ?? DEFAULT_LABEL;
}

export function ToolActivityIndicator({
	toolName,
	state,
}: {
	toolName: string;
	state: string;
}) {
	const isActive = state !== "output-available" && state !== "output-error";
	const label = getLabel(toolName);

	return (
		<div className="flex items-center gap-2 py-1 text-muted-foreground text-sm">
			{isActive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
			<span>{isActive ? label.active : label.done}</span>
		</div>
	);
}
