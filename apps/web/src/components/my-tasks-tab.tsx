import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, ListTodo, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { TaskDependencySection } from "@/components/task-dependency-section";
import {
	FieldLabel,
	FilterDropdown,
	LevelBadgeField,
	StatusDropdown,
	UrgencyBadge,
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
import {
	statusLabel,
	statusVariant,
	type TaskStatus,
	type TaskUrgency,
} from "@/lib/task-utils";

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
						<Badge variant="outline">{task.projectName}</Badge>
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
		return <Loader />;
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
						<div className="space-y-3">
							{filteredTasks.map((task) => (
								<button
									className="flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-accent/30"
									key={task._id}
									onClick={() => onSearchChange({ taskId: task._id })}
									type="button"
								>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted font-semibold text-sm">
										{task.rank}
									</div>
									<div className="min-w-0 flex-1 space-y-3">
										<div className="flex flex-wrap items-center gap-2">
											<div className="font-medium text-base">{task.title}</div>
											<Badge variant="outline">{task.projectName}</Badge>
											<Badge variant={statusVariant(task.status)}>
												{statusLabel(task.status)}
											</Badge>
											<UrgencyBadge urgency={task.urgency} />
											{task.isBlocked && (
												<Badge variant="destructive">Blocked</Badge>
											)}
										</div>
										<p className="line-clamp-2 text-muted-foreground text-sm">
											{task.brief}
										</p>
										<div className="flex flex-wrap gap-1.5">
											{task.rankReasons.map((reason) => (
												<Badge key={reason} variant="secondary">
													{reason}
												</Badge>
											))}
										</div>
									</div>
								</button>
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
