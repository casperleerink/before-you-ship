import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, ListTodo, X, Zap } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import { ProjectDot } from "@/components/project-dot";
import { TaskQueueSkeleton } from "@/components/skeletons";
import { TaskDependencySection } from "@/components/task-dependency-section";
import {
	FieldLabel,
	FilterDropdown,
	LevelBadgeField,
	StatusDropdown,
	UrgencyDropdown,
} from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { findSelectedTask } from "@/features/tasks/task-filters";
import { useAppMutation } from "@/lib/convex-mutation";
import { toggleSearchListValue } from "@/lib/router-search";
import type { TaskStatus, TaskUrgency } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

type RankedTask = Doc<"tasks"> & {
	blockedBy: Array<{
		assigneeId?: Id<"users">;
		assigneeName?: string;
		status: TaskStatus;
		taskId: Id<"tasks">;
		title: string;
	}>;
	blocksMyTasksCount: number;
	isBlocked: boolean;
	projectName: string;
	rank: number;
	rankReasons: string[];
};

function StatusAccent({ task }: { task: RankedTask }) {
	if (task.isBlocked) {
		return (
			<span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-red-500" />
		);
	}
	if (task.status === "in_progress") {
		return (
			<span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-blue-500" />
		);
	}
	return (
		<span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-border" />
	);
}

function TaskCardStatusLabel({ task }: { task: RankedTask }) {
	if (task.isBlocked) {
		return (
			<span className="shrink-0 font-medium text-red-500 text-xs">Blocked</span>
		);
	}
	if (task.status === "done") {
		return (
			<span className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
				<Check className="size-3" />
				Done
			</span>
		);
	}
	return null;
}

function TaskCardUrgency({ urgency }: { urgency: RankedTask["urgency"] }) {
	if (urgency === "low") {
		return null;
	}
	return (
		<span
			className={cn(
				"flex shrink-0 items-center gap-1 text-xs",
				urgency === "high" ? "text-red-500" : "text-muted-foreground"
			)}
		>
			<Zap className="size-3" />
			{urgency === "high" ? "High" : "Medium"}
		</span>
	);
}

function TaskCardAreas({ areas }: { areas: string[] }) {
	if (areas.length === 0) {
		return null;
	}
	return (
		<>
			{areas.map((area) => (
				<Badge
					className="shrink-0 text-[0.65rem]"
					key={area}
					variant="secondary"
				>
					{area}
				</Badge>
			))}
		</>
	);
}

function TaskCard({
	task,
	onClick,
}: {
	task: RankedTask;
	onClick: () => void;
}) {
	const isDone = task.status === "done";

	return (
		<button
			className={cn(
				"relative flex w-full flex-col gap-2 rounded-xl border p-4 pl-5 text-left transition-colors hover:bg-accent/30",
				isDone && "opacity-60"
			)}
			onClick={onClick}
			type="button"
		>
			<StatusAccent task={task} />

			<div className="flex items-center gap-2">
				<ProjectDot name={task.projectName} />
				<span
					className={cn(
						"min-w-0 shrink truncate font-medium",
						isDone && "line-through decoration-muted-foreground/50"
					)}
				>
					{task.title}
				</span>
				<TaskCardAreas areas={task.affectedAreas} />
				<span className="flex-1" />
				<TaskCardStatusLabel task={task} />
				<TaskCardUrgency urgency={task.urgency} />
			</div>

			<p className="line-clamp-1 text-muted-foreground text-sm">{task.brief}</p>
		</button>
	);
}

