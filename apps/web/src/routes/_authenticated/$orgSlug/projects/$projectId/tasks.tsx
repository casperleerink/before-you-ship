import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpDown, ListTodo, User, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";

import { AssigneeDropdown } from "@/components/assignee-dropdown";
import EmptyState from "@/components/empty-state";
import { TasksTableSkeleton } from "@/components/skeletons";
import { TaskDependencySection } from "@/components/task-dependency-section";
import {
	FieldLabel,
	FilterDropdown,
	LevelBadge,
	LevelBadgeField,
	StatusDropdown,
	UrgencyBadge,
	UrgencyDropdown,
} from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Sheet,
	SheetBody,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	countActiveTaskFilters,
	createTaskFilterState,
	filterTasks,
	findSelectedTask,
} from "@/features/tasks/task-filters";
import { useAppMutation } from "@/lib/convex-mutation";
import { toggleSearchListValue } from "@/lib/router-search";
import {
	LEVEL_OPTIONS,
	STATUS_OPTIONS,
	statusLabel,
	statusVariant,
	TASK_LEVEL_VALUES,
	TASK_STATUS_VALUES,
	type TaskLevel,
	type TaskStatus,
	type TaskUrgency,
} from "@/lib/task-utils";

const SORT_VALUES = ["recent", "priority"] as const;
type TaskSort = (typeof SORT_VALUES)[number];

