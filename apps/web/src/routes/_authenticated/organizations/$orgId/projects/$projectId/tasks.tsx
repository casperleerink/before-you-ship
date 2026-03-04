import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, ListTodo } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
			{children}
		</span>
	);
}

function BadgeField({
	label,
	value,
	variant,
}: {
	label: string;
	value: string;
	variant: BadgeVariant;
}) {
	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>{label}</FieldLabel>
			<Badge variant={variant}>{value}</Badge>
		</div>
	);
}

function TaskDetailSheet({
	task,
	onClose,
}: {
	task: Doc<"tasks">;
	onClose: () => void;
}) {
	const { orgId, projectId } = Route.useParams();
	const navigate = useNavigate();

	return (
		<SheetContent>
			<SheetHeader>
				<SheetTitle>{task.title}</SheetTitle>
			</SheetHeader>
			<SheetBody>
				<div className="flex flex-col gap-6">
					<div className="grid grid-cols-3 gap-4">
						<BadgeField
							label="Status"
							value={statusLabel(task.status)}
							variant={statusVariant(task.status)}
						/>
						<BadgeField
							label="Risk"
							value={task.risk}
							variant={levelVariant(task.risk)}
						/>
						<BadgeField
							label="Complexity"
							value={task.complexity}
							variant={levelVariant(task.complexity)}
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<BadgeField
							label="Effort"
							value={task.effort}
							variant={levelVariant(task.effort)}
						/>
					</div>

					{task.affectedAreas.length > 0 && (
						<div className="flex flex-col gap-2">
							<FieldLabel>Affected Areas</FieldLabel>
							<div className="flex flex-wrap gap-1.5">
								{task.affectedAreas.map((area) => (
									<Badge key={area} variant="secondary">
										{area}
									</Badge>
								))}
							</div>
						</div>
					)}

					{task.brief && (
						<div className="flex flex-col gap-2">
							<FieldLabel>Brief</FieldLabel>
							<div className="prose prose-sm max-w-none rounded-md border bg-muted/50 p-4 text-sm">
								<Streamdown>{task.brief}</Streamdown>
							</div>
						</div>
					)}

					<div className="flex flex-col gap-2">
						<FieldLabel>Origin Conversation</FieldLabel>
						<Button
							className="w-fit"
							onClick={() => {
								onClose();
								navigate({
									to: "/organizations/$orgId/projects/$projectId/conversations/$conversationId",
									params: {
										orgId,
										projectId,
										conversationId: task.conversationId,
									},
								});
							}}
							variant="outline"
						>
							View Conversation
							<ArrowRight className="ml-1 size-4" />
						</Button>
					</div>
				</div>
			</SheetBody>
		</SheetContent>
	);
}

function TasksPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const tasks = useQuery(api.tasks.list, { projectId });
	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
		null
	);

	if (tasks === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const selectedTask = selectedTaskId
		? tasks.find((t) => t._id === selectedTaskId)
		: null;

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
								<TableRow
									className="cursor-pointer"
									key={task._id}
									onClick={() => setSelectedTaskId(task._id)}
								>
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

			<Sheet
				onOpenChange={(open) => {
					if (!open) {
						setSelectedTaskId(null);
					}
				}}
				open={selectedTaskId !== null}
			>
				{selectedTask && (
					<TaskDetailSheet
						onClose={() => setSelectedTaskId(null)}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</div>
	);
}
