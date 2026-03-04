import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight, Filter, ListTodo, X } from "lucide-react";
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
	"/_authenticated/organizations/$orgId/my-tasks"
)({
	component: MyTasksPage,
});

type MyTask = Doc<"tasks"> & { projectName: string };

function TaskDetailSheet({
	task,
	onClose,
}: {
	task: MyTask;
	onClose: () => void;
}) {
	const { orgId } = Route.useParams();
	const navigate = useNavigate();
	const updateTask = useMutation(api.tasks.update);

	const handleStatusChange = (status: TaskStatus) => {
		updateTask({ taskId: task._id, status });
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
										projectId: task.projectId,
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

function MyTasksPage() {
	const { orgId: orgIdParam } = Route.useParams();
	const orgId = orgIdParam as Id<"organizations">;
	const tasks = useQuery(api.tasks.listByAssignee, { orgId });
	const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(
		null
	);

	const [statusFilter, toggleStatus, clearStatus] = useSetToggle<TaskStatus>();
	const [riskFilter, toggleRisk, clearRisk] = useSetToggle<TaskLevel>();
	const [complexityFilter, toggleComplexity, clearComplexity] =
		useSetToggle<TaskLevel>();
	const [effortFilter, toggleEffort, clearEffort] = useSetToggle<TaskLevel>();
	const [projectFilter, toggleProject, clearProject] = useSetToggle<string>();

	const activeFilterCount =
		statusFilter.size +
		riskFilter.size +
		complexityFilter.size +
		effortFilter.size +
		projectFilter.size;

	const projectOptions = useMemo(() => {
		if (!tasks) {
			return [];
		}
		const seen = new Set<string>();
		const options: { value: string; label: string }[] = [];
		for (const task of tasks) {
			const key = task.projectId;
			if (!seen.has(key)) {
				seen.add(key);
				options.push({ value: key, label: task.projectName });
			}
		}
		return options.sort((a, b) => a.label.localeCompare(b.label));
	}, [tasks]);

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
			if (projectFilter.size > 0 && !projectFilter.has(task.projectId)) {
				return false;
			}
			return true;
		});
	}, [
		tasks,
		statusFilter,
		riskFilter,
		complexityFilter,
		effortFilter,
		projectFilter,
	]);

	const clearAllFilters = () => {
		clearStatus();
		clearRisk();
		clearComplexity();
		clearEffort();
		clearProject();
	};

	if (tasks === undefined) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<Loader />
			</div>
		);
	}

	const selectedTask = selectedTaskId
		? (tasks.find((t) => t._id === selectedTaskId) ?? null)
		: null;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-8">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="font-bold text-2xl">My Tasks</h1>
			</div>

			{tasks.length === 0 ? (
				<EmptyState
					description="Tasks assigned to you across all projects will appear here."
					icon={ListTodo}
					title="No tasks assigned to you"
				/>
			) : (
				<>
					<div className="mb-4 flex flex-wrap items-center gap-2">
						<Filter className="size-4 text-muted-foreground" />
						{projectOptions.length > 1 && (
							<FilterDropdown
								label="Project"
								onToggle={toggleProject}
								options={projectOptions}
								selected={projectFilter}
							/>
						)}
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
										<TableHead className="w-[120px]">Project</TableHead>
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
												<span className="text-muted-foreground text-sm">
													{task.projectName}
												</span>
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
						onClose={() => setSelectedTaskId(null)}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</div>
	);
}