function TaskDetailSheet({
	task,
	orgSlug,
	onClose,
}: {
	task: RankedTask;
	orgSlug: string;
	onClose: () => void;
}) {
	const navigate = useNavigate();
	const { mutate: updateTask } = useAppMutation(api.tasks.update);

	const handleStatusChange = (status: TaskStatus) => {
		updateTask({ status, taskId: task._id });
	};

	const handleUrgencyChange = (urgency: TaskUrgency) => {
		updateTask({ taskId: task._id, urgency });
	};

	return (
		<SheetContent>
			<SheetHeader>
				<SheetTitle>{task.title}</SheetTitle>
			</SheetHeader>
			<SheetBody>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col gap-1">
						<FieldLabel>Project</FieldLabel>
						<div className="flex items-center gap-2">
							<ProjectDot name={task.projectName} />
							<span className="text-sm">{task.projectName}</span>
						</div>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<StatusDropdown
							onStatusChange={handleStatusChange}
							status={task.status}
						/>
						<UrgencyDropdown
							onUrgencyChange={handleUrgencyChange}
							urgency={task.urgency}
						/>
						<LevelBadgeField level={task.risk} type="risk" />
					</div>

					<div className="grid grid-cols-2 gap-4">
						<LevelBadgeField level={task.complexity} type="complexity" />
						<LevelBadgeField level={task.effort} type="effort" />
					</div>

					<TaskDependencySection taskId={task._id} />

					<div className="flex flex-col gap-2">
						<FieldLabel>Queue Reasoning</FieldLabel>
						<div className="flex flex-wrap gap-1.5">
							{task.rankReasons.map((reason) => (
								<Badge key={reason} variant="secondary">
									{reason}
								</Badge>
							))}
						</div>
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
									params: {
										conversationId: task.conversationId,
										orgSlug,
										projectId: task.projectId,
									},
									to: "/$orgSlug/projects/$projectId/conversations/$conversationId",
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

export function MyTasksTab({
	orgId,
	orgSlug,
	projectFilter,
	taskId,
	onSearchChange,
}: {
	orgId: Id<"organizations">;
	orgSlug: string;
	projectFilter: string[];
	taskId?: string;
	onSearchChange: (update: { project?: string[]; taskId?: string }) => void;
}) {
	const { data: tasks } = useQuery(
		convexQuery(api.tasks.listMyRankedQueue, { orgId })
	);

	const projectFilterSet = new Set(projectFilter);
	const projectOptions = useMemo(() => {
		if (!tasks) {
			return [];
		}

		const seen = new Set<string>();
		const options: { label: string; value: string }[] = [];
		for (const task of tasks) {
			if (!seen.has(task.projectId)) {
				seen.add(task.projectId);
				options.push({ label: task.projectName, value: task.projectId });
			}
		}
		return options.sort((a, b) => a.label.localeCompare(b.label));
	}, [tasks]);

	const filteredTasks = useMemo(() => {
		if (!tasks) {
			return [];
		}

		if (projectFilterSet.size === 0) {
			return tasks;
		}

		return tasks.filter((task) => projectFilterSet.has(task.projectId));
	}, [projectFilterSet, tasks]);

	const selectedTask = findSelectedTask(
		tasks as RankedTask[] | undefined,
		taskId
	);

	useEffect(() => {
		if (tasks && taskId && !selectedTask) {
			onSearchChange({ taskId: undefined });
		}
	}, [onSearchChange, taskId, selectedTask, tasks]);

	if (tasks === undefined) {
		return <TaskQueueSkeleton />;
	}

	const toggleProjectFilter = (value: string) => {
		const nextValues = toggleSearchListValue(projectFilter, value);
		onSearchChange({
			project: nextValues.length > 0 ? nextValues : undefined,
		});
	};

	return (
		<>
			{tasks.length === 0 ? (
				<EmptyState
					description="Tasks assigned to you across all projects will appear here."
					icon={ListTodo}
					title="No tasks assigned to you"
				/>
			) : (
				<>
					{projectOptions.length > 1 && (
						<div className="mb-4 flex flex-wrap items-center gap-2">
							<FilterDropdown
								label="Project"
								onToggle={toggleProjectFilter}
								options={projectOptions}
								selected={projectFilterSet}
							/>
							{projectFilterSet.size > 0 && (
								<Button
									onClick={() => onSearchChange({ project: undefined })}
									size="sm"
									variant="ghost"
								>
									<X className="mr-1 size-3" />
									Clear
								</Button>
							)}
						</div>
					)}

					{filteredTasks.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No tasks match the current filters.
						</div>
					) : (
						<div className="space-y-2">
							{filteredTasks.map((task) => (
								<TaskCard
									key={task._id}
									onClick={() => onSearchChange({ taskId: task._id })}
									task={task}
								/>
							))}
						</div>
					)}
				</>
			)}

			<Sheet
				onOpenChange={(open) => {
					if (!open) {
						onSearchChange({ taskId: undefined });
					}
				}}
				open={selectedTask !== null}
			>
				{selectedTask && (
					<TaskDetailSheet
						onClose={() => onSearchChange({ taskId: undefined })}
						orgSlug={orgSlug}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</>
	);
}