const searchSchema = z.object({
	complexity: z.array(z.enum(TASK_LEVEL_VALUES)).catch([]).optional(),
	effort: z.array(z.enum(TASK_LEVEL_VALUES)).catch([]).optional(),
	q: z.string().catch("").optional(),
	risk: z.array(z.enum(TASK_LEVEL_VALUES)).catch([]).optional(),
	sort: z.enum(SORT_VALUES).catch("recent").optional(),
	status: z.array(z.enum(TASK_STATUS_VALUES)).catch([]).optional(),
	taskId: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/tasks"
)({
	component: TasksPage,
	validateSearch: searchSchema,
});

function TaskDetailSheet({
	task,
	members,
	onClose,
}: {
	task: Doc<"tasks">;
	members: { _id: Id<"users">; name: string }[];
	onClose: () => void;
}) {
	const { orgSlug, projectId } = Route.useParams();
	const navigate = useNavigate();
	const { mutate: updateTask } = useAppMutation(api.tasks.update);

	const handleStatusChange = (status: TaskStatus) => {
		updateTask({ taskId: task._id, status });
	};
	const handleUrgencyChange = (urgency: TaskUrgency) => {
		updateTask({ taskId: task._id, urgency });
	};

	const handleAssigneeChange = (userId: Id<"users">) => {
		updateTask({ assigneeId: userId, taskId: task._id });
	};

	const handleClearAssignee = () => {
		updateTask({ assigneeId: null, taskId: task._id });
	};

	return (
		<SheetContent>
			<SheetHeader>
				<SheetTitle>{task.title}</SheetTitle>
			</SheetHeader>
			<SheetBody>
				<div className="flex flex-col gap-6">
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

					<div className="grid grid-cols-3 gap-4">
						<LevelBadgeField level={task.complexity} type="complexity" />
						<LevelBadgeField level={task.effort} type="effort" />
						<AssigneeDropdown
							assigneeId={task.assigneeId}
							members={members}
							onAssigneeChange={handleAssigneeChange}
							onClearAssignee={handleClearAssignee}
						/>
					</div>

					<TaskDependencySection taskId={task._id} />

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
										projectId,
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

function TaskCard({
	task,
	members,
	onClick,
}: {
	task: Doc<"tasks">;
	members: { _id: Id<"users">; name: string }[];
	onClick: () => void;
}) {
	const assignee = task.assigneeId
		? members.find((m) => m._id === task.assigneeId)
		: null;

	return (
		<button
			className="flex w-full flex-col gap-3 rounded-xl border p-5 text-left transition-colors hover:bg-accent/30"
			onClick={onClick}
			type="button"
		>
			<div className="flex items-start justify-between gap-4">
				<h3 className="font-medium text-base">{task.title}</h3>
				<div className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm">
					<User className="size-3.5" />
					<span>{assignee ? assignee.name : "Unassigned"}</span>
				</div>
			</div>

			{task.brief && (
				<p className="line-clamp-2 text-muted-foreground text-sm">
					{task.brief}
				</p>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={statusVariant(task.status)}>
					{statusLabel(task.status)}
				</Badge>
				<UrgencyBadge urgency={task.urgency} />
				<LevelBadge level={task.risk} type="risk" />
				<LevelBadge level={task.complexity} type="complexity" />
				<LevelBadge level={task.effort} type="effort" />
			</div>
		</button>
	);
}

function TasksPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const projectId = projectIdParam as Id<"projects">;
	const sort: TaskSort = search.sort ?? "recent";

	const { data: recentTasks } = useQuery(
		convexQuery(api.tasks.list, sort === "recent" ? { projectId } : "skip")
	);
	const { data: prioritizedTasks } = useQuery(
		convexQuery(
			api.tasks.listPrioritized,
			sort === "priority" ? { projectId } : "skip"
		)
	);
	const tasks = sort === "priority" ? prioritizedTasks : recentTasks;

	const { data: members } = useQuery(
		convexQuery(api.projects.listAssignmentCandidates, { projectId })
	);

	const filters = createTaskFilterState(search);
	const { complexityFilter, effortFilter, riskFilter, statusFilter } = filters;
	const activeFilterCount = countActiveTaskFilters(filters);

	const filteredTasks = useMemo(() => {
		return filterTasks(tasks, search);
	}, [search, tasks]);

	const selectedTask = findSelectedTask(tasks, search.taskId);

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
		return <TasksTableSkeleton />;
	}

	const toggleFilter = (
		key: "complexity" | "effort" | "risk" | "status",
		value: TaskLevel | TaskStatus
	) => {
		const nextValues = toggleSearchListValue(search[key], value);

		navigate({
			search: (prev) => ({
				...prev,
				[key]: nextValues.length > 0 ? nextValues : undefined,
			}),
		});
	};

	const toggleSort = () => {
		navigate({
			search: (prev) => ({
				...prev,
				sort: sort === "recent" ? "priority" : "recent",
			}),
		});
	};

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
				<>
					<div className="mb-4 flex items-center gap-2">
						<Input
							className="h-8 w-64"
							onChange={(event) =>
								navigate({
									replace: true,
									search: (prev) => ({
										...prev,
										q: event.target.value.trim() || undefined,
									}),
								})
							}
							placeholder="Search tasks"
							value={search.q ?? ""}
						/>
						<Button
							onClick={toggleSort}
							size="sm"
							variant={sort === "priority" ? "secondary" : "outline"}
						>
							<ArrowUpDown className="mr-1 size-3.5" />
							{sort === "priority" ? "Priority" : "Recent"}
						</Button>
						<FilterDropdown
							label="Status"
							onToggle={(value) => toggleFilter("status", value)}
							options={STATUS_OPTIONS}
							selected={statusFilter}
						/>
						<FilterDropdown
							label="Risk"
							onToggle={(value) => toggleFilter("risk", value)}
							options={LEVEL_OPTIONS}
							selected={riskFilter}
						/>
						<FilterDropdown
							label="Complexity"
							onToggle={(value) => toggleFilter("complexity", value)}
							options={LEVEL_OPTIONS}
							selected={complexityFilter}
						/>
						<FilterDropdown
							label="Effort"
							onToggle={(value) => toggleFilter("effort", value)}
							options={LEVEL_OPTIONS}
							selected={effortFilter}
						/>
						{activeFilterCount > 0 && (
							<Button
								className="ml-1"
								onClick={() =>
									navigate({
										search: (prev) => ({
											...prev,
											complexity: undefined,
											effort: undefined,
											q: undefined,
											risk: undefined,
											status: undefined,
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

					{filteredTasks.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No tasks match the current filters.
						</div>
					) : (
						<div className="space-y-3">
							{filteredTasks.map((task) => (
								<TaskCard
									key={task._id}
									members={members ?? []}
									onClick={() =>
										navigate({
											search: (prev) => ({
												...prev,
												taskId: task._id,
											}),
										})
									}
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
						members={members ?? []}
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
