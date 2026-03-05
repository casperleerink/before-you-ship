import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Filter, ListTodo, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import {
	BadgeField,
	FieldLabel,
	FilterDropdown,
	StatusDropdown,
	useSetToggle,
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
import {
	LEVEL_OPTIONS,
	levelVariant,
	STATUS_OPTIONS,
	statusLabel,
	statusVariant,
	type TaskLevel,
	type TaskStatus,
} from "@/lib/task-utils";

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/tasks"
)({
	component: TasksPage,
});

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
		? members.find((m) => m._id === assigneeId)
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
								onSelect={() => onAssigneeChange(member._id)}
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
							<DropdownMenuItem onSelect={onClearAssignee}>
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
	const { orgId, projectId } = Route.useParams();
	const navigate = useNavigate();
	const updateTask = useMutation(api.tasks.update);

	const handleStatusChange = (status: TaskStatus) => {
		updateTask({ taskId: task._id, status });
	};

	const handleAssigneeChange = (userId: Id<"users">) => {
		updateTask({ taskId: task._id, assigneeId: userId });
	};

	const handleClearAssignee = () => {
		updateTask({ taskId: task._id, assigneeId: null });
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
	const { orgId, projectId: projectIdParam } = Route.useParams();
	const projectId = projectIdParam as Id<"projects">;
	const tasks = useQuery(api.tasks.list, { projectId });
	const members = useQuery(api.organizations.listMembers, {
		orgId: orgId as Id<"organizations">,
	});
	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
		null
	);

	const [statusFilter, toggleStatus, clearStatus] = useSetToggle<TaskStatus>();
	const [riskFilter, toggleRisk, clearRisk] = useSetToggle<TaskLevel>();
	const [complexityFilter, toggleComplexity, clearComplexity] =
		useSetToggle<TaskLevel>();
	const [effortFilter, toggleEffort, clearEffort] = useSetToggle<TaskLevel>();

	const activeFilterCount =
		statusFilter.size +
		riskFilter.size +
		complexityFilter.size +
		effortFilter.size;

	const filteredTasks = useMemo(() => {
		if (!tasks) {
			return [];
		}
		return tasks.filter((task) => {
			if (statusFilter.size > 0 && !statusFilter.has(task.status)) {
				return false;
			}
			if (riskFilter.size > 0 && !riskFilter.has(task.risk)) {
				return false;
			}
			if (complexityFilter.size > 0 && !complexityFilter.has(task.complexity)) {
				return false;
			}
			if (effortFilter.size > 0 && !effortFilter.has(task.effort)) {
				return false;
			}
			return true;
		});
	}, [tasks, statusFilter, riskFilter, complexityFilter, effortFilter]);

	const clearAllFilters = () => {
		clearStatus();
		clearRisk();
		clearComplexity();
		clearEffort();
	};

	if (tasks === undefined) {
		return (
			<div className="p-6">
				<Loader />
			</div>
		);
	}

	const selectedTask = selectedTaskId
		? (tasks.find((t) => t._id === selectedTaskId) ?? null)
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
				<>
					<div className="mb-4 flex items-center gap-2">
						<Filter className="size-4 text-muted-foreground" />
						<FilterDropdown
							label="Status"
							onToggle={toggleStatus}
							options={STATUS_OPTIONS}
							selected={statusFilter}
						/>
						<FilterDropdown
							label="Risk"
							onToggle={toggleRisk}
							options={LEVEL_OPTIONS}
							selected={riskFilter}
						/>
						<FilterDropdown
							label="Complexity"
							onToggle={toggleComplexity}
							options={LEVEL_OPTIONS}
							selected={complexityFilter}
						/>
						<FilterDropdown
							label="Effort"
							onToggle={toggleEffort}
							options={LEVEL_OPTIONS}
							selected={effortFilter}
						/>
						{activeFilterCount > 0 && (
							<Button
								className="ml-1"
								onClick={clearAllFilters}
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
											onClick={() => setSelectedTaskId(task._id)}
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
												<Badge variant={levelVariant(task.risk)}>
													{task.risk}
												</Badge>
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
				</>
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
						members={members ?? []}
						onClose={() => setSelectedTaskId(null)}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</div>
	);
}
