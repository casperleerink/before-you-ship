import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Check, FileText, Loader2, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { levelVariant } from "@/lib/task-utils";

export function PlanCard({ planId }: { planId: Id<"plans"> }) {
	const plan = useQuery(api.plans.getById, { planId });
	const approvePlan = useMutation(api.plans.approve);
	const rejectPlan = useMutation(api.plans.reject);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (plan === undefined) {
		return (
			<Card size="sm">
				<CardContent>
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading plan...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!plan) {
		return null;
	}

	const isLocked = plan.status !== "proposed";

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
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileText className="h-4 w-4" />
					Proposed Plan
					{plan.status === "approved" && (
						<Badge variant="default">Approved</Badge>
					)}
					{plan.status === "rejected" && (
						<Badge variant="destructive">Rejected</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{plan.tasks.map((task, index) => (
					<div
						className="space-y-2 rounded-md border p-3"
						key={`${task.title}-${index}`}
					>
						<div className="font-medium text-sm">{task.title}</div>
						<p className="line-clamp-2 text-muted-foreground text-xs">
							{task.brief}
						</p>
						<div className="flex flex-wrap gap-1.5">
							<Badge variant={levelVariant(task.risk)}>Risk: {task.risk}</Badge>
							<Badge variant={levelVariant(task.complexity)}>
								Complexity: {task.complexity}
							</Badge>
							<Badge variant={levelVariant(task.effort)}>
								Effort: {task.effort}
							</Badge>
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
