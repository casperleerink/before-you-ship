import { api } from "@project-manager/backend/convex/_generated/api";
import type {
	Doc,
	Id,
} from "@project-manager/backend/convex/_generated/dataModel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight, Filter, ListTodo, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import EmptyState from "@/components/empty-state";
import Loader from "@/components/loader";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
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

export const Route = createFileRoute(
	"/_authenticated/organizations/$orgId/projects/$projectId/tasks"
)({
	component: TasksPage,
});

type TaskStatus = Doc<"tasks">["status"];
type TaskLevel = Doc<"tasks">["risk"];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
	{ value: "ready", label: "Ready" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "done", label: "Done" },
];

const LEVEL_OPTIONS: { value: TaskLevel; label: string }[] = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

function statusVariant(status: TaskStatus) {
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

function statusLabel(status: TaskStatus) {
	return STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status;
}

function levelVariant(level: TaskLevel) {
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

function FilterDropdown<T extends string>({
	label,
	options,
	selected,
	onToggle,
}: {
	label: string;
	options: { value: T; label: string }[];
	selected: Set<T>;
	onToggle: (value: T) => void;
}) {
	const hasSelection = selected.size > 0;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button size="sm" variant={hasSelection ? "default" : "outline"}>
						{label}
						{hasSelection && (
							<span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 font-mono text-xs">
								{selected.size}
							</span>
						)}
					</Button>
				}
			/>
			<DropdownMenuContent>
				<DropdownMenuLabel>{label}</DropdownMenuLabel>
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						checked={selected.has(option.value)}
						key={option.value}
						onSelect={(e) => {
							e.preventDefault();
							onToggle(option.value);
						}}
					>
						{option.label}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function useSetToggle<T>() {
	const [set, setSet] = useState<Set<T>>(new Set());
	const toggle = (value: T) => {
		setSet((prev) => {
			const next = new Set(prev);
			if (next.has(value)) {
				next.delete(value);
			} else {
				next.add(value);
			}
			return next;
		});
	};
	const clear = () => setSet(new Set());
	return [set, toggle, clear] as const;
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
						onClose={() => setSelectedTaskId(null)}
						task={selectedTask}
					/>
				)}
			</Sheet>
		</div>
	);
}
