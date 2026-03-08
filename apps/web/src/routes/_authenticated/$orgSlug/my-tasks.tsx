import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ListTodo, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";

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
import { useAppMutation } from "@/lib/convex-mutation";
import { useOrg } from "@/lib/org-context";
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

const searchSchema = z.object({
	project: z.array(z.string()).catch([]).optional(),
	taskId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/$orgSlug/my-tasks")({
	component: MyTasksPage,
	validateSearch: searchSchema,
});

function TaskDetailSheet({
	task,
	onClose,
}: {
	task: RankedTask;
	onClose: () => void;
}) {
	const { orgSlug } = Route.useParams();
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

function MyTasksPage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const org = useOrg();
	const { data: tasks } = useQuery(
		convexQuery(api.tasks.listMyRankedQueue, { orgId: org._id })
	);

	const projectFilter = new Set(search.project ?? []);
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

		if (projectFilter.size === 0) {
			return tasks;
		}

		return tasks.filter((task) => projectFilter.has(task.projectId));
	}, [projectFilter, tasks]);

	const selectedTask = search.taskId
		? ((tasks?.find((task) => task._id === search.taskId) as
				| RankedTask
				| undefined) ?? null)
		: null;

	useEffect(() => {
		if (tasks && search.taskId && !selectedTask) {
			navigate({
				replace: true,
				search: (prev) => ({
					...prev,
					taskId: undefined,
				}),
			});
		}
	}, [navigate, search.taskId, selectedTask, tasks]);

	if (tasks === undefined) {
		return (
			<div className="container mx-auto max-w-5xl px-4 py-8">
				<Loader />
			</div>
		);
	}

	const toggleProjectFilter = (value: string) => {
		const nextValues = toggleSearchListValue(search.project, value);

		navigate({
			search: (prev) => ({
				...prev,
				project: nextValues.length > 0 ? nextValues : undefined,
			}),
		});
	};

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<div className="mb-6 space-y-1">
				<h1 className="font-bold text-2xl">My Tasks</h1>
				<p className="text-muted-foreground text-sm">
					Ranked by actionability, urgency, and risk across your assigned work.
				</p>
			</div>

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
								selected={projectFilter}
							/>
							{projectFilter.size > 0 && (
								<Button
									onClick={() =>
										navigate({
											search: (prev) => ({
												...prev,
												project: undefined,
											}),
										})
									}
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
									onClick={() =>
										navigate({
											search: (prev) => ({
												...prev,
												taskId: task._id,
											}),
										})
									}
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
						navigate({
							search: (prev) => ({
								...prev,
								taskId: undefined,
							}),
						});
					}
				}}
				open={selectedTask !== null}
			>
				{selectedTask && (
					<TaskDetailSheet
						onClose={() =>
							navigate({
								search: (prev) => ({
									...prev,
									taskId: undefined,
								}),
							})
						}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</div>
	);
}
