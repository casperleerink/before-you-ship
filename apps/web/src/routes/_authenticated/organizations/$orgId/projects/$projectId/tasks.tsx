import { createFileRoute } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";

import EmptyState from "@/components/empty-state";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/tasks"
)({
	component: TasksPage,
});

function TasksPage() {
	return (
		<div className="p-6">
			<h1 className="mb-4 font-bold text-2xl">Tasks</h1>
			<EmptyState
				description="Tasks are created from approved conversation plans."
				icon={ListTodo}
				title="No tasks yet"
			/>
		</div>
	);
}
