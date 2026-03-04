import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ListTodo } from "lucide-react";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/tasks"
)({
	component: TasksPage,
});

function statusVariant(status: Doc<"tasks">["status"]) {
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

function statusLabel(status: Doc<"tasks">["status"]) {
	switch (status) {
		case "ready":
			return "Ready";
		case "in_progress":
			return "In Progress";
		case "done":
			return "Done";
		default:
			return status;
	}
}

function levelVariant(level: Doc<"tasks">["risk"]) {
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

function TasksPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const tasks = useQuery(api.tasks.list, { projectId });

	if (tasks === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Tasks</h1>
			</div>

			{tasks.length === 0 ? (
				<EmptyState
					description="Tasks are created from approved conversation plans."
					icon={ListTodo}
					title="No tasks yet"
				/>
			) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Title</TableHead>
								<TableHead className="w-[100px]">Status</TableHead>
								<TableHead className="w-[80px]">Risk</TableHead>
								<TableHead className="w-[100px]">Complexity</TableHead>
								<TableHead className="w-[80px]">Effort</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tasks.map((task) => (
								<TableRow key={task._id}>
									<TableCell className="font-medium">{task.title}</TableCell>
									<TableCell>
										<Badge variant={statusVariant(task.status)}>
											{statusLabel(task.status)}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={levelVariant(task.risk)}>{task.risk}</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={levelVariant(task.complexity)}>
											{task.complexity}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant={levelVariant(task.effort)}>
											{task.effort}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
