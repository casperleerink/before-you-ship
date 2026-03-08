import { convexQuery } from "@convex-dev/react-query";
import { api } from "@project-manager/backend/convex/_generated/api";
import type { Id } from "@project-manager/backend/convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { FieldLabel } from "@/components/task-fields";
import { Badge } from "@/components/ui/badge";
import { useAppMutation } from "@/lib/convex-mutation";
import { statusLabel, statusVariant } from "@/lib/task-utils";

export function TaskDependencySection({ taskId }: { taskId: Id<"tasks"> }) {
	const { data: dependencies } = useQuery(
		convexQuery(api.taskDependencies.listForTask, { taskId })
	);
	const { mutate: dismissDependency } = useAppMutation(
		api.taskDependencies.dismiss
	);

	if (dependencies === undefined || dependencies.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			<FieldLabel>Blocked By</FieldLabel>
			<div className="space-y-2">
				{dependencies.map((dependency) => (
					<div
						className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
						key={dependency._id}
					>
						<div className="min-w-0 space-y-1">
							<div className="font-medium text-sm">
								{dependency.blockerTask.title}
							</div>
							<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
								<Badge variant={statusVariant(dependency.blockerTask.status)}>
									{statusLabel(dependency.blockerTask.status)}
								</Badge>
								{dependency.blockerTask.assigneeName && (
									<span>{dependency.blockerTask.assigneeName}</span>
								)}
							</div>
						</div>
						<button
							className="cursor-pointer rounded-sm text-muted-foreground transition-colors hover:text-foreground"
							onClick={() =>
								dismissDependency({ dependencyId: dependency._id })
							}
							type="button"
						>
							<X className="size-4" />
							<span className="sr-only">Dismiss dependency</span>
						</button>
					</div>
				))}
			</div>
		</div>
	);
}
