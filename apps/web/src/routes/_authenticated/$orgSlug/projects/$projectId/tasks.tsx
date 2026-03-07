import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Filter, ListTodo, User, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";
import { z } from "zod";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import {
	FieldLabel,
	FilterDropdown,
	LevelBadge,
	LevelBadgeField,
	StatusDropdown,
} from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useOrg } from "@/lib/org-context";
import {
	createEnumListSearchParamSchema,
	serializeSearchParamList,
	toggleSearchListValue,
} from "@/lib/router-search";
import {
	LEVEL_OPTIONS,
	STATUS_OPTIONS,
	statusLabel,
	statusVariant,
	type TaskLevel,
	type TaskStatus,
} from "@/lib/task-utils";

const searchSchema = z.object({
	complexity: createEnumListSearchParamSchema(["low", "medium", "high"]),
	effort: createEnumListSearchParamSchema(["low", "medium", "high"]),
	q: z.string().optional(),
	risk: createEnumListSearchParamSchema(["low", "medium", "high"]),
	status: createEnumListSearchParamSchema(["ready", "in_progress", "done"]),
	taskId: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/$orgSlug/projects/$projectId/tasks"
)({
	component: TasksPage,
	validateSearch: searchSchema,
});

function matchesTaskFilters(
	task: Doc<"tasks">,
	filters: {
		statusFilter: Set<TaskStatus>;
		riskFilter: Set<TaskLevel>;
		complexityFilter: Set<TaskLevel>;
		effortFilter: Set<TaskLevel>;
		searchQuery: string;
	}
) {
	if (filters.statusFilter.size > 0 && !filters.statusFilter.has(task.status)) {
		return false;
	}
	if (filters.riskFilter.size > 0 && !filters.riskFilter.has(task.risk)) {
		return false;
	}
	if (
		filters.complexityFilter.size > 0 &&
		!filters.complexityFilter.has(task.complexity)
	) {
		return false;
	}
	if (filters.effortFilter.size > 0 && !filters.effortFilter.has(task.effort)) {
		return false;
	}
	if (!filters.searchQuery) {
		return true;
	}

	const searchableText = [task.title, task.brief, ...task.affectedAreas]
		.join(" ")
		.toLowerCase();
	return searchableText.includes(filters.searchQuery);
}

function AssigneeDropdown({
	assigneeId,
	members,
	onAssigneeChange,
	onClearAssignee,
}: {
	assigneeId?: Id<"users">;
	members: { _id: Id<"users">; name: string }[];
	onAssigneeChange: (userId: Id<"users">) => void;
	onClearAssignee: () => void;
}) {
	const assignee = assigneeId
		? members.find((member) => member._id === assigneeId)
		: null;

	return (
		<div className="flex flex-col gap-1">
			<FieldLabel>Assignee</FieldLabel>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<button className="w-fit cursor-pointer" type="button">
							{assignee ? (
								<Badge variant="outline">{assignee.name}</Badge>
							) : (
								<Badge variant="secondary">
									<User className="mr-1 size-3" />
									Unassigned
								</Badge>
							)}
						</button>
					}
				/>
				<DropdownMenuContent>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Assignee</DropdownMenuLabel>
						{members.map((member) => (
							<DropdownMenuItem
								key={member._id}
								onClick={() => onAssigneeChange(member._id)}
							>
								<span className="truncate">{member.name}</span>
								{member._id === assigneeId && (
									<span className="ml-auto text-muted-foreground text-xs">
										Current
									</span>
								)}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
					{assigneeId && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onClearAssignee}>
								<X className="mr-1 size-3" />
								Unassign
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

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
	const updateTask = useMutation(api.tasks.update);

	const handleStatusChange = (status: TaskStatus) => {
		updateTask({ taskId: task._id, status });
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
						<LevelBadgeField level={task.risk} type="risk" />
						<LevelBadgeField level={task.complexity} type="complexity" />
					</div>

					<div className="grid grid-cols-3 gap-4">
						<LevelBadgeField level={task.effort} type="effort" />
						<AssigneeDropdown
							assigneeId={task.assigneeId}
							members={members}
							onAssigneeChange={handleAssigneeChange}
							onClearAssignee={handleClearAssignee}
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

function TasksPage() {
	const { projectId: projectIdParam } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const org = useOrg();
	const projectId = projectIdParam as Id<"projects">;
	const tasks = useQuery(api.tasks.list, { projectId });
	const members = useQuery(api.organizations.listMembers, {
		orgId: org._id,
	});

	const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
	const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
	const complexityFilter = new Set<TaskLevel>(search.complexity as TaskLevel[]);
	const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);
	const searchQuery = search.q?.trim().toLowerCase() ?? "";

	const activeFilterCount =
		statusFilter.size +
		riskFilter.size +
		complexityFilter.size +
		effortFilter.size +
		(searchQuery ? 1 : 0);

	const filteredTasks = useMemo(() => {
		if (!tasks) {
			return [];
		}

		const statusFilter = new Set<TaskStatus>(search.status as TaskStatus[]);
		const riskFilter = new Set<TaskLevel>(search.risk as TaskLevel[]);
		const complexityFilter = new Set<TaskLevel>(
			search.complexity as TaskLevel[]
		);
		const effortFilter = new Set<TaskLevel>(search.effort as TaskLevel[]);

		return tasks.filter((task) =>
			matchesTaskFilters(task, {
				statusFilter,
				riskFilter,
				complexityFilter,
				effortFilter,
				searchQuery,
			})
		);
	}, [
		search.complexity,
		search.effort,
		search.risk,
		search.status,
		searchQuery,
		tasks,
	]);

	const selectedTask = search.taskId
		? (tasks?.find((task) => task._id === search.taskId) ?? null)
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
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const toggleFilter = (
		key: "complexity" | "effort" | "risk" | "status",
		value: string
	) => {
		navigate({
			search: (prev) => ({
				...prev,
				[key]: serializeSearchParamList(
					toggleSearchListValue(prev[key], value)
				),
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
						<Filter className="size-4 text-muted-foreground" />
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
									{filteredTasks.map((task) => (
										<TableRow
											className="cursor-pointer"
											key={task._id}
											onClick={() =>
												navigate({
													search: (prev) => ({
														...prev,
														taskId: task._id,
													}),
												})
											}
										>
											<TableCell className="font-medium">
												{task.title}
											</TableCell>
											<TableCell>
												<Badge variant={statusVariant(task.status)}>
													{statusLabel(task.status)}
												</Badge>
											</TableCell>
											<TableCell>
												<LevelBadge level={task.risk} type="risk" />
											</TableCell>
											<TableCell>
												<LevelBadge level={task.complexity} type="complexity" />
											</TableCell>
											<TableCell>
												<LevelBadge level={task.effort} type="effort" />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
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
