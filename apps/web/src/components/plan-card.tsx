import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ExternalLink, ListChecks, Loader2, X } from "lucide-react";
import { useState } from "react";

import { AssigneeDropdown } from "@/components/assignee-dropdown";
import { PlanCardSkeleton } from "@/components/skeletons";
import {
	LevelBadge,
	UrgencyBadge,
	UrgencyDropdown,
} from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAppMutation } from "@/lib/convex-mutation";
import { buildProjectTasksSearch } from "@/lib/task-utils";

interface PlanCardProps {
	onRequestChanges?: () => void;
	orgSlug: string;
	planId: Id<"plans">;
	projectId: string;
}

export function PlanCard({
	planId,
	orgSlug,
	projectId,
	onRequestChanges,
}: PlanCardProps) {
	const { data: plan } = useQuery(convexQuery(api.plans.getById, { planId }));
	const { data: assignmentCandidates } = useQuery(
		convexQuery(api.projects.listAssignmentCandidates, {
			projectId: projectId as Id<"projects">,
		})
	);
	const { mutateAsync: approvePlan } = useAppMutation(api.plans.approve);
	const { mutateAsync: rejectPlan } = useAppMutation(api.plans.reject);
	const { mutateAsync: updateTaskAssignee } = useAppMutation(
		api.plans.updateTaskAssignee
	);
	const { mutateAsync: updateTaskUrgency } = useAppMutation(
		api.plans.updateTaskUrgency
	);
	const { mutateAsync: removeTaskBlocker } = useAppMutation(
		api.plans.removeTaskBlocker
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (plan === undefined) {
		return <PlanCardSkeleton />;
	}

	if (!plan) {
		return null;
	}

	const isApproved = plan.status === "approved";
	const isRejected = plan.status === "rejected";
	const isLocked = isApproved || isRejected;

	const handleApprove = async () => {
		setIsSubmitting(true);
		try {
			await approvePlan({ planId });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReject = async () => {
		setIsSubmitting(true);
		try {
			await rejectPlan({ planId });
			onRequestChanges?.();
		} finally {
			setIsSubmitting(false);
		}
	};

	const getBlockerLabel = (
		blockerRef: (typeof plan.tasks)[number]["blockedBy"][number]
	) => {
		if (blockerRef.kind === "plan_task") {
			return (
				plan.tasks.find(
					(candidate) => candidate.clientId === blockerRef.clientId
				)?.title ?? "Unknown planned task"
			);
		}

		return plan.existingTaskTitles[String(blockerRef.taskId)] ?? "Unknown task";
	};

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ListChecks className="h-4 w-4" />
					{isApproved ? "Approved Plan" : "Proposed Plan"}
					{isApproved && <Badge variant="default">Approved</Badge>}
					{isRejected && <Badge variant="destructive">Rejected</Badge>}
				</CardTitle>
				{isApproved && plan.createdTaskIds && (
					<p className="text-muted-foreground text-xs">
						{plan.createdTaskIds.length} task
						{plan.createdTaskIds.length !== 1 ? "s" : ""} created
					</p>
				)}
			</CardHeader>
			<CardContent className="divide-y">
				{plan.tasks.map((task, index) => (
					<div
						className="space-y-2 py-3 first:pt-0 last:pb-0"
						key={`${task.title}-${index}`}
					>
						<div className="flex items-center justify-between gap-2">
							<div className="font-medium text-sm">{task.title}</div>
							{isApproved && plan.createdTaskIds?.[index] && (
								<Link
									className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
									params={{ orgSlug, projectId }}
									search={buildProjectTasksSearch(plan.createdTaskIds[index])}
									to="/$orgSlug/projects/$projectId/tasks"
								>
									<ExternalLink className="h-3 w-3" />
									View task
								</Link>
							)}
						</div>
						{isLocked ? (
							<div className="text-xs">
								<UrgencyBadge urgency={task.urgency} />
							</div>
						) : (
							<UrgencyDropdown
								onUrgencyChange={(urgency) =>
									updateTaskUrgency({ planId, taskIndex: index, urgency })
								}
								urgency={task.urgency}
							/>
						)}
						{isLocked ? (
							<div className="text-xs">
								<Badge variant={task.assigneeId ? "outline" : "secondary"}>
									{task.assigneeId
										? (assignmentCandidates?.find(
												(candidate) => candidate._id === task.assigneeId
											)?.name ?? "Assigned")
										: "Unassigned"}
								</Badge>
							</div>
						) : (
							<AssigneeDropdown
								assigneeId={task.assigneeId}
								label="Planned Assignee"
								members={assignmentCandidates ?? []}
								onAssigneeChange={(assigneeId) =>
									updateTaskAssignee({
										assigneeId,
										planId,
										taskIndex: index,
									})
								}
								onClearAssignee={() =>
									updateTaskAssignee({
										assigneeId: null,
										planId,
										taskIndex: index,
									})
								}
							/>
						)}
						{task.blockedBy.length > 0 && (
							<div className="flex flex-col gap-2">
								<div className="text-muted-foreground text-xs uppercase tracking-wide">
									Blocked By
								</div>
								<div className="flex flex-wrap gap-1.5">
									{task.blockedBy.map((blockerRef) => (
										<Badge
											className="gap-1"
											key={
												blockerRef.kind === "plan_task"
													? `plan-${blockerRef.clientId}`
													: `task-${blockerRef.taskId}`
											}
											variant="outline"
										>
											<span>{getBlockerLabel(blockerRef)}</span>
											{!isLocked && (
												<button
													className="cursor-pointer rounded-sm text-muted-foreground transition-colors hover:text-foreground"
													onClick={() =>
														removeTaskBlocker({
															blockerRef,
															planId,
															taskIndex: index,
														})
													}
													type="button"
												>
													<X className="size-3" />
													<span className="sr-only">Remove blocker</span>
												</button>
											)}
										</Badge>
									))}
								</div>
							</div>
						)}
						<p className="line-clamp-2 text-muted-foreground text-xs">
							{task.brief}
						</p>
						<div className="flex flex-wrap gap-1.5">
							<LevelBadge level={task.risk} showLabel type="risk" />
							<LevelBadge level={task.complexity} showLabel type="complexity" />
							<LevelBadge level={task.effort} showLabel type="effort" />
						</div>
						{task.affectedAreas.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{task.affectedAreas.map((area) => (
									<Badge key={area} variant="outline">
										{area}
									</Badge>
								))}
							</div>
						)}
					</div>
				))}
			</CardContent>
			{!isLocked && (
				<CardFooter className="gap-2">
					<Button disabled={isSubmitting} onClick={handleApprove} size="sm">
						{isSubmitting ? (
							<Loader2 className="h-3 w-3 animate-spin" />
						) : (
							<Check className="h-3 w-3" />
						)}
						Approve Plan
					</Button>
					<Button
						disabled={isSubmitting}
						onClick={handleReject}
						size="sm"
						variant="outline"
					>
						<X className="h-3 w-3" />
						Request Changes
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
